import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { api } from '@/api/client';
import type { User } from '@/api/types';
import { SignInError, endSession, onSessionChange, restoreSession, signInWithPassword } from '@/auth/session';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthValue = {
  status: Status;
  user: User | undefined;
  isOwner: boolean;
  /** Checks the username and password with the backend and starts a session. */
  signIn: (username: string, password: string) => Promise<void>;
  signingIn: boolean;
  signInError: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    restoreSession().then((ok) => setStatus(ok ? 'signedIn' : 'signedOut'));
    return onSessionChange((signedIn) => {
      setStatus(signedIn ? 'signedIn' : 'signedOut');
      if (!signedIn) qc.clear();
    });
  }, [qc]);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('GET', '/api/v1/me'),
    enabled: status === 'signedIn',
    staleTime: 5 * 60_000,
  });

  async function signIn(username: string, password: string) {
    setSignInError(null);
    setSigningIn(true);
    try {
      await signInWithPassword(username, password);
    } catch (e) {
      setSignInError(e instanceof SignInError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSigningIn(false);
    }
  }

  const value: AuthValue = {
    status,
    user: me.data,
    isOwner: me.data?.roles.includes('OWNER') ?? false,
    signIn,
    signingIn,
    signInError,
    signOut: endSession,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
