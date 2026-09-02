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
- Phase 1 — Dashboard: time-based greeting (sentence case "Good morning/afternoon/evening," on line 1
  ~14px medium + full display name on line 2 ~18px semibold, name wraps up to 2 lines then ellipsizes;
  avatar left / bell right stay fixed and vertically centred), bell→/profile,
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

### DASHBOARD MOBILE REFACTOR + GLOBAL TYPOGRAPHY (user-directed, overrides exact-web-match for Home)
- Home: compact status badge; 2x2 Quick Actions (Scan Bill / Add Business / Meter Installation / View Contracts)
  vertical tiles, responsive font (useWindowDimensions), badge absolute top-right; greeting single line no subtitle;
  12px section gap. Have-a-query = full-width card (radius.md). Promo = single Get Quote CTA.
- Tab bar: safe-area bottom inset (paddingBottom = max(insets.bottom, android 10)) so it clears Android system nav.
- Add-site form: optional Existing supplier, Contract end date, Meter type (Electric/Gas segmented), Meter number.
- GLOBAL theme tokens (theme.ts) updated for contrast: heading #1A1D1E, onSurface #1E293B,
  onSurfaceSecondary #475569, muted #64748B. Section headers 12px/0.05em/semibold/muted. Accent #FF6B47.

### BATCH 3 COMPLETE (Quote wizard) + STEP-2 VALIDATION FIX (verified by testing_agent iter 10)
- app/quote/new.tsx: multi-step wizard (service -> global -> energy meters -> water -> telecoms -> review)
  -> POST /quotes/multi -> /quote/success/{id}. Services electric/gas/water/telecoms; energy meters add/remove
  with contract_end_window chips (out_of_contract/under_6m/6_12m/over_12m). Prefills from ?utility&incumbent&property.
- Step 2 inline validation: per-field red border (#DC2626) + red error text (testIDs quote-error-name/email/
  business/address/postcode/supply-postcode), asterisks on mandatory labels, auto-scroll to top on fail,
  Continue button subtle (opacity .55) until valid. Email format validated.
- Reports already uses shared ScreenHeader -> consistent with Sites.
- OPEN: user's physical phone still shows OLD build via Expo Go (web preview + android bundle DO update).
  Cleared Metro cache. Need user to confirm: scanning dev preview QR vs published snapshot; bottom nav shows
  Home/Sites/Reports/Support/Profile (new) vs Home/Renewals/Sites/... (old).
- REMAINING: Batch 4 (Profile/Support/Partners), Batch 5 (splash/landing/auth). quote/success screen pre-existing (works).

### QUOTE STEP-2 AUTO-POPULATE FIX (matches web Oo flow)
- Prefills contact name/email/phone from signed-in account (useAuth); subtitle "Pre-filled from your account…"
  when logged in, generic otherwise.
- GET /properties: if arrived via ?property=<id> (from a site) -> locked "QUOTE FOR THIS SITE" card
  (testID quote-locked-site) auto-filling business/address/postcode, with "Change" (quote-change-site,
  only when >1 site). Else if saved sites exist -> saved-site picker chips (quote-property-select) that
  auto-fill on tap. No sites -> plain manual fields. Verified via screenshot (empty acct shows plain fields
  + subtle Continue + asterisks + prefilled email).
- STILL TODO (next): Profile (Request account deletion), Support (concierge chat, phone 0800 368 9822),
  Reports layout/wording, then splash/landing/auth.

### BATCH 4 (partial) COMPLETE — Profile + Support (verified via screenshot)
- app/(tabs)/profile.tsx: user card, Email alerts + Phone push toggles -> PUT /me/preferences (useAuth signOut/refreshUser),
  My sites/My contracts/Contact support rows, Sign out, "Request account deletion" -> delete-account-sheet (type DELETE)
  -> POST /change-requests {request_type:"account_deletion"} -> "Request received". Exact icons + theme tokens.
- app/(tabs)/support.tsx: "We're here to help", AM card "Your PriceBuddy team" + Call the desk (tel 0800 368 9822),
  "Mon-Fri 9am-4pm UK" + email link (hello@pricebuddy.co.uk), HaveAQueryPill, "How our team can help" 5 items (eo array).
