import { Redirect } from 'expo-router';

/**
 * The OAuth redirect (chicktrack://oauth2/callback) can also open the app as a
 * deep link. The auth session has already captured the code, so just go home.
 */
export default function OAuthCallback() {
  return <Redirect href="/" />;
}
