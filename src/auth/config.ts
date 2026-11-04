import type { DiscoveryDocument } from 'expo-auth-session';

/**
 * Base URL of the ChickTrack backend, e.g. http://192.168.1.20:8090.
 * The backend's OAUTH_ISSUER must be this same URL, or token validation fails.
 */
const raw = process.env.EXPO_PUBLIC_API_URL;
if (!raw) {
  console.warn('EXPO_PUBLIC_API_URL is not set; copy .env.example to .env');
}
export const API_URL = (raw ?? 'http://localhost:8090').replace(/\/+$/, '');

export const CLIENT_ID = 'chicktrack-mobile';
/**
 * In-app sign-in: the username and password typed on the sign-in screen are exchanged at the
 * token endpoint for an access token and a rotating refresh token (see the backend's PasswordGrant).
 */
export const PASSWORD_GRANT = 'urn:chicktrack:params:oauth:grant-type:password';

/** Spring Authorization Server endpoints. */
export const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${API_URL}/oauth2/authorize`,
  tokenEndpoint: `${API_URL}/oauth2/token`,
  revocationEndpoint: `${API_URL}/oauth2/revoke`,
};
