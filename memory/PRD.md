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

### 2026-08-17 (features round 3)
- Contract Editing — `/contracts/[id]/edit` "Request a change" screen (supplier + dates prefilled) → POST /api/change-requests (customer contract edits are broker-gated on the backend, so this is the faithful path). Launched from each contract card on Site Detail.
- Bill History — dashboard "Recent bills" section from GET /api/scans with status pills; taps open /scan/review/:id. Renders only when scans exist (data-gated).
- Usage Trends — Reports "Monthly spend" mini bar-trend that reads real monthly data (by_month/monthly) from /api/reports/spend; hidden when the API returns none (no fabricated data).
- Verified by testing agent (iteration_4): backend 5/5 pass; contract change-request flow passes; data-gated sections correctly hidden for the empty test account.

## Fidelity note
All flows mirror the live backend's real contracts. Where the API gives no data (no contracts/scans/monthly spend for the test account), the corresponding UI degrades gracefully instead of showing invented data. No speculative features were added (e.g. "Share Savings" was only ever a suggestion and was NOT built).

### 2026-08-17 (features round 4)
- Password Reset — `/forgot-password` (POST /api/auth/forgot-password) + `/reset-password` (POST /api/auth/reset-password {token, new_password}); sign-in "Forgot password?" now links here.
- Self Sign-Up — `/signup` 2-step wizard (identity → business type + name) → POST /api/register → authenticated to /dashboard; sign-in "Create an account" link added; `signUp` added to AuthContext.
- Full Quote Wizard — `/quote/new` rebuilt as the multi-utility wizard (electric/gas/water/telecoms) → POST /api/quotes/multi with energy_meters / water_supplier / telecoms_supplier and contact+address → /quote/success/:id. Renewal/site "get a quote" entry points preselect the utility.
- Industry News — `/news` from GET /api/news; linked from Profile.
- Verified by testing agent (iteration_5): backend 7/7 pass; all flows pass; fixed HIGH bug (quote contact prefill on auth hydration).

### 2026-08-17 (features round 5)
- Onboarding Carousel `/splash` — 3 slides (Snap a bill / Better rates / Renewals) with paging + dots; sets `uch_seen_splash`. New root flow: unauth first-timers → /splash → /landing; unauth returning → /landing; authed → /dashboard.
- Marketing Landing `/landing` — logo, gradient hero, feature list, "Create free account" → /signup and "I already have an account" → /signin.
- Notifications Primer `/onboarding/push-primer` — post-signup opt-in; Enable → PUT /api/me/preferences (push on) → /dashboard; Not now → /dashboard. (Real push delivery needs a native build.)
- Static Help / Privacy / Terms — `/help`, `/privacy`, `/terms` linked from a Profile "Support & legal" section; Privacy/Terms open pricebuddy.co.uk externally.
- Verified by testing agent (iteration_6): backend 4/4 pass; all flows pass; 32/32 API calls hit the live host.

### 2026-08-17 (features round 6)
- Partners `/partners` — accountant-firm marketing page; linked from Landing.
- Confirm Device `/confirm-device` — POST /api/auth/confirm-device {token}; manual entry + deep-link auto-submit (once); success uses AuthContext.completeSession(token) → /dashboard.
- Shared Contract View `/share/[token]` — PUBLIC (no auth) GET /api/share/{token}; renders a contract summary or a graceful invalid state with sign-up/sign-in CTAs.
- Deep-Link Reset — `/reset-password` and `/confirm-device` accept `token` or `code` query params (app scheme `frontend`), so emailed links open the right screen pre-filled.
- Verified by testing agent (iteration_7): backend 7/7 pass; all flows pass; 0 API leaks.

## Status
All customer-facing screens from the original spec are now implemented (public/pre-auth, authed customer, and static/legal). Intentionally excluded per brief: all admin/broker and accountant-portal screens.

### 2026-08-17 (features round 7)
- Welcome Back `/welcome-back` — returning-user greeting + biometric unlock; only gates entry when the biometric flag is on.
- Biometric Unlock — real Face ID / fingerprint via expo-local-authentication; opt-in toggle in Profile (checks hardware+enrollment, graceful when unavailable); `/biometric/[mode]` prompt stub. Root gating: authed + biometric enabled + not-yet-unlocked → /welcome-back.
- Client Onboarding `/onboarding/[token]` — PUBLIC 3-option screen (upload a bill / forward by email / request a callback) via /api/onboarding/{token} (+ upload-bill, request-callback); graceful invalid-token state; static /onboarding/push-primer keeps precedence.
- Contracts Overview `/contracts` — all contracts from /dashboard/overview all_contracts (customer GET /contracts is 405); linked from dashboard + profile; cards open the change-request edit screen.
- Verified by testing agent (iteration_8): backend 5/5 pass; all flows pass; 0 API leaks; no bugs.

### 2026-08-17 (fix)
- Sign-up duplicate email: /signup now detects HTTP 400 "Email already registered", returns to step 1 with an inline email error + an info toast guiding the user to sign in, and adds a "Already have an account? Sign in" link. Verified by testing agent (iteration_9), all flows pass. (Backend correctly rejects duplicates; this is a UX guidance improvement, not a backend change.)

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

