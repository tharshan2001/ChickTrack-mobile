# ChickTrack Mobile

Owner app for ChickTrack, built with Expo SDK 58, React Native, TypeScript and Expo Router.

## What works now

- Sign-in with the backend's OAuth2 Authorization Code + PKCE flow (client `chicktrack-mobile`).
  - Tokens are stored in SecureStore.
  - The 15-minute access token refreshes on its own with the rotating 30-day refresh token.
- Owner tabs: Home, Stock, Branches, Money and More. Money is a placeholder for now.
- **Branches**: each branch's stock, today's sales and what it owes; branch home with deliveries to confirm; daily sales per product at the branch's selling price (saving the same day again replaces it) — `/api/v1/branches/{id}/stock`, `/balance`, `/api/v1/branch-sales`
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

## Run it on your phone (same Wi-Fi as the Mac)

1. Start the backend on the Mac's LAN address (Postgres comes up through Docker):

   ```bash
   cd ../ChickTrack && ./scripts/run-lan.sh
   ```

   It sets `OAUTH_ISSUER=http://<lan-ip>:8080` (tokens must match the URL the phone calls) and
   allows both sign-in redirects: `chicktrack://oauth2/callback` for development builds and
   `exp://<lan-ip>:8081/--/oauth2/callback` for Expo Go. The backend updates its saved client on
   every start, so a new Wi-Fi address only needs a restart.

2. Start the app:

   ```bash
   npm install
   npm run lan
   ```

   This writes `.env` with `EXPO_PUBLIC_API_URL=http://<lan-ip>:8080` and starts Expo. Scan the QR
   code with Expo Go (it must support SDK 58).

3. Sign in as the owner: the bootstrap admin from the backend's `.env`
   (`OAUTH_ADMIN_USERNAME` / `OAUTH_ADMIN_PASSWORD`, `admin` / `change-me` by default). It is created
   only on the first start against an empty database.

If the phone can't connect, allow Java through the macOS firewall, and check both devices are on
the same network. Set `LAN_IP=192.168.x.x` in front of either command if the address is wrong.

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
      products/ suppliers/ expense-categories/   list, new, [id]
      prices/           index, set, margin
      stock/[id]        adjust a batch
      purchases/        list, new, [id]
      dispatches/       index, new, [id], [id]/receive
      branches/         new, [id] (home), [id]/edit, [id]/sales
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
