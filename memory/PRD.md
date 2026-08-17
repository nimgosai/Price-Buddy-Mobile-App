# Utility Contract Hub — Mobile App (PRD)

## Original problem statement
React Native (Expo) mobile FRONT-END ONLY for the existing "Utility Contract Hub" (PriceBuddy). No local backend/DB — the app talks to the LIVE external backend at `https://utility-contract-hub.emergent.host` (API prefix `/api`). Customer-facing screens only (no admin/broker/accountant). Screens delivered incrementally on request.

## Architecture
- Frontend: Expo Router (file-based), Expo SDK 54 / RN 0.81. Bottom-tab navigation via `app/(tabs)/`.
- Backend: EXTERNAL & LIVE. `EXPO_PUBLIC_BACKEND_URL=https://utility-contract-hub.emergent.host`; every call uses the full URL via `src/api/client.ts`.
- Auth: email+password → `POST /api/login` → JWT in SecureStore (`uch_auth_token`); `AuthProvider` bootstraps via `GET /api/me`. `(tabs)/_layout.tsx` guards: Redirects to `/signin` when `!user` (covers sign out from any tab).
- Theme: PriceBuddy brand — accent `#F25028` (pressed `#DD3F1B`), text `#1A1F36`, headings `#1F2A44`, background `#F8F9FC`, white cards; success `#10B981`, warning `#F59E0B`, error `#EF4444`; radii 14/20/28, pills fully round; Geist font; logo `assets/images/pricebuddy-logo.webp`. Tokens in `src/theme/theme.ts`.
- Keyboard: `react-native-keyboard-controller`.

## User persona
UK business owner managing utility/energy contracts, renewals and bills on mobile.

## Implemented
### 2026-08-14
- `/signin` (email+password), `/dashboard` (utility health, renewals, audit banner, empty state), `/scan` (camera + gallery, OCR wait, success).

### 2026-08-17
- Rebranded entire app to PriceBuddy look (logo on sign-in + dashboard header).
- Bottom-tab nav: Home, Renewals, Sites, Support, Profile.
- `/renewals` — GET /api/renewals/urgent, sorted, urgency pills, empty state.
- `/sites` — GET /api/properties, list + empty state + FAB. `/sites/new` — form → POST /api/change-requests (property creation is broker-gated, so add-site sends a broker request).
- `/support` — concierge chat: GET/POST /api/concierge/messages, mark-read; keyboard-aware.
- `/profile` — account, notification toggles (PUT /api/me/preferences), renewal reminders (GET/PUT /api/me/alerts), sign out, delete account (DELETE /api/me) with confirm modal.
- `/scan/review/[id]` — editable OCR field review → POST /api/scans/{id}/confirm.
- FIXED reported bug: sign out now returns to /signin (auth guard). Verified by testing agent (iteration_2, all pass).

### 2026-08-17 (features round 2)
- `/sites/[id]` Site Details — GET /api/properties/{id}/utilities; contracts + meter readings; per-contract quick actions: "Get a quote" and "Request a change" (modal → POST /api/change-requests). Sites list cards now tappable.
- `/reports` Spend Reports — GET /api/reports/spend; total spend headline + simple horizontal bar charts by utility and by site (no chart lib). Entry points: Profile "Spend reports" row + dashboard tile. Empty state.
- `/quote/new` + `/quote/success/[id]` Get A Quote — utility chip selector + message → POST /api/quotes/request. Launchable from renewal cards (dashboard + renewals) and site-detail contracts with prefilled context.
- Support Help Centre — segmented Chat | Help centre; Help lists GET /api/support/resources with a markdown-rendered article modal.
- Verified by testing agent (iteration_3): backend 7/7 new + 9 regression pass; all frontend flows pass.

## Known backend constraints (not fixable from the app)
- Bill scan OCR (`POST /api/scans`) currently returns 502 gateway timeout on this deployment (heavy sync OCR > gateway limit). App surfaces a friendly retry message. Scan Review is only reachable after a successful upload.
- Property creation is broker-gated for customers → Sites/Renewals empty for fresh accounts (expected).

## Backlog / next (P1)
- `/sites/:id` site detail (contracts + meter reads), `/contracts/new`, `/contracts/:id/edit`
- `/reports` annual spend charts, `/quote/new` + success
- `/forgot-password`, `/reset-password`, `/signup`, Google sign-in
- Support: FAQ/resources section (GET /api/support/resources)

## Notes
- Camera capture & native gallery only work on a real device / dev build, not Expo Go web preview.
