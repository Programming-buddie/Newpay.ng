import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'admin-credentials.json');

// Ephemeral in-memory HMAC secret fallback when ADMIN_SESSION_SECRET is not set
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

interface StoredAdminCredentials {
  username: string;
  salt: string;
  passwordHash: string;
  claimedAt: string;
}

interface AdminTokenPayload {
  sub: string;
  exp: number;
  jti: string;
}

const revokedTokens = new Set<string>();
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 20) {
    return false;
  }
  entry.count += 1;
  return true;
}

function getEnvAdminCredentials(): { username: string; password: string } | null {
  const username = process.env.ADMIN_USERNAME?.trim() ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (username.length > 0 && password.length > 0) {
    return { username, password };
  }
  return null;
}

function readClaimedCredentials(): StoredAdminCredentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) return null;
    const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredAdminCredentials>;
    if (
      typeof parsed.username === 'string' &&
      typeof parsed.salt === 'string' &&
      typeof parsed.passwordHash === 'string'
    ) {
      return {
        username: parsed.username,
        salt: parsed.salt,
        passwordHash: parsed.passwordHash,
        claimedAt: String(parsed.claimedAt ?? ''),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Compare equal-length dummy buffers to avoid timing leak on length mismatch
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function hashPassword(password: string, saltHex: string): string {
  return crypto.scryptSync(password, saltHex, 64).toString('hex');
}

function signAdminToken(username: string): { token: string; expiresAt: string } {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload: AdminTokenPayload = {
    sub: username,
    exp,
    jti: crypto.randomBytes(16).toString('hex'),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

function verifyAdminToken(token: string): AdminTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  if (!timingSafeStringEqual(providedSig, expectedSig)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as AdminTokenPayload;
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.jti !== 'string'
    ) {
      return null;
    }
    if (parsed.exp <= Date.now() || revokedTokens.has(parsed.jti)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ message: 'Missing admin session token.' });
    return;
  }
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ message: 'Admin session expired or invalid.' });
    return;
  }
  (req as Request & { adminPayload?: AdminTokenPayload }).adminPayload = payload;
  next();
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/admin/status', (_req: Request, res: Response) => {
    if (getEnvAdminCredentials()) {
      res.json({ configured: true, mode: 'env' });
      return;
    }
    if (readClaimedCredentials()) {
      res.json({ configured: true, mode: 'claimed' });
      return;
    }
    res.json({ configured: false, mode: 'setup-required' });
  });

  app.post('/api/admin/claim', (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ message: 'Too many attempts. Please wait a few minutes.' });
      return;
    }

    if (getEnvAdminCredentials() || readClaimedCredentials()) {
      res.status(409).json({ message: 'Admin credentials have already been configured.' });
      return;
    }

    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';

    if (rawUsername.length < 2 || rawUsername.length > 50) {
      res.status(400).json({ message: 'Username must be between 2 and 50 characters.' });
      return;
    }
    if (rawPassword.length < 4 || rawPassword.length > 100) {
      res.status(400).json({ message: 'Password must be between 4 and 100 characters.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(rawPassword, salt);
    const record: StoredAdminCredentials = {
      username: rawUsername,
      salt,
      passwordHash,
      claimedAt: new Date().toISOString(),
    };

    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(record, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === 'EEXIST') {
        res.status(409).json({ message: 'Admin credentials have already been configured.' });
        return;
      }
      res.status(500).json({ message: 'Unable to save admin credentials.' });
      return;
    }

    const session = signAdminToken(rawUsername);
    res.status(201).json({
      token: session.token,
      username: rawUsername,
      expiresAt: session.expiresAt,
    });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ message: 'Too many login attempts. Please wait a few minutes.' });
      return;
    }

    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!rawUsername || !rawPassword) {
      res.status(400).json({ message: 'Username and password are required.' });
      return;
    }

    const envCreds = getEnvAdminCredentials();
    if (envCreds) {
      const userOk = timingSafeStringEqual(rawUsername, envCreds.username);
      const passOk = timingSafeStringEqual(rawPassword, envCreds.password);
      if (!userOk || !passOk) {
        res.status(401).json({ message: 'Invalid admin username or password.' });
        return;
      }
      const session = signAdminToken(envCreds.username);
      res.json({
        token: session.token,
        username: envCreds.username,
        expiresAt: session.expiresAt,
      });
      return;
    }

    const stored = readClaimedCredentials();
    if (!stored) {
      res.status(409).json({ message: 'Admin credentials have not been set up yet.' });
      return;
    }

    const candidateHash = hashPassword(rawPassword, stored.salt);
    const userOk = timingSafeStringEqual(rawUsername, stored.username);
    const hashOk = timingSafeStringEqual(candidateHash, stored.passwordHash);

    if (!userOk || !hashOk) {
      res.status(401).json({ message: 'Invalid admin username or password.' });
      return;
    }

    const session = signAdminToken(stored.username);
    res.json({
      token: session.token,
      username: stored.username,
      expiresAt: session.expiresAt,
    });
  });

  app.get('/api/admin/session', requireAdminAuth, (req: Request, res: Response) => {
    const payload = (req as Request & { adminPayload?: AdminTokenPayload }).adminPayload!;
    res.json({ authenticated: true, username: payload.sub });
  });

  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (token) {
      const payload = verifyAdminToken(token);
      if (payload) {
        revokedTokens.add(payload.jti);
      }
    }
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NewPay server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
