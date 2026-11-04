import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Tokens = {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch milliseconds when the access token expires. */
  expiresAt: number;
};

const KEY = 'chicktrack.tokens';

// SecureStore is native-only; the web build (dev convenience) falls back to localStorage.
const storage = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(KEY) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(KEY);
  },
  set: async (value: string) => {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(KEY, value);
      } catch {}
      return;
    }
    await SecureStore.setItemAsync(KEY, value);
  },
  remove: async () => {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(KEY);
      } catch {}
      return;
    }
    await SecureStore.deleteItemAsync(KEY);
  },
};

export async function loadTokens(): Promise<Tokens | null> {
  const raw = await storage.get();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    await storage.remove();
    return null;
  }
}

export const saveTokens = (tokens: Tokens) => storage.set(JSON.stringify(tokens));
export const clearTokens = () => storage.remove();