- REMAINING: Reports layout/wording polish; Entry screens (splash slides, landing, signin/signup) to match original.

### PROFILE/SUPPORT CORRECTED to match original (user flagged deviations)
- Support AM card: dark #1A1F36 banner "Hi {firstName}, we've got you." + "Any question, any time — we're a single
  tap away."; accent (#FF6B47) avatar w/ initials overlapping; "Your account team" / "Price Buddy support team";
  Call the desk; Mon–Fri 9am–4pm UK · Drop us an email. (Was wrongly lavender chat avatar + "Your PriceBuddy team".)
- Profile rows corrected: My sites · My quote requests (->/quote/new) · Replay product tour (->/splash) · Contact support.
  (Was wrongly "My contracts".)
- TODO next: (1) verification pass of Home/Sites/Scan/Quote wording vs originals; (2) Reports polish; (3) Entry screens.

### CONSISTENCY PASS + REPORTS + ENTRY SCREENS (verified by testing_agent iter 11)
- GLOBAL TYPE SCALE (theme.ts) aligned to original web (hu-* classes): kicker 11, sm 13 (hu-muted),
  title 15 (card/row titles), xl 18 (hu-h3 page/header titles), 2xl 24, 3xl 30. This ripples app-wide
  so every ScreenHeader/title/body is consistent.
- Shared ScreenHeader: 18px bold title + 13px muted subtitle (2 lines) + white shadowed back button
  (arrow-back). Added onBack (->/dashboard) to Sites & Support so all tabs share one header treatment.
- Shared EmptyState + Sites empty aligned: 64px brand-tint tile, 28px icon, 18px title, 13px message.
- Normalized card/row titles to 15 and secondary/desc text to 13 across Sites/Reports/Support/Profile/Dashboard.
  Section kickers (QUICK ACTIONS / WHAT WE DO) -> 11px uppercase muted. Card headings -> 18px.
- REPORTS rebuilt to original (app/(tabs)/reports.tsx): title "Your spend" + "Annual estimate based on
  your current tariffs and usage."; empty "No data yet" + "Scan a bill to get started"; populated =
  navy "ESTIMATED ANNUAL SPEND" total card (38px + faint £ watermark) + "By utility" (emoji+color bars)
  + "By site" (>1) + "Top contracts" (left-border utility color). Removed non-original monthly trend.
- ENTRY JOURNEY rebuilt to original copy: index unauth -> /landing. Landing = marketing hero
  ("Never overpay on utilities again." + "Real human support — not bots." + trust strip + 4 features +
  stats + bottom CTA); "Create free account" -> /splash -> /signup; "I already have an account" -> /signin.
  Splash 3 slides (Snap a bill / Find better rates / Stay ahead of renewals); finish -> /signup (or
  /dashboard when replayed while logged in). Signin "Welcome back" / "Sign in to manage your contracts."
  Signup step1 "Create your account" (Your name / you@business.co.uk) -> step2 "Tell us about your business".
- OPEN (next): optional side-by-side polish of Scan & Quote inner-screen wording/spacing (headers already
  consistent via the global scale).

### BATCH 8 — Tour + Multi-business chip + Scan/Quote/Site polish (verified iter 12)
- GUIDED SPOTLIGHT TOUR (src/components/spotlight-tour.tsx): dark cutout overlay + brand ring around
  a measured target + tooltip card (dots/Skip/Back/Next/'Got it'). Dashboard measures Scan tile
  (quick-action-scan) & Lower-bills CTA (lower-bills-cta) via measureInWindow, and computes the Sites
  bottom-tab rect. 3 steps w/ exact original copy: "All your sites & contracts" / "Snap any bill" /
  "Hands-free renewal". Auto-opens once when user.has_completed_tour===false; persists via
  PUT /me/preferences {has_completed_tour:true} + refreshUser. Profile "Replay product tour" sets
  storage uch_tour_replay -> dashboard re-opens on FOCUS (tabs stay mounted).
- MULTI-BUSINESS: BusinessProvider (src/business/business-context.tsx) mounted in _layout inside
  AuthProvider. Fetches GET /businesses; activeBizId stored locally (uch_active_business_id), default
  ALL_BUSINESSES ("__all__"). BusinessSwitcherChip (sites=lavender / reports=purple) renders ONLY when
  businesses.length>1 (single-biz test acct => hidden). Sites -> GET /properties{?business_id=},
  Reports -> GET /reports/spend{?business_id=}; switching reloads. Switcher bottom-sheet lists
  "All businesses (n)" + each business.
