export type PasswordStrengthLevel = 'weak' | 'fair' | 'strong';

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  label: string;
  score: number; // 0-3
  meetsPolicy: boolean;
  issues: string[];
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function validateName(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  if (trimmed.length > 50) return `${label} must be 50 characters or fewer.`;
  return null;
}

export function getPasswordStrength(password: string): PasswordStrength {
  const issues: string[] = [];
  if (password.length < 8) {
    issues.push('At least 8 characters');
  }
  if (!/[A-Za-z]/.test(password)) {
    issues.push('Include at least one letter');
  }
  if (!/\d/.test(password)) {
    issues.push('Include at least one number');
  }

  const meetsPolicy = issues.length === 0;

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (password.length >= 12 || (/[^A-Za-z0-9]/.test(password) && /[A-Z]/.test(password))) {
    score += 1;
  }

  if (!password) {
    return { level: 'weak', label: 'Enter a password', score: 0, meetsPolicy: false, issues };
  }
  if (!meetsPolicy || score <= 1) {
    return { level: 'weak', label: 'Weak', score: 1, meetsPolicy, issues };
  }
  if (score === 2) {
    return { level: 'fair', label: 'Fair', score: 2, meetsPolicy, issues };
  }
  return { level: 'strong', label: 'Strong', score: 3, meetsPolicy, issues };
}

export function validateAccountNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Account number is required.';
  if (!/^\d{10}$/.test(trimmed)) {
    return 'Account number must be exactly 10 digits.';
  }
  return null;
}

export function validateNarration(value: string): string | null {
  if (value.length > 100) {
    return 'Narration must be 100 characters or fewer.';
  }
  return null;
}