---
## FAITHFUL REBUILD FROM ORIGINAL WEB APP (in progress)
Goal: rebuild the mobile app to match the user's ORIGINAL web build (flows, copy, behaviour) 1:1.
Source of truth = the live web app's own client bundle, saved at:
- /app/memory/_ref/web_bundle.pretty.js  (beautified React, readable)
- /app/memory/_ref/web_bundle.min.js, /tmp/orig.css (color tokens: --hu-accent #ff6b47, pastels)
No login/live-data writes used — everything reconstructed from the bundle.

### CRITICAL FIX (fork)
- Fork reset EXPO_PUBLIC_BACKEND_URL to the preview host → /api 404s. App must hit the LIVE backend.
- Fix: src/api/client.ts now uses EXPO_PUBLIC_UCH_BACKEND_URL (added to .env) with hardcoded
  fallback https://utility-contract-hub.emergent.host. Fork-proof.

### DONE
- Phase 1 — Dashboard: time-based greeting (Good Morning/Afternoon/Evening + subtitles), bell→/profile,
  alerts nudge, trust banner ("Fully secured / You're completely covered") vs "Action required" card
  (urgency config gl: expired/critical/high/medium/renewable/low/normal titles+pills+accents),
  Quick Actions (Smart Bill Upload→/scan, Add another business [modal→POST /businesses],
  Meter Installation [modal→POST /meter-installs]), lower-bills quote promo→/quote/new.
  New components: src/components/add-business-modal.tsx, meter-install-modal.tsx.
- Phase 2 — Sites & Contracts: sites list ("Your sites"/"{n} sites", search when >5, dashed "Add a new site",
  empty "Add your first site"), SiteActionsSheet (Scan a bill/Get a quote/Add site manually) →
  src/components/site-actions-sheet.tsx; manual add-site form (/sites/new) → POST /change-requests
  {request_type:"site_add"} + "We're on it" success; site detail (/sites/[id]) expandable utility sections
  (electricity/gas/water/broadband/telecoms) from GET /properties/{id}/utilities, Get Quote/Lock in new rate,
  Request change modal → POST /change-requests {contract_id,property_id,request_type,message}
  (src/components/request-change-modal.tsx).

### REMAINING PHASES
- Phase 3 — Scan flow (/scan, scan/review, scan/success) + Quote wizard (/quote/new 5-step multi-utility, quote/success)
- Phase 4 — Reports, Profile (exact sections + "Request account deletion"), Support (phone 0800 368 9822), Partners
- Phase 5 — Entry & Auth: splash, landing ("Never overpay on utilities again."), signin/signup wording
- Note: multi-business switcher chip (>1 business) + spotlight tour intentionally deferred (single-biz test acct)

### BATCH 1 COMPLETE (icons + Home/Sites + nav)
- src/components/icon.tsx: exact SVG replica of web icon set (33 icons). USE THIS everywhere (not Ionicons).
- Dashboard: added HaveAQueryPill (src/components/have-a-query-pill.tsx → POST /concierge/messages),
  animated "Try it" sparkle badge (shows when items.length===0 / new user), audit-in-progress card
  (GET /my/audits-in-progress). All icons swapped to Icon.
- Bottom nav FIXED to match web: Home(/dashboard,home) · Sites(/sites,building) · Reports(/reports,bolt)
  · Support(/support,phone) · Profile(/profile,user). NO Renewals tab (renewals href:null, opened from
  dashboard card). Moved app/reports.tsx -> app/(tabs)/reports.tsx.
- Sites cluster re-skinned with exact icons.
- Colors: accent #FF6B47 used for Try-it badge. Consider aligning brandPrimary to #FF6B47 app-wide (currently #F25028) — CHECK with user.

### COLOR + PILL FIX
- Accent locked to #FF6B47 app-wide (theme.brandPrimary/brand). heading/onSurface #1A1F36, onSurfaceSecondary #3F4659.
- "Have a query" pill corrected: lavender bg (#DDD6FE) + dark navy text/icon (#1A1F36) + border rgba(109,40,217,.18). (was wrongly peach).

### BATCH 2 COMPLETE (Scan flow)
- scan/index.tsx: card multi-page flow (dashed lavender card, scan circle, headings/subs per state,
  page thumbnails + PDF chip, buttons "Take a photo"/"Upload image or PDF"/"+Add"/Start over).
  Uses expo-image-picker (camera) + expo-document-picker (image/PDF). Max 4 imgs / 12MB, no PDF+img mix.
  POST /scans multipart (file for pdf, files[] for images) -> /scan/review/{id}.
- scan/review/[id].tsx: GET /scans/{id} + GET /properties. pages badge, match banner (mpan green /
  new purple), action chips (Existing/New business), site chips, utility chips, fields with "from bill"
  prefilled highlight, intent picker (track/quote/both), "Confirm & save" -> POST /scans/{id}/confirm
  {action,intent,property_id,...} -> /scan/success/{id}. "Cancel and re-scan".
- scan/success/[id].tsx: urgency-tier result (gl config: missing/expired/critical/high/medium/renewable/
  low/normal) with exact headlines+bodies, LinearGradient circle, route A="View Live Quotes"(/quote/new
  ?utility&incumbent&property) / route B="Go to Dashboard", "View site details", "Call 0800 368 9822",
  "Scan another bill". pending_review -> audit-team card.
- NOTE: review/success need real OCR bill data to fully verify end-to-end.

### REMAINING: Batch 3 (Quote wizard + Reports), Batch 4 (Profile/Support/Partners/News), Batch 5 (Auth/splash/landing)
