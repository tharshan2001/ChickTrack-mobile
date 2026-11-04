import { makeRedirectUri, type DiscoveryDocument } from 'expo-auth-session';

/**
 * Base URL of the ChickTrack backend, e.g. http://192.168.1.20:8080.
 * The backend's OAUTH_ISSUER must be this same URL, or token validation fails.
 */
const raw = process.env.EXPO_PUBLIC_API_URL;
if (!raw) {
  console.warn('EXPO_PUBLIC_API_URL is not set; copy .env.example to .env');
}
export const API_URL = (raw ?? 'http://localhost:8080').replace(/\/+$/, '');

export const CLIENT_ID = 'chicktrack-mobile';
export const SCOPES = ['openid', 'profile', 'api.read', 'api.write'];

/** Spring Authorization Server endpoints. */
export const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${API_URL}/oauth2/authorize`,
  tokenEndpoint: `${API_URL}/oauth2/token`,
  revocationEndpoint: `${API_URL}/oauth2/revoke`,
};

/**
 * Development or release build: chicktrack://oauth2/callback (the backend default).
 * Expo Go: exp://<lan-ip>:8081/--/oauth2/callback, which must be registered on the backend.
 */
export const redirectUri = makeRedirectUri({ scheme: 'chicktrack', path: 'oauth2/callback' });
