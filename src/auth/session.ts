import { refreshAsync, revokeAsync, TokenError, TokenTypeHint, type TokenResponse } from 'expo-auth-session';

import { CLIENT_ID, PASSWORD_GRANT, discovery } from '@/auth/config';
import { clearTokens, loadTokens, saveTokens, type Tokens } from '@/auth/token-store';

/**
 * Holds the current tokens in memory, persists them, and refreshes the
 * access token (15 min) using the rotating refresh token (30 days).
 */
let current: Tokens | null = null;
let refreshing: Promise<Tokens | null> | null = null;
const listeners = new Set<(signedIn: boolean) => void>();

const EXPIRY_MARGIN_MS = 60_000;

function notify() {
  for (const l of listeners) l(current !== null);
}

export function onSessionChange(listener: (signedIn: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function fromResponse(res: TokenResponse, previousRefresh: string | null): Tokens {
  const lifetimeSec = res.expiresIn ?? 900;
  return {
    accessToken: res.accessToken,
    // The server rotates refresh tokens; keep the old one only if none came back.
    refreshToken: res.refreshToken ?? previousRefresh,
    expiresAt: res.issuedAt * 1000 + lifetimeSec * 1000,
  };
}

export async function restoreSession(): Promise<boolean> {
  current = await loadTokens();
  return current !== null;
}

/** Why signing in failed, in words for the sign-in screen. */
export class SignInError extends Error {}

/** Exchanges the typed username and password for tokens and starts the session. */
export async function signInWithPassword(username: string, password: string) {
  let res: Response;
  try {
    res = await fetch(discovery.tokenEndpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: PASSWORD_GRANT, client_id: CLIENT_ID, username, password }).toString(),
    });
  } catch {
    throw new SignInError('Cannot reach the server. Check the API address and that the phone is on the same Wi-Fi.');
  }
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new SignInError(
      body.error === 'invalid_grant'
        ? 'Wrong username or password.'
        : body.error === 'unauthorized_client'
          ? 'This server does not allow sign-in from the app yet. Restart the backend to update it.'
          : `Sign-in failed (${body.error ?? res.status}).`,
    );
  }
  current = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresAt: Date.now() + (body.expires_in ?? 900) * 1000,
  };
  await saveTokens(current);
  notify();
}

export async function endSession() {
  const token = current?.refreshToken;
  current = null;
  refreshing = null;
  await clearTokens();
  notify();
  if (token) {
    revokeAsync({ token, clientId: CLIENT_ID, tokenTypeHint: TokenTypeHint.RefreshToken }, discovery).catch(() => {});
  }
}

async function refresh(): Promise<Tokens | null> {
  const refreshToken = current?.refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await refreshAsync({ clientId: CLIENT_ID, refreshToken }, discovery);
    current = fromResponse(res, refreshToken);
    await saveTokens(current);
    return current;
  } catch (e) {
    // The server rejected the refresh token (expired, revoked, already rotated):
    // the user must sign in again. Network failures keep the session for a retry.
    if (e instanceof TokenError) {
      await endSession();
      return null;
    }
    throw e;
  }
}

/** Single-flight refresh so parallel requests don't burn the rotating refresh token twice. */
function refreshOnce(): Promise<Tokens | null> {
  refreshing ??= refresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function getAccessToken({ forceRefresh = false } = {}): Promise<string | null> {
  if (!current) return null;
  if (forceRefresh || Date.now() > current.expiresAt - EXPIRY_MARGIN_MS) {
    return (await refreshOnce())?.accessToken ?? null;
  }
  return current.accessToken;
}
