# Price Buddy — Documents & In-App Signing Prototype (Handover)

> **Status: PROTOTYPE. Not production-ready.** The backend, real PDF viewer,
> file storage, notifications/emails and supplier-acceptance are **not** built
> here and must be implemented and security-reviewed separately.

## 1. What was built in this Emergent frontend project
A customer-facing document hub + in-app signing journey, wired to a **clearly
separated mock adapter** (dev-only). The customer flow is real; all backend
behaviour is honestly **simulated** and labelled "Demo signing — not a live
signed document".

Journey: **Home → My Documents → Review & sign → submit → processing → completed**.

## 2. New / changed files
**New (feature, portable):**
- `src/features/documents/types.ts` — shared types + **coordinate convention** (see §6).
- `src/features/documents/config.ts` — mock-mode switch (explicit; off by default in prod).
- `src/features/documents/service.ts` — `documentSigningService` adapter (+ `generateIdempotencyKey`).
- `src/features/documents/mock-adapter.ts` — dev-only honest backend simulation.
- `src/features/documents/fixtures.ts` — synthetic documents, requests, field defs, audit fixture.
- `src/features/documents/DocumentPageCanvas.tsx` — **swappable** page renderer (image/synthetic).
- `src/features/documents/SignaturePad.tsx` — signature capture (svg + PanResponder).
- `app/documents/index.tsx` — My Documents list + filters + states.
- `app/documents/[id]/review.tsx` — review/sign screen (overlays, progress, declaration, submit, terminal + retryable error handling).
- `app/documents/[id]/status.tsx` — processing + needs_attention (retry-processing) + completed + audit viewer.
- `app/documents/[id]/view.tsx` — **view-only** read-only document viewer (no signing UI).

**Demo scenarios in the list (mock fixtures — see `fixtures.ts`):** happy-path LOA,
view-only quote, multi-page (3-page) supplier contract, completed LOA, plain expired,
plain cancelled, processing-fails-then-recovers, lost-response, cancelled-while-open,
expires-while-open, superseded-version, and unauthorized. Mock behaviour is driven by
`MOCK_SUBMIT_OVERRIDE` (cancelled/expired/superseded/lost_response on submit) and
`MOCK_PROCESSING_BEHAVIOR` (fail_then_recover) in `fixtures.ts`.

**Changed (minimal, isolated):**
- `app/(tabs)/dashboard.tsx` — added the **My Documents** card (below Quick Actions,
  above the chat banner) + its styles. No other Home cards touched. **No nav/tab changes.**

## 3. Dependencies
No new runtime dependency was added. Signature capture reuses **`react-native-svg`**
(already in the project, MIT) + React Native core `PanResponder`. The page renderer uses
`expo-image` (already present). All maintained, permissively licensed (MIT/Expo).

## 4. Mock mode
- Toggle: `EXPO_PUBLIC_DOC_SIGNING_MOCK` = `"true"` | `"false"`. If unset, defaults to
  **on in development, off in production** (`__DEV__`).
- If mock is **off** and no API base is configured → `assertUsableConfig()` throws a clear
  error (no silent fallback to mock).
- Every signing surface shows a visible **"Demo signing — not a live signed document"** banner;
  completed files + audit are labelled **simulated / demo fixture**.

## 5. Proposed API contract (for the separate backend)
All authenticated via the existing Bearer token; backend MUST enforce ownership + signer
permissions (frontend filtering/hidden buttons are **not** authorization).