- POLISH: scan/review intent body 11.5->13; Scan/Quote/Site-detail inherit the global type scale.

### BATCH 9 — Try-it once + Renewals/Contracts polish (screenshot-verified)
- "Try it" Scan badge: now shows ONCE for a brand-new/empty account (persist uch_seen_try_it) and the
  pulse runs a finite 4 iterations then stops (was infinite loop). Removed unused isNewUser.
- Renewals: header "Renewals coming up" + back to dashboard; empty "You're all caught up" /
  "No contracts expiring within 90 days." (matches original renewals-screen copy). Card supplier ->15,
  meta/date ->13 for consistency.
- Contracts overview: card supplier ->15, meta/date ->13.
- Scan success: already matches original (tiered headlines, View Live Quotes / Scan another bill) — left as-is.

### FIX — Profile toggles flashing / slow (from user video Emergent (11).mp4)
- Root cause: shared savingPref disabled BOTH switches during save, and Switch value was bound to the
  server value (only updated after refreshUser round-trip) -> both flashed + felt slow.
- Fix: optimistic local state (emailOn/pushOn) synced from user via useEffect; each toggle flips
  instantly & independently; PUT /me/preferences fires in background; revert + toast on failure.
  Removed shared disabled. Verified via screenshots (push flips instantly, email unaffected).

### FIX — Bottom-sheet top clipped (Meter Install + Add Business) [user video]
- Root cause: sheet used maxHeight:"88%" but its parent KeyboardAvoidingView (kav) had no resolved
  height (width:100% only), so the % didn't resolve -> sheet grew taller than the screen, bottom-anchored,
  and its TOP (grabber + header) overflowed above the viewport (looked cut off).
- Fix: kav -> { width:"100%", flex:1, justifyContent:"flex-end" } so the sheet's parent fills the screen,
  maxHeight:"88%" resolves correctly, and the sheet is capped + scrollable. Applied to
  meter-install-modal.tsx and add-business-modal.tsx. Verified via screenshots (full header now visible).
- Audited all other modals/sheets: request-change & have-a-query are content-sized (no maxHeight) => OK;
  business-switcher & profile-delete sheets sit under a full-screen flex:1 backdrop => % resolves OK.

### Business-on-dashboard chip (original-grounded) + seeding investigation
- Added compact "dashboard" variant to BusinessSwitcherChip; rendered under the dashboard greeting
  (only when businesses.length>1). Shows active business name ("All businesses (2)" / company name) +
  chevron; opens the same Switch-business sheet. Matches original ("Added dashboard switcher chip").
  Refactored the sheet into renderSheet() shared by sites/reports/dashboard variants. Verified via screenshot.
- SEEDING BLOCKED via customer API: POST /properties -> 403 (broker-managed); POST /contracts requires
  property_id (unobtainable); POST /scans -> 502/OCR-heavy & needs broker confirmation. So sites/contracts
  cannot be injected from the app side by design — needs backend/broker to seed a demo account, or the
  user scans a real bill on-device.

### FIX — tab scroll persistence + card shadow fidelity + press states [user video Emergent(12)]
- Scroll reset: new hook src/hooks/use-scroll-top-on-focus.ts scrolls a tab's ScrollView back to top on
  blur (useFocusEffect cleanup). Wired into Profile, Support, Sites, Reports. Verified: Support scrollTop
  106 -> 0 after switching away and back.
- Shadows: strengthened theme.shadow.card toward original (0 10px 18px rgba(17,24,39,0.08), elev 3) and
  applied ...shadow.card to Support amCard/helpCard and Profile userCard/row (were border-only/flat).
- Press feedback: added pressed opacity to Support 'Call the desk', Profile 'Sign out' & 'Request account
  deletion' (LinkRow already had it). Button/quick-actions already had press states.

