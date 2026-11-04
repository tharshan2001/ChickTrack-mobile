import { useQuery, useQueryClient } from '@tanstack/react-query';
import { exchangeCodeAsync, ResponseType, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { api } from '@/api/client';
import type { User } from '@/api/types';
import { CLIENT_ID, SCOPES, discovery, redirectUri } from '@/auth/config';
import { endSession, onSessionChange, restoreSession, startSession } from '@/auth/session';

// Closes the browser popup when the redirect lands back on web.
WebBrowser.maybeCompleteAuthSession();

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthValue = {
  status: Status;
  user: User | undefined;
  isOwner: boolean;
  /** Opens the backend sign-in page. Resolves when the browser closes. */
  signIn: () => Promise<void>;
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

  // Authorization Code + PKCE (S256). The code verifier stays on the device.
  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri,
      scopes: SCOPES,
      responseType: ResponseType.Code,
      usePKCE: true,
    },
    discovery,
  );

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

  async function signIn() {
    if (!request) return;
    setSignInError(null);
    setSigningIn(true);
    try {
      const result = await promptAsync();
      if (result.type === 'success') {
        const tokens = await exchangeCodeAsync(
          {
            clientId: CLIENT_ID,
            code: result.params.code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier ?? '' },
          },
          discovery,
        );
        await startSession(tokens);
      } else if (result.type === 'error') {
        setSignInError(result.error?.description ?? result.error?.message ?? 'Sign-in failed');
      }
    } catch {
      setSignInError('Cannot reach the server. Check the API address and your Wi-Fi.');
    } finally {
      setSigningIn(false);
    }
  }

  const value: AuthValue = {
    status,
    user: me.data,
    isOwner: me.data?.roles.includes('OWNER') ?? false,
    signIn,
    signingIn: signingIn || !request,
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