| Method | Path | Purpose | Returns |
|---|---|---|---|
| GET | `/documents` | List customer documents | `DocumentSummary[]` |
| GET | `/documents/{id}/view` | Get a **view-only** document (no signing workflow) | `ViewOnlyDocument` |
| GET | `/signing-requests/{id}` | Get request + immutable version + field defs | `SigningRequest` |
| GET | (file) original PDF | Authenticated/short-lived URL to the exact version | PDF bytes |
| POST | `/signing-requests/{id}/first-open` | Record first open (dedup server-side) | `{recorded,duplicate}` |
| POST | `/signing-requests/{id}/submit` | Submit values+signature+declaration (idempotent) | `SubmissionAck{status:"processing"}` |
| GET | `/signing-requests/{id}/status` | Poll processing/completion/needs_attention | `CompletionStatus` |
| POST | `/signing-requests/{id}/retry-processing` | Re-run final PDF/audit generation for an **already-accepted** submission. MUST NOT create a new submission or require re-signing | `CompletionStatus{status:"processing"}` |
| GET | (file) signed PDF / audit / combined | Authenticated/short-lived URLs | PDF bytes |
| GET | `/signing-requests/{id}/audit` | Structured audit (prototype shows synthetic) | audit record |

Schemas are the exported TypeScript types in `types.ts` (single source of truth). Key rules:
- **Versioning:** `documentVersion` is immutable; `submit` must reject a mismatched/superseded version.
- **Idempotency:** client sends `idempotencyKey`; backend must dedupe so a retry never double-signs.
- **Status:** `submit` returns `processing` only. **Completed** is set by the backend **only after**
  the signed PDF **and** audit record are stored. Never from a button tap / local state.
- **Timestamps:** store UTC; the authoritative signing time comes from the backend. The app displays
  Europe/London with an explicit GMT/BST label.
- **Expiry/cancellation:** backend returns the rejection; the app disables signing and shows it.
- **Errors:** `unauthorized`, `not_found`, `expired`, `cancelled`, `superseded`, plus network/auth-expiry.

## 6. Coordinate convention (must match backend exactly)
Documented in detail at the top of `types.ts`. Summary:
- Page indexing **1-based**; origin **top-left** of the **rotation-corrected displayed page**.
- `rect {x,y,w,h}` are **normalised floats [0..1]** of displayed page width/height.
- Backend sends each page's `widthPt`,`heightPt` (PDF points) and `rotation` (0/90/180/270).
- Backend converts normalised → PDF user-space points on the unrotated page (inverse rotation) to
  burn values into the final PDF.
- ⚠️ **Prototype overlay alignment does NOT prove final PDF signature placement** — that needs
  real-backend integration testing against the actual PDF.

## 7. Signature output format (for backend embedding)
`SignaturePad` outputs an **SVG data URI** `data:image/svg+xml;utf8,<svg viewBox="0 0 320 180">…</svg>`
(capture box 320×180 px). Backend should rasterise/scale the vector into the signature field rect
(or request PNG output in production). Signatures are **in-memory only** (never localStorage) and
must be **applied explicitly to each signature field** (no silent reuse across fields/documents).

## 8. Real-PDF-viewer integration (frontend requirement)
`DocumentPageCanvas` is isolated from signing logic. To swap in a real viewer:
1. Replace the synthetic page body with a real page render (e.g. `react-native-pdf` in a dev/prod
   build, or pdf.js). Keep the **same props** (`pageSpec`, `displayWidth`, `children`) and the
   overlay layer (`children`) rendered on top in the same box.
2. Keep `pageDisplaySize()` returning the displayed page box so overlays stay aligned on
   zoom/resize/rotation/different page sizes.
3. Load the exact PDF **version** bytes from the authenticated backend URL.
No change to the signing workflow, field definitions, adapter or submission is required.