### DEMO DATA MODE (Option A) — preview app with sample data
- New src/demo/demo-data.ts: in-memory sample dataset (3 sites, 6 contracts across
  electricity/gas/water/broadband/telecoms, total £32,600). getDemoResponse(path) answers GET
  /properties, /reports/spend, /renewals/urgent, /dashboard/overview, /my/audits-in-progress,
  /properties/{id}/utilities. Flag persisted in storage key uch_demo_mode; loaded at startup.
- apiRequest (src/api/client.ts) short-circuits GET when demo response exists.
- Profile: new "Demo data" ToggleRow (profile-demo-toggle). On web it reloads; on native it navigates
  to dashboard. Sites & Reports now refetch on focus so the toggle reflects immediately.
- Per-device only (localStorage) — does NOT touch the real backend/account. Verified: Reports charts
  and Sites list fully populate when ON.

### QUOTE WIZARD REBUILT to spec (two entry contexts, 4 steps)
- Params standardized: ?propertyId=&utility=&contractId= . Site Detail Get-Quote + Home Get-a-Quote wired.
- Entry A (deep-link): skip Service; Step 2 read-only quote-context-banner + quote-change-site (sets
  forceEditSite -> reveals Entry-B branching); Step 3 prefilled from GET /contracts/{id} (fallback safe).
- Entry B: Service picker; radios quote-supply-existing/quote-supply-new UNCHECKED, Continue disabled;
  2+ businesses -> quote-business-select above quote-property-select (sites filtered by business_id);
  1 business skips picker; 0 sites -> existing disabled/new forced; new branch fields start EMPTY.
- Rules: business_name from owning business via property.business_id->businesses (never site name);
  back-fill effect once businesses load; no auto-select on Entry B; switching existing->new clears
  property_id/address/postcode (keeps business_name only on deep-link).
- Contact quote-contact-name/email prefilled from user. POST /quotes/multi -> /quote/success (ref).
- Demo mode extended: /contracts, /contracts/{id}, business_name on demo sites.
- testids match web for shared E2E. Files: app/quote/new.tsx (rewritten), app/quote/success.tsx (new),
  app/sites/[id].tsx (params), src/demo/demo-data.ts.

### FIX — Quote existing-sites: business picker now ALWAYS shows (then site list)
- Changed condition so choosing "One of my existing sites" always shows the Business selector first, then the Site list (filtered by business). Business selection now required before Continue. Matches original build. Also added Step-1 description + radio helper texts + "Where's the supply?". Verified via demo mode screenshots.


### DEMO DATA — second business added (multi-business preview)
- src/demo/demo-data.ts now has TWO businesses: b1 "Price Buddy Demo Ltd" (3 sites: Head Office,
  Manchester Warehouse, Bristol Retail Unit) and b2 "Riverside Cafés Ltd" (2 sites: Bath, Oxford).
  Each PROPERTY carries business_id; BUSINESSES derives site_count/contract_count from the data.
- getDemoResponse now mocks GET /businesses (2 items) AND parses ?business_id=<id> so switching the
  business chip actually filters /properties, /contracts, /reports/spend, /renewals/urgent,
  /dashboard/overview. spendReport(list) accepts a filtered contract list.
- Also removed the earlier "b1" contract id collision (broadband is now "b1c") so business id b1 is unique.
- profile.tsx onToggleDemo now calls refreshBusinesses() so the switcher chip appears/updates
  immediately after toggling demo on native (web already reloads).
- Removed the incorrectly-added "Phone (optional)" field from the Quote Wizard details step earlier
  in this session (only Name + Email now, matching original).
