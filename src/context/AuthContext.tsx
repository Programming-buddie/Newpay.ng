import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { ENV } from '../config/env';
import { auth, googleProvider } from '../firebase';
import { walletApi } from '../services';
import {
  ensureUserProfileAndWallet,
  subscribeToUserProfile,
  updateUserProfile as updateFirestoreUserProfile,
} from '../services/firebase/firebaseWalletService';
import { setHttpUnauthorizedHandler } from '../services/http/httpApi';
import {
  ApiError,
  LoginInput,
  PasswordResetResponse,
  RegisterInput,
  User,
  UserPreferences,
} from '../types';

interface AuthContextValue {
  user: User | null;
  profilePreferences: UserPreferences;
  isAuthenticated: boolean;
  isInitializing: boolean;
  signInWithGoogle: () => Promise<{ user: User; isNewUser: boolean }>;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  updateProfile: (input: { firstName: string; lastName: string; phone: string }) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<PasswordResetResponse>;
  clearLocalAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(err: unknown): ApiError {
  const code = (err as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return new ApiError({
        code: 'AUTH_POPUP_CLOSED',
        message: 'Sign-in was cancelled before completing. Please try again.',
        status: 400,
      });
    case 'auth/popup-blocked':
      return new ApiError({
        code: 'AUTH_POPUP_BLOCKED',
        message: 'Your browser blocked the Google sign-in popup. Allow popups and try again.',
        status: 400,
      });
    case 'auth/cancelled-popup-request':
      return new ApiError({
        code: 'AUTH_CANCELLED',
        message: 'Sign-in request was interrupted. Please try again.',
        status: 400,
      });
    case 'auth/network-request-failed':
      return new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Network error while connecting to authentication service.',
        status: 503,
      });
    case 'auth/unauthorized-domain':
      return new ApiError({
        code: 'UNAUTHORIZED_DOMAIN',
        message: 'This domain is not authorized for Google Sign-In in Firebase.',
        status: 403,
      });
    default:
      return new ApiError({
        code: 'AUTH_ERROR',
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Unable to complete Google sign-in right now.',
        status: 400,
      });
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profilePreferences, setProfilePreferences] = useState<UserPreferences>({
    hideBalanceByDefault: false,
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  const clearLocalAuth = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    setHttpUnauthorizedHandler(() => {
      setUser(null);
    });
  }, []);

  useEffect(() => {
    if (ENV.USE_MOCK_API) {
      let active = true;
      (async () => {
        try {
          const currentUser = await walletApi.getCurrentUser();
          if (active) setUser(currentUser);
        } catch {
          if (active) setUser(null);
        } finally {
          if (active) setIsInitializing(false);
        }
      })();
      return () => {
        active = false;
      };
    }

    let unsubscribeProfile: (() => void) | null = null;
    let active = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!firebaseUser) {
        if (active) {
          setUser(null);
          setProfilePreferences({ hideBalanceByDefault: false });
          setIsInitializing(false);
        }
        return;
      }

      try {
        const { profile } = await ensureUserProfileAndWallet(firebaseUser);
        if (!active) return;

        setUser(profile.user);
        setProfilePreferences(profile.preferences);
        setIsInitializing(false);

        unsubscribeProfile = subscribeToUserProfile(
          firebaseUser.uid,
          (snapshot) => {
            if (!active) return;
            setUser(snapshot.user);
            setProfilePreferences(snapshot.preferences);
          },
          (err) => {
            if (active) setFatalError(err);
          }
        );
      } catch (err) {
        if (!active) return;
        setIsInitializing(false);
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    });

    return () => {
      active = false;
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ user: User; isNewUser: boolean }> => {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const { profile, isNewUser } = await ensureUserProfileAndWallet(credential.user);
      setUser(profile.user);
      setProfilePreferences(profile.preferences);
      return { user: profile.user, isNewUser };
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      if (err instanceof Error && err.message.startsWith('{') && err.message.includes('operationType')) {
        setFatalError(err);
        throw err;
      }
      throw mapFirebaseAuthError(err);
    }
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<User> => {
    const session = await walletApi.login(input);
    setUser(session.user);
    return session.user;
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<User> => {
    const session = await walletApi.register(input);
    setUser(session.user);
    return session.user;
  }, []);

  const updateProfile = useCallback(
    async (input: { firstName: string; lastName: string; phone: string }) => {
      if (!user) {
        throw new ApiError({
          code: 'UNAUTHORIZED',
          message: 'Please sign in to update your profile.',
          status: 401,
        });
      }
      if (!ENV.USE_MOCK_API) {
        await updateFirestoreUserProfile(user.id, input);
      }
    },
    [user]
  );

  const logout = useCallback(async () => {
    try {
      if (ENV.USE_MOCK_API) {
        await walletApi.logout();
      } else {
        await signOut(auth);
      }
    } finally {
      setUser(null);
      setProfilePreferences({ hideBalanceByDefault: false });
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    return walletApi.requestPasswordReset(email);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profilePreferences,
        isAuthenticated: Boolean(user),
        isInitializing,
        signInWithGoogle,
        login,
        register,
        updateProfile,
        logout,
        requestPasswordReset,
        clearLocalAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
