# 👋 START HERE — Price Buddy Mobile Signing Prototype

This is the **customer-facing mobile document-signing prototype** (Expo / React Native).
It is a **frontend prototype**: all backend behaviour is currently **simulated with mock data**.

---

## 1. Read this first (the full guide)
**`docs/DOCUMENT_SIGNING_PROTOTYPE.md`** — especially **Section 17 "Final Developer Handover
Package"** (it is the authoritative reference). It contains:
- The complete list of screens & components
- The normalized coordinate convention (page_number, x_percent, y_percent, width_percent, height_percent)
- All supported field types (signature, full_name, job_title, email, telephone, initials,
  date_signed, checkbox, and bank details: sort_code, account_number)
- The complete API contract: endpoints, JSON schemas, payloads and error codes
- How to turn OFF the mock and connect the real backend
- How to swap the image viewer for a real PDF viewer

---

## 2. Where the feature code lives

**The engine — `frontend/src/features/documents/`**
| File | What it is |
|---|---|
| `types.ts` | Shared data/API contract — **single source of truth** |
| `service.ts` | The ONLY place that talks to the backend |
| `config.ts` | Mock on/off switch |
| `DocumentPageCanvas.tsx` | Page viewer — **replace with a real PDF viewer** (keep the same props) |
| `SignaturePad.tsx` | Finger-signature capture (multi-stroke, rejects empty) |
| `mock-adapter.ts`, `fixtures.ts`, `debug.ts` | **DELETE for production** — fake data / dev-testing only |

**The screens — `frontend/app/documents/`**
| File | Route | What it is |
|---|---|---|
| `index.tsx` | `/documents` | Documents list |
| `[id]/review.tsx` | `/documents/{signingRequestId}/review` | Guided review & sign screen |
| `[id]/status.tsx` | `/documents/{signingRequestId}/status` | Processing / completed / recovery |
| `[id]/view.tsx` | `/documents/{documentId}/view` | Read-only viewer (no signing) |

> Note: there are TWO kinds of ID. The signing screens (`/review`, `/status`) and all
> `/signing-requests/*` endpoints use the **signingRequestId**. The read-only viewer and
> `/documents/{id}/view` use the **documentId**. See doc Section 15.

---

## 3. What was built / fixed (frontend only)
- My Documents list → review & sign → submit → processing → completed, plus a read-only viewer.
- **Guided step-by-step signing:** required fields must be completed in order; auto-scroll to the
  next field across pages; clear CURRENT (brand, pulsing) / PENDING (amber dashed) / COMPLETED
  (green) field states; final declaration + "Sign and submit" stay locked until all fields are done.
- **Signature pad:** multi-stroke finger drawing that persists across gestures; a tap/empty canvas
  can never mark a field complete; the drawn signature shows inside the green box.
- **Edge cases handled:** cancelled, expired, superseded (updated version), unauthorized,
  processing-failure with **safe retry** (never re-signs), and lost-response retry (no double-sign).
- **First-open tracking** fires only AFTER the first page actually displays (not on metadata load),
  is de-duplicated, and is never recorded on a failed load. (Real staff emails/alerts are backend work.)

---

## 4. Going live (important)
Everything backend-related is **mocked** right now.
1. Set env `EXPO_PUBLIC_DOC_SIGNING_MOCK=false`.
2. Point the API base at the real backend (see doc Section 17.6). `service.ts` already calls the
   real endpoints when the mock is off — no rewrite needed.
3. **Delete** `mock-adapter.ts`, `fixtures.ts`, `debug.ts` and the `__DEV__` dev badge in `review.tsx`.
4. Replace `DocumentPageCanvas` with a real PDF viewer (doc Section 17.7), keeping the same props.

The **backend, real PDF rendering/placement, file storage, notifications/emails, timestamps and
supplier acceptance are NOT built here** and must be implemented and security-reviewed separately.

---

## 5. Run the frontend locally
```
cd frontend
yarn install
EXPO_PUBLIC_DOC_SIGNING_MOCK=true yarn start   # mock mode, to explore the prototype
```

Questions about the contract? Everything is in **`docs/DOCUMENT_SIGNING_PROTOTYPE.md` (Section 17)**.