### STRICT PARITY PASS (user-demanded; matches original web bundle exactly)
- Quote wizard app/quote/new.tsx FULLY REWRITTEN to mirror the original bundle 1:1:
  - Steps: service → global ("Your details") → energy → water → telecoms → review.
  - "Your details" = Name + Email (prefilled, tinted) + h3 "Site" + single Site DROPDOWN
    (native bottom-sheet SelectField) + Business name ("BIOS Ltd") + Address ("123 Boulevard
    Avenue") + Postcode ("SW1A 1AA") + "Is this the supply address?" Yes / "No — different site"
    chips (+ Supply postcode when No). Radio "Where's the supply?" + business picker REMOVED.
  - Locked-site card "QUOTE FOR THIS SITE" + "Change" when propertyId param present.
  - Energy step: "Energy details"; supplier CHIPS (10 UK suppliers + "I don't know" + free text),
    Contract end date dropdown incl. "Don't Know", MPAN/MPRN (optional) numeric, "From your
    contract" prefill badge, "Add another Electric/Gas Meter".
  - Deep-link rules: ?utility= skips service step (pips hide first, "Step max(1,s) of len-1");
    ?contractId&utility∈{electricity,gas} skips energy step + shows "EXPIRING SOON" renewing pill
    on Review. Accepts propertyId|property and incumbent params.
  - Payload = original shape: {selected_services, contact{name,email}, address{property_id,
    business_name, full_address, postcode, is_supply_address, supply_postcode}, energy_meters
    [{_id,utility,supplier,contract_end_window,meter_point_number}], water_supplier,
    telecoms_supplier} → POST /quotes/multi → /quote/success?id={quote_request_id}.
  - Validation msg: "Please complete the highlighted fields." Submit btn "Submit request" with
    CtaShimmer sweep.
- quote/success.tsx rewritten: mint 110px document circle, "Request received", exact body copy,
  "Reference: {id8}", "Back to dashboard" + "+ Request another quote".
- Dashboard parity: Quick actions now 3 tiles w/ exact titles+descs (Smart Bill Upload / Add
  another business / Meter Installation) — "View Contracts" tile REMOVED (route file kept but
  unlinked). Trust banner "Fully secured / You're completely covered / No utility contracts…".
  Expiring card full layout (count circle, pulsing dot days line, utility·supplier·biz·+N more,
  urgency title, utility chips, "View these N contracts"). Audit card full layout ("Audit in
  progress", per-row "Request a Call Now" → POST /scans/{id}/request-call, "☎ CALL REQUESTED",
  "Or call us direct on 0800 368 9822"). Nudge text "Turn on alerts so you never miss a renewal
  deadline." Promo exact copy + ANIMATED shimmer "Get Quote" pill (CtaShimmer).
- Renewals: dynamic subtitle "N contracts across M sites · K businesses" / "Nothing urgent right
  now"; empty msg "No contracts expiring within 90 days."
- New components: src/components/select-field.tsx (native tap-to-open dropdown bottom sheet),
  src/components/cta-shimmer.tsx (shimmer band). renewals.tsx entry params → propertyId/utility/contractId.

### HOME SCREEN REDESIGN (user-requested, supersedes 3-tile parity layout)
- Quick actions: 2-column grid, FOUR equal cards (Scan Bill / Add Business / Meter Installation /
  3 cards) — icon tile + title only. "View Contracts" tile REMOVED permanently per user (not in original build; do NOT re-add), NO descriptions, no truncation,
  minHeight 128, 16px padding, gap 12, 16px semibold labels wrap freely. "Try it" badge kept on Scan.
- Quote promo card: vertical layout, copy EXACTLY: "Cut your business energy costs" (19px bold) /
  "Compare quotes from trusted UK suppliers." / full-width "Get a quote" button (50px, mintIcon bg,
  CtaShimmer kept). Card padding 20, mint bg.
- Support pill: padding bumped to 16px vertical, minHeight 52.
- Verified via screenshot at 320px width: no clipped/truncated labels anywhere.

### DASHBOARD SIZING REFINEMENT (user-requested)
- Quick actions: 3 compact equal tiles in ONE row (flex:1), minHeight 100, padding 12 (10 on
  <360px), 24px icon in 36px tile, 13px semibold titles (11px on <360px so "Meter Installation"
  wraps whole-word). "View Contracts" permanently removed.
- Support pill: 46px min height, 10/14 padding, 14px medium text.
- Promo: padding 16, heading 16px bold, sub 13px muted (#065F46), full-width 42px "Get a quote"
  button (shimmer kept).
- Audit card: now shows only the FIRST audit row + "+N more bills being verified" caption
  (removes the "duplicate Request a Call Now bars" the user complained about).
- Verified via screenshots at 390px and 320px.

### TYPOGRAPHY UNIFORMITY PASS (user-requested)
- Standardised micro-typography app-wide: all uppercase kickers/section labels = Geist-Bold 11
  (type.kicker) / letterSpacing 0.6; all tiny badges = Geist-Bold 10 / letterSpacing 0.5.
- Killed fractional/one-off sizes (9, 9.5, 11.5, 12.5, 14.5 → tokens) in dashboard, quote/new,
  scan, scan review, news. Heading tracking: -0.3 at 18–24px, -0.5 at 30px+ (intentional).
- All text uses the Geist family tokens (regular/medium/semibold/bold) — no raw font names.

### BUSINESS SWITCHER REMOVED FROM HOME (parity fix, user-requested)
- Verified in original bundle: dashboard always loads "__all__" overview and has NO business
  dropdown; the switcher only exists on Sites and Reports. Removed BusinessSwitcherChip from
  dashboard.tsx and deleted the now-dead "dashboard" variant/compact styles from
  business-switcher-chip.tsx. Sites/Reports switchers unchanged and verified working.

### PROMO CARD MICRO-REFINEMENT (user-requested)
- Promo card: borderRadius 16, padding 16, head gap 12, heading→sub gap 4px, sub→button gap 15px,
  button 42px full-width #1E6B47 forest green radius 10, 14px semibold white + chevron (shimmer kept).

### EXPIRING CARD SUBTITLE FIX (user-requested)
- Meta line under "N days remaining" now = "[supplier || business] · +N more" (13px regular
  #64748B, marginTop 3, wraps — no numberOfLines). Fuel-type prefix removed (fuel pills below
  already show it). Audit row title now wraps to 2 lines instead of 1-line ellipsis.

### QUOTE WIZARD: "WHERE'S THE SUPPLY?" FLOW RESTORED (user chose deviation from web build)
- User watched their published build video and chose to KEEP the radio flow over web-bundle parity.
- "Your details" step now: Name/Email → "Where's the supply?" radios:
  1. "One of my existing sites / Pick from sites on your account." → Business dropdown ("Select a
     business", native bottom sheet) → Site dropdown ("Select a site", filtered by business) →
     "Address: …" preview
  2. "A new supply — I'll enter details / For a brand new site, or a business you haven't added
     yet." → Business name / Supply address / Postcode inputs
- Deep-link (propertyId) still shows locked "QUOTE FOR THIS SITE" card; "Change" reveals radios.
- "Is this the supply address?" card REMOVED (is_supply_address always true in payload).
- Validation: name+email + (locked || (existing: biz+site) || (new: name+address+postcode)).
- Payload/energy step/review/submit unchanged (original /quotes/multi shape kept).
- BUG FIXED during this: `/properties${bizQuery}` interpolated the FUNCTION (bizQuery is
  () => string) → garbage URL → empty sites. Now `bizQuery()`.

### BUG FIX: EMPTY "CHOOSE A SITE" SHEET (user video report)
- Root cause: wizard fetched `/properties?business_id=<globally active biz>`; picking a DIFFERENT
  business inside the wizard yielded zero matching sites → blank sheet.
- Fix: wizard now fetches ALL properties (plain /properties) since it has its own business picker.
- SelectField gained optional `emptyText` prop; site sheet shows "No sites for this business yet."
  when a business genuinely has no sites.
- Verified: active biz = Riverside globally, wizard business = Price Buddy → 3 sites listed.

### SITE DETAIL PARITY + WIZARD LOCKED CARD (user images/video)
- Site detail utility cards now match original: business-name pill next to utility label,
  SUPPLIER / ENDS (or EXPIRED) uppercase row, 12-segment expiry gauge with urgent pill
  ("OUT OF CONTRACT / RENEW NOW · N DAYS OVERDUE|LEFT" when ≤30 days), "Your tariff & rates"
  panel (FIXED/VARIABLE badge, tariff name, DAY/UNIT RATE, STANDING CHARGE, NIGHT/EVE-WKND/KVA/
  CAPACITY when present, ANNUAL USAGE, EST. ANNUAL COST computed like the original), then
  MPAN/METER SERIAL/START/END + Get Quote + Request change.
- Demo contracts now carry tariff fields (tariff_type Fixed, unit_rate_day, standing_charge,
  annual_usage, usage_unit) so the panel shows in demo mode.
- Wizard locked card: kicker now "QUOTE FOR {UTILITY}" with utility icon/colour when deep-linked
  (else "QUOTE FOR THIS SITE"), link text "Change site", address wraps 2 lines, no "Site" h3
  above it (matches original image).

### RENEWALS PAGE PARITY (user video)
- Rebuilt list to original layout: grouped BUSINESS kicker headers (only when >1 biz) → tappable
  site cards (4px urgency left-accent by worst contract, building icon, site name, business chip,
  postcode, chevron → /sites/{id}) → contract rows ("{Utility} · {Supplier}" wraps 2 lines,
  "ends {D MMM YYYY}", tiered days pill: ≤30 red overdue/left, ≤60 orange, else amber).
- Removed per-contract "Get a better deal" button (not in original; quotes live on site detail).
- Demo /renewals/urgent now enriched with business_id/business_name/postcode/contract_id.

### COMPREHENSIVE POLISH PASS (user 5-part task)
1. Dashboard audit card unified: header (scan icon + "Audit in progress" 16 semibold), body copy,
   two 36px pills [Track status → /support] [Request a call → POST /scans/{id}/request-call,
   becomes green "☎ Call requested"], 12px "Or call us direct on 0800 368 9822" tel link.
   Per-bill rows and "+N more" caption removed.
2. Renewals rows: utility name (14 semibold) + supplier (13 regular) stacked, right tiered pill
   (12 medium) + chevron, whole row taps to site. Narrow (<360px) shrinks icon/fonts so
   "Electricity" never breaks mid-word. Site names wrap 2 lines.
3. Site detail: supplier banner "British Gas · Electricity" + compact Ends badge (12px/6px pad,
   red<60d else green); "Rates & estimated cost" card; "Meter details" card (MPAN full-width,
   METER SERIAL, START DATE, CONTRACT END DATE); Get Quote solid green #1E6B47 44px bold +
   "Request Callback" outline (lock icon removed).
4. Review screen: renewing strip simplified (icon + "Electricity · British Gas" 14 bold wrap +
   "Ends in N days" compact pill; EXPIRING SOON badge/MPAN removed); KV rows 14px w/ 12px rhythm;
   wizard buttons 48px.

### SITES LIST TRUNCATION FIX (user video)
- Site name + address on Your Sites list now wrap to 2 lines (no ellipses); business-switcher
  sheet option labels wrap to 2 lines. Verified full names ("Manchester Warehouse",
  "Riverside Café — Bath/Oxford") and business filtering (Price Buddy → 3 sites only).

### WIZARD FIELD HIGHLIGHTING FIX (user video complaint)
- "Please complete the highlighted fields." previously showed with NOTHING highlighted.
- Added showErrors state (set on failed Continue, cleared on success/Back). Invalid fields now get
  red 1.5px borders: Name, Email, both supply radios (when none picked), Business/Site dropdowns
  (SelectField gained `error` prop), Business name/Supply address/Postcode inputs, meter supplier
  free-text input, contract-end dropdown, water/telecoms supplier inputs.
- Verified via screenshot: blank Name + new-supply fields all outlined red with the message.

### POSTCODE VALIDATION + SUCCESS COPY (user task, video)
- UK postcode regex /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i on wizard "new supply" Postcode:
  auto-uppercase, inline error "Please enter a valid UK postcode (e.g. SW1A 1AA)" + red border,
  Continue DISABLED (opacity .45) until business name + address + valid postcode present.
- MPAN/MPRN helper (12px muted) added under the field: "Providing your MPAN / MPRN speeds up your
  quote. If left blank, our team will look this up from your address."
- quote/success.tsx rewritten: "Request received" (22 bold) + "Thanks {firstName}, we've received
  your quote request." + "What happens next:" white card with 🔍/📞/✉️ points (NO "broker" wording)
  + grey "REFERENCE: XXXXXXXX" badge + 48px "Back to dashboard" + "Request another quote" link.

### SHIMMER SPEED + ENERGY STEP POLISH (user videos, testing_agent iteration_15 PASS)
- CtaShimmer slowed: 2200ms sweep + 2400ms pause (full loop ≈ 4.6s) — verified by measurement.
- Energy details step: chips gap 8 / padding 14x9 (no truncation for all 10 suppliers), meter cards
  16px padding, Gas group separated from Electric by divider + 22px top padding, verified at
  320px & 390px. Full quote flow regression + live submission passed (ref 0803B392).