## 9. Backend implementation checklist (build in the SEPARATE project — not here)
Admin upload to customer record · intended signatory selection · PDF field placement + preview +
reusable templates · **immutable document versions** · request cancel/expiry · **server-side
authorization + validation of all fields/permissions** · original-PDF preservation · submission
persistence + **idempotency** · **server-generated timestamps (UTC)** · retryable PDF processing ·
final signed-PDF generation · **audit-event storage + audit-PDF generation from real events** ·
private file storage + authenticated/short-lived access (no permanent public links) · backups +
overwrite protection · **first-open** and **completed** notifications + staff emails (dedup, retries,
failed-delivery visibility) · recovery for failed processing (don't force re-sign if already stored) ·
**separate signing vs supplier-acceptance statuses**. Hash original PDF **before** building the audit
record that references it (avoid self-referential hashes).

Do **not** claim independently-certified signing, qualified timestamps, verified identity or DocuSign
certification. Record "Opened", not "Read". IP is supporting metadata, not proof of identity.
Supplier acceptance of the custom signing output must be confirmed outside this prototype.

## 10. Staff notifications (backend responsibility)
- **First open:** the frontend calls `POST /signing-requests/{id}/first-open` **only after** the exact
  PDF renders in the authenticated review screen (not from opening the list/notification/email link,
  not on render failure). Backend **dedupes** (one alert per request). Tracking failure must not block
  review; safe retry allowed while in-app.
- **Completed:** backend-only, after final files are saved. The frontend never sends emails.
- Payloads: business name, document title/ref, signer name, event timestamp, secure admin link,
  configurable recipients, persistent jobs, retries + dedupe, failed-delivery visibility.

## 11. Developer handover (integrating with his own Documents section)
- Signing screens accept a **signing-request ID** and load everything via the adapter. He can open
  `/documents/[id]/review` and `/documents/[id]/status` from **his** Documents section or an
  authenticated direct route — **without** importing this prototype's `app/documents/index.tsx` hub.
- Keep separated: (a) prototype **My Documents** hub + Home card, (b) reusable **signing
  screens/components** (`review`, `status`, `SignaturePad`, `DocumentPageCanvas`), (c) **adapter +
  types** (`src/features/documents/service.ts`,`types.ts`), (d) **mock-only** code
  (`mock-adapter.ts`,`fixtures.ts`,`config.ts`).
- Do **not** overwrite his app with this prototype; port the pieces he needs.
- Configurable backend URL via env; **no hard-coded Emergent domains**, no frontend secrets/keys,
  no Emergent-specific production runtime dependency.

## 12. Run locally (outside Emergent)
`cd frontend && yarn install && EXPO_PUBLIC_DOC_SIGNING_MOCK=true yarn start` → open in Expo Go or
a dev build. Set `EXPO_PUBLIC_DOC_SIGNING_MOCK=false` and configure the API base to use a real backend.

## 13. Tested vs simulated vs outstanding
**Tested frontend behaviour (web preview — automated + screenshot, NOT yet on a
physical iPhone/Android):** Home card placement + navigation; My Documents list +
filters (needs-signature / completed) + loading/empty/error/retry; **view-only
document** (read-only multi-page viewer, no signing UI, no "not found"); LOA signing
journey incl. touch/mouse signature capture, empty-signature rejection, prefilled
fields, required-field progress ("X of N"), declaration gating, submit; **multi-page
(3-page) supplier contract** — review every page, acknowledgement on p1, name/initials/
two signatures on p3, submit blocked until all required fields + declaration;
processing → completed; **processing failure (needs_attention) with safe
"Try to finish processing" recovery that never re-signs**; **lost-response retry**
(same idempotency key, no duplicate submission) + repeated-tap guard; **terminal
rejections while the screen is open** — cancelled, expired, superseded (full-screen
"Signing unavailable"); **plain cancelled / expired** routed to the status screen;
**unauthorized** load error; completed screen + demo audit viewer; demo banners +
simulated labels.
**Simulated backend behaviour (mock only — `mock-adapter.ts`):** submission
acceptance, processing→completion timing (~4s), fail-then-recover (~2.5s), first-open
dedup, cancelled/expired/superseded/unauthorized rejections, lost-response then
idempotent retry, signed-PDF & audit files, view-only document content.
**NOT tested on real iPhone/Android devices yet** (Expo Go / dev build): native touch
signature smoothness, keyboard behaviour in the field editor, safe-area on notched
devices. These should be verified on-device before handover sign-off.
**Outstanding REAL integration tests (NOT proven — require the real backend + a
developer/security review):** real PDF rendering + overlay-to-PDF placement; server
timestamps; authenticated file access; **closing-app recovery / resuming after kill**;
**staff email + real notifications delivery**; duplicate-protection under real network
loss; auth-expiry mid-session; supplier acceptance of the signed output. First-open
and completed notifications are **backend work** and are only simulated here.

---
# 14. Handover addendum (test results, on-device checklist, scope)

## 14.1 Scope confirmation
- **Quote History** and **Default Business** are **NOT implemented** — suggested future work only. No code was written for either. The only files touched for this signing work are listed in §2 plus `src/components/icon.tsx` (added `warning`, `eye` icons) and `app/(tabs)/dashboard.tsx` (the My Documents card). `app/signin.tsx` is an UNRELATED Login-Autofill change tracked separately and NOT part of this feature.
- **Nothing was deployed/published.** Integration & deployment are the client developer's responsibility in their own app.

## 14.2 The 12 tested scenarios and results (ALL PASS)
Tested with the automated testing agent (report: `/app/test_reports/iteration_26.json`).
1. View-only quote (`doc_q_01`) — read-only 2-page viewer, View-only badge, note, NO signing UI, no "not found". **PASS**
2. Cancelled (plain, `doc_sc_cancel`) — status screen "This request is cancelled" + Back. **PASS**
3. Cancelled while open (`doc_loa_cancel_live`) — submit → full-screen "Signing unavailable" + back. **PASS**
4. Multi-page supplier (`doc_sc_01`) — pages 1/2/3, "5 of 5 fields", submit gated on fields + declaration, submit → processing → completed. **PASS**
5. Processing fail + recovery (`doc_loa_fail`) — needs_attention "you don't need to sign again"; retry-processing → completed without re-signing. **PASS**
6. Lost response + repeated taps (`doc_loa_lost`) — first tap inline error + button→"Try again" + double-tap blocked; retry → completed (same idempotency key). **PASS**
7. Expired (plain, `doc_loa_exp`) — status "This request is expired" + Back. **PASS**
8. Expires while open (`doc_loa_exp_live`) — submit → terminal "Signing unavailable". **PASS**
9. Superseded version (`doc_superseded`) — submit → terminal "document was updated / reopen latest". **PASS**
10. Unauthorized (`doc_unauth`) — review load error "not authorised" + Try again. **PASS**
11. Happy-path LOA (`doc_loa_01`) — sign → processing → completed + "Simulated — demo fixture"; audit modal (DEMO FIXTURE). **PASS**
12. Filters — "Needs signature" / "Completed" chips filter correctly. **PASS**

## 14.3 These were WEB-PREVIEW tests ONLY
All 12 results above were produced on the **web preview** (React Native Web, mobile viewport). They were **NOT** run on a physical iPhone or Android device. On-device behaviour (native touch signature, keyboard, safe-area, app background/kill) is UNVERIFIED and must be checked with §14.4 before handover sign-off.

## 14.4 iPhone / Android manual test checklist
Open in Expo Go (scan the QR) or a dev build. For each step: note Pass/Fail and attach a screen recording if it fails.
Report failures as: **Scenario # → step # → device/OS version → expected vs actual → screen recording**.

A. List & navigation
  1. Open the app → Home → tap the **My Documents** card. **Expect:** list opens with the yellow "Demo signing" banner and 12 rows.
  2. Tap the **Needs signature** then **Completed** filter chips. **Expect:** list filters; chips highlight.

B. View-only (must NOT record a signing event)
  3. Tap "Quote — Electricity renewal options" (View only). **Expect:** read-only viewer, 2 pages, "View only" badge, note line, NO fields, NO declaration, NO "Sign and submit".
  4. Tap back. **Expect:** returns to list, no errors.

C. Happy-path LOA
  5. Tap "Letter of Authority — Electricity". **Expect:** review screen, "Page 1 of 1", "0 of 4 fields completed".
  6. Tap each dashed field → fill name/job title/email (keyboard appears, text saves), then the signature field → **draw with your finger** → Apply. **Expect:** boxes turn green; "4 of 4".
  7. Tick the declaration checkbox; tap **Sign and submit**. **Expect:** processing spinner → "Document signed successfully" + "Simulated — demo fixture".
  8. Tap **View signing audit record**. **Expect:** demo audit modal labelled DEMO FIXTURE.

D. Multi-page contract
  9. Tap "Supplier Contract — British Gas (3-year)". Scroll. **Expect:** pages 1,2,3 render; "0 of 5".
  10. Try **Sign and submit** before completing. **Expect:** disabled/greyed.
  11. Acknowledge on page 1, complete name/initials/two signatures on page 3, tick declaration, submit. **Expect:** processing → completed.

E. Safe recovery
  12. Tap "…Gas (demo: processing fails)", complete + submit. **Expect:** processing → "We need a moment to finish" + "you don't need to sign again" + **Try to finish processing**.
  13. Tap **Try to finish processing** (do NOT re-sign). **Expect:** processing → "Document signed successfully".
  14. Tap "…EV charging (demo: lost response)", complete + submit. **Expect:** inline red error, button becomes **Try again**. Tap again. **Expect:** completed. Rapid double-tap must not double-submit.

F. Terminal states
  15. "…Broadband (demo: cancelled while open)" → complete + submit. **Expect:** full-screen "Signing unavailable" (cancelled) + Back.
  16. "…Waste (demo: expires while open)" → complete + submit. **Expect:** "Signing unavailable" (expired).
  17. "…Electricity (demo: updated version)" → complete + submit. **Expect:** "Signing unavailable" (reopen latest version).
  18. "…(demo: not your document)". **Expect:** "Couldn't open document" + not-authorised + Try again.
  19. "Letter of Authority — Telecoms" (Expired) and "Supplier Contract — EDF (cancelled)". **Expect:** status screen explains expired/cancelled + Back.

G. First-open behaviour (see §14.6 — no visible UI; confirm indirectly)
  20. Open then leave and re-open the same review screen a few times. **Expect:** no crashes/duplicate dialogs (the dedup is internal).
  21. Open the unauthorized doc. **Expect:** error screen only — a failed load must not be treated as an "open".

## 14.5 View-only must never record a signing event (intended behaviour)
`app/documents/[id]/view.tsx` calls **only** `documentSigningService.getViewDocument(id)`. It does **not** call `recordFirstOpen` or any signing-request endpoint. A view-only quote/bill therefore **cannot** generate a first-open or signing event. When the real backend is built, `GET /documents/{id}/view` MUST be a plain read endpoint with no side effects (no event emission, no staff alert).

## 14.6 First-open tracking — what was and wasn't verified
- **Design (enforced in code):** `review.tsx` calls `recordFirstOpen` **once**, inside a `useEffect` that runs **only** when the signing request has loaded successfully AND is not terminal AND there was no load error (`req && !terminal && !loadError`), guarded by a `firstOpenDone` ref. The mock adapter additionally de-dupes via an in-session `Set` and returns `{duplicate:true}` on repeats. A failed PDF/request load leaves `req === null`, so the effect never fires → **no first-open on failed load**. Terminal (expired/cancelled) loads also do not record.
- **Verification status:** this is **verified by code logic / inspection**, NOT by an observable UI assertion — first-open has no on-screen output, so the automated web test could not count the events directly. If you want observable proof, I can add a temporary dev-only log or a debug badge. **Real staff emails and notifications remain backend work and were NOT tested.**

## 14.7 New API endpoints (request/response shapes)
Types are the single source of truth in `src/features/documents/types.ts`.
- `GET /documents/{id}/view` → `ViewOnlyDocument` `{ id, title, type, businessName, siteLabel?, dateIssued, pageCount, pages: DocumentPage[], note? }`. **No side effects.**
- `POST /signing-requests/{id}/retry-processing` → `CompletionStatus` with `status:"processing"`. MUST operate on the EXISTING accepted submission only — **never** create a new submission and **never** require re-signing. Idempotent; safe to call repeatedly.

## 14.8 What was NOT verified (do not claim as proven)
Production PDF signature placement, secure backend authorization, real server timestamps, real email/notification delivery, and closing-app / resume-after-kill recovery were **NOT** verified — the mock cannot prove any of these. They require the real backend and a security review.
