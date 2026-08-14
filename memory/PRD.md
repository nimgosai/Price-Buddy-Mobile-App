# Utility Contract Hub — Mobile App (PRD)

## Original problem statement
React Native (Expo) mobile FRONT-END ONLY for the existing "Utility Contract Hub" (PriceBuddy) product. No local backend/DB — the app talks to the LIVE external backend at `https://utility-contract-hub.emergent.host` (API prefix `/api`). Customer-facing screens only (no admin/broker/accountant). Build first three screens — `/signin`, `/dashboard`, `/scan` — then pause for further customer screens one at a time.

## Architecture
- Frontend: Expo Router (file-based routes), React Native 0.81 / Expo SDK 54.
- Backend: EXTERNAL & LIVE. Read from `EXPO_PUBLIC_BACKEND_URL=https://utility-contract-hub.emergent.host`; every call uses the full URL via `src/api/client.ts`.
- Auth: email+password → `POST /api/login` → JWT stored in SecureStore (`uch_auth_token`); `AuthProvider` bootstraps via `GET /api/me`.
- Theme: PriceBuddy black/white + emerald accent, Geist font. Tokens in `src/theme/theme.ts` (from `/app/design_guidelines.json`). Reusable UI in `src/components/ui.tsx`, toast in `src/components/toast.tsx`.
- Keyboard: `react-native-keyboard-controller` (KeyboardProvider + KeyboardAwareScrollView + KeyboardStickyView).

## User persona
UK business owner managing utility/energy contracts, renewals, and bills on mobile.

## Core requirements (static)
- Customer-only screens; no admin/broker/accountant.
- All data from the live backend; no local persistence beyond auth token.

## Implemented (2026-08-14)
- `/signin` — email+password with validation, show/hide password, forgot-password hint toast, sticky CTA, live login → `/dashboard`.
- `/dashboard` — live `GET /api/dashboard/overview` + `/api/renewals/urgent` + `/api/my/audits-in-progress`; utility-health summary with urgency counters, upcoming-renewal cards, "Audit in progress" banner with "Request a call now" (`POST /api/scans/{id}/request-call`), empty state, pull-to-refresh, sign out.
- `/scan` — camera permission primer + contextual handling (Open Settings when blocked), live camera capture (expo-camera) with document-frame mask, gallery picker (expo-image-picker), preview + upload to `POST /api/scans` (multipart field `file`, 120s timeout), OCR waiting overlay, success screen.
- Verified end-to-end against the live backend (login, dashboard, signout). Testing agent: backend 9/9, frontend ~92%; signout-navigation bug fixed & re-verified.

## Backlog / next (P1 — customer screens, one at a time on request)
- `/renewals`, `/sites`, `/sites/new`, `/sites/:id`
- `/contracts/new`, `/contracts/:id/edit`
- `/scan/review/:id`, `/scan/success/:id`
- `/profile`, `/support`, `/reports`
- `/quote/new`, `/quote/success/:id`
- `/forgot-password`, `/reset-password`, `/signup`, Google sign-in
- Bottom tab navigation once ≥4 main areas exist

## Notes
- Property/contract creation is broker-gated on this backend, so a fresh customer account shows the empty dashboard (correct).
- Camera capture & native gallery only work on a real device / dev build, not in Expo Go web preview.
