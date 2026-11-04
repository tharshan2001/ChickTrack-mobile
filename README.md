# ChickTrack Mobile

Owner app for ChickTrack, built with Expo SDK 58, React Native, TypeScript and Expo Router.

## What works now

- Sign-in with the backend's OAuth2 Authorization Code + PKCE flow (client `chicktrack-mobile`).
  - Tokens are stored in SecureStore.
  - The 15-minute access token refreshes on its own with the rotating 30-day refresh token.
- Owner tabs: Home, Stock, Branches, Money and More. Money is a placeholder for now.
- **Stock**:
  - warehouse batches oldest first, with free / held weight and landed cost — `/api/v1/stock-batches`
  - adjust a batch (damage, loss, return, recount) with its history — `/api/v1/stock-adjustments`, `/api/v1/inventory-movements`
  - new purchase with several chicken types, commission and shared costs; stock is added on save — `POST /api/v1/procurements`
  - purchases by day / week / month and each purchase's cost breakdown — `GET /api/v1/procurements`
- **Dispatch** — `/api/v1/distributions`:
  - send to branch: free stock oldest batch first, margin and delivery cost preview; saves a draft that holds the stock
  - dispatch, cancel a draft or reverse a dispatch (with a reason)
  - receive delivery line by line, with a reason for any shortfall
- **Setup** (list, search, add, edit, active on/off):
  - Products (chicken types) — `/api/v1/chicken-types`
  - Suppliers — `/api/v1/suppliers`
  - Branches — `/api/v1/branches` (the code is fixed once created)
  - Expense categories — `/api/v1/expense-categories`
- **Prices & margins**:
  - today's buying price and each branch's selling price per product — `/api/v1/daily-prices/current`
  - set a price for all branches or one, starting now or on a date — `POST /api/v1/daily-prices`
  - change the dispatch markup — `/api/v1/company-margin-rules`

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
    (app)/              everything behind sign-in
      (tabs)/           Home, Stock, Branches, Money, More
      products/ suppliers/ branches/ expense-categories/   list, new, [id]
      prices/           index, set, margin
      stock/[id]        adjust a batch
      purchases/        list, new, [id]
      dispatches/       new, [id], [id]/receive
    oauth2/callback.tsx catches the sign-in redirect deep link
  auth/                 OAuth config, token storage, refresh (single-flight)
  api/                  fetch client, types, createCrud() hooks for master data
  features/             screens shared by several routes, prices API hooks
  components/           Screen, MasterList, forms, SelectField, Segmented, DateField…
  theme/tokens.ts       colours, fonts, spacing from the mockups
  lib/                  Colombo dates, rupee formatting, string decimal helpers
```

## Conventions

- **Money and weights stay strings.**
  - The API sends decimals as plain strings (`"905.50"`).
  - Format them with `formatRupees`; never use `parseFloat` for arithmetic.
- **Every mutation sends an `Idempotency-Key`.**
  - A form keeps its key while it retries after a network failure.
  - It takes a new key once the server has answered, because the backend stores 4xx answers too.
- **Add native packages with `npx expo install <pkg>`**, so you get the SDK-compatible version.
