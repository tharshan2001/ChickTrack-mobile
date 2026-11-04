# ChickTrack Mobile

Owner app for ChickTrack, built with Expo SDK 58, React Native, TypeScript and Expo Router.

## What works now

- Sign-in with the backend's OAuth2 Authorization Code + PKCE flow (client `chicktrack-mobile`).
  - Tokens are stored in SecureStore.
  - The 15-minute access token refreshes on its own with the rotating 30-day refresh token.
- Owner tabs: Home, Stock, Branches, Money and More. Stock, Branches and Money are placeholders for now.
- **Products** (chicken types), backed by `/api/v1/chicken-types`:
  - list and search;
  - add;
  - edit name and description;
  - switch active on or off.

## Run it

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Point the app at the backend.

   ```bash
   cp .env.example .env
   # edit EXPO_PUBLIC_API_URL=http://<your-mac-LAN-IP>:8080
   ```

   A phone cannot reach `localhost`, so use your computer's LAN IP. Find it with `ipconfig getifaddr en0` on macOS.

3. Start the backend with the **same** URL as its issuer, because tokens are only accepted when the issuer matches:

   ```bash
   OAUTH_ISSUER=http://<your-mac-LAN-IP>:8080 ./mvnw spring-boot:run
   ```

4. Start the app:

   ```bash
   npx expo start
   ```

### Sign-in redirect

The backend accepts one redirect URI: `app.oauth.client.mobile.redirect-uri`, which defaults to `chicktrack://oauth2/callback`.

| How you run the app | Redirect the app sends | Backend setting |
| --- | --- | --- |
| Development build (`npx expo run:ios` / `run:android`) or a release build | `chicktrack://oauth2/callback` | default, nothing to change |
| Expo Go | `exp://<LAN-IP>:8081/--/oauth2/callback` | set `APP_OAUTH_CLIENT_MOBILE_REDIRECT_URI` to that value |

The sign-in screen does not display the redirect URI. If sign-in fails with a redirect error, check the backend log for the URI it rejected.

The backend registers the client only on first start. If a client already exists in the database, update `oauth2_registered_client.redirect_uris` as well.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
```

## Layout

```
src/
  app/                  routes (Expo Router)
    _layout.tsx         fonts, React Query, auth provider, sign-in guard
    sign-in.tsx
    (tabs)/             Home, Stock, Branches, Money, More
    products/           list, new, [id] (edit)
    oauth2/callback.tsx catches the sign-in redirect deep link
  auth/                 OAuth config, token storage, refresh (single-flight)
  api/                  fetch client: bearer token, retry on 401, Idempotency-Key, error type
  features/products/    React Query hooks and the shared form
  components/           Screen, Text, Card, Button, Badge, Field, ListRow…
  theme/tokens.ts       colours, fonts, spacing from the mockups
  lib/format.ts         Colombo business date, rupee formatting of decimal strings
```

## Conventions

- **Money and weights stay strings.**
  - The API sends decimals as plain strings (`"905.50"`).
  - Format them with `formatRupees`; never use `parseFloat` for arithmetic.
- **Every mutation sends an `Idempotency-Key`.**
  - A form keeps its key while it retries after a network failure.
  - It takes a new key once the server has answered, because the backend stores 4xx answers too.
- **Add native packages with `npx expo install <pkg>`**, so you get the SDK-compatible version.
