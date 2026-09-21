# Price Buddy — Mobile App ↔ Backend API Contract (Handover Note)

**Purpose:** This is the exact list of API endpoints the **Price Buddy mobile app** calls on the
backend. If you are adding the new features (Quote Follow-Up Tracker, Document Centre), please keep
**every endpoint below working with the same path, method and response shape**. You may **add** new
endpoints freely — just do not rename, remove or change the shape of the existing ones, or the app
will break.

## Connection basics
- **Base URL:** the app calls `https://utility-contract-hub.emergent.host` and prefixes every path
  with **`/api`**. (In the app this is the env var `EXPO_PUBLIC_UCH_BACKEND_URL`.)
  So e.g. `/login` below means `POST https://utility-contract-hub.emergent.host/api/login`.
- **Auth:** token-based. `POST /login` and `POST /register` return `{ token, user }`. The app stores
  the token securely and sends it as a **Bearer token** on all authenticated requests.
- **Responses:** JSON. Keep field names exactly as the app reads them (listed below).

---

## 1. Authentication & account
| Method | Path | Auth | Body / notes | App expects back |
|---|---|---|---|---|
| POST | `/login` | no | `{ email, password }` (email lower-cased/trimmed) | `{ token, user }` |
| POST | `/register` | no | `{ email, password, full_name?, company_name?, business_type? }` | `{ token, user }` |
| GET | `/me` | yes | — | user profile incl. `full_name, email, company_name, email_notifications_enabled, push_notifications_enabled` |
| PUT | `/me/preferences` | yes | any of `{ email_notifications_enabled, push_notifications_enabled, has_completed_tour }` | updated prefs |
| POST | `/auth/forgot-password` | no | `{ email }` | success |
| POST | `/auth/reset-password` | no | `{ token, password }` (field names per reset screen) | success |
| POST | `/auth/confirm-device` | no | `{ token }` | `{ token }` |

## 2. Businesses & sites (properties)
| Method | Path | Auth | Body / notes | App expects back |
|---|---|---|---|---|
| GET | `/businesses` | yes | — | list incl. `id, company_name, site_count` |
| POST | `/businesses` | yes | `{ business_type, company_name, company_number, trading_name, vat_number, charity_number, postcode }` | created business |
| GET | `/properties` | yes | optional `?business_id=…` filter (app appends a query) | list of sites incl. `id, property_name, address, postcode, business_id, business_name` |
| POST | `/properties` | yes | `{ business_id, property_name, address, postcode, primary_meter_type }` | created site |
| GET | `/properties/{id}/utilities` | yes | — | `{ property, utilities }` where `utilities` is keyed by `electricity/gas/water/broadband/telecoms`, each with supplier, meter point (MPAN/MPRN), serial, rates, `start_date`, `end_date`, `days_until_expiry`, `renewable_now`, etc. |

## 3. Dashboard, renewals & reports
| Method | Path | Auth | Notes | App expects back |
|---|---|---|---|---|
| GET | `/dashboard/overview` | yes | — | `{ all_contracts (array), contracts, urgency_summary, expiring_contracts }` — app uses `all_contracts.length` as the total contract count |
| GET | `/renewals/urgent` | yes | — | `{ items: [...] }` each with `days_until_expiry`, supplier, utility, business, postcode |
| GET | `/reports/spend` | yes | optional `?business_id=…` | `{ total_annual_spend, by_utility[], by_site[], contracts[] }` |

## 4. Quotes (customer *request* flow — DO NOT CHANGE)
| Method | Path | Auth | Body | App expects back |
|---|---|---|---|---|
| POST | `/quotes/multi` | yes | `{ selected_services[], contact, address, energy_meters[], water_supplier, telecoms_supplier }` | `{ quote_request_id }` |
| GET | `/contracts/{id}` | yes | — | single contract (used to pre-fill the quote wizard) |

> Note for new work: this is the **customer-initiated quote request**. The new **Quote Follow-Up
> Tracker** keys off the **outbound comparison PDF you email**, which is a *different, back-office*
> event — please add new endpoints/tables for it rather than altering `/quotes/multi`.

## 5. Bill scanning & files
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/scans` | yes | **multipart/form-data** upload (images or a single PDF, ≤12 MB, multi-page). Long timeout (~120s). |
| GET | `/scans/{id}` | yes | scan status/extracted fields |
| POST | `/scans/{id}/confirm` | yes | body includes `supplier_name, supply_address, postcode, mpan_or_mprn, meter_serial_number, account_number, contract_start_date, contract_end_date, utility_type, annual_usage_kwh, property_id/property_name, legal_entity_name, action` |
| POST | `/scans/{id}/request-call` | yes | request a callback about a bill audit |
| GET | `/my/audits-in-progress` | yes | list of in-progress bill audits (app reads `status`, `call_requested_at`) |

## 6. Support, callbacks & change requests
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/concierge/messages` | yes | `{ message }` — the app **sends** a concierge message. (The app does not fetch a history feed.) |
| POST | `/change-requests` | yes | `{ request_type, message, contract_id?, property_id? }` — used for callbacks, contract-change requests **and** account-deletion requests (`request_type: "account_deletion"`) |
| POST | `/meter-installs` | yes | `{ business_id, install_type, fuel, notes, preferred_contact, best_time }` |

## 7. Content & public/tokenised links
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/news` | no | news/updates feed |
| GET | `/share/{token}` | no | public share link |
| GET | `/onboarding/{token}` | no | tokenised onboarding link |
| POST | `/onboarding/{token}/upload-bill` | no | multipart bill upload during onboarding |
| POST | `/onboarding/{token}/request-callback` | no | `{ name, phone }` |

---

## Golden rules for the new work
1. **Keep all of the above unchanged** (path, method, request body keys, response field names).
2. **Add** new endpoints for the Quote Follow-Up Tracker and Document Centre — don't repurpose existing ones.
3. The **Document Centre** can reuse the same file-upload/storage mechanism the `/scans` upload already uses.
4. **Confirm which backend is the live/current one** (this app talks to `utility-contract-hub.emergent.host`) and build against that version.
5. Respect the product rules: no email-open/pixel/PDF-download tracking, no in-app supplier comparison in v1, and a customer tap is never a binding contract.

---

## Plain-English glossary (what each endpoint does, in business terms)

**Signing in & accounts**
- `POST /login` — Customer signs in with email + password; gives back a login token.
- `POST /register` — Customer creates a new account (and optionally their company + business type).
- `GET /me` — Fetches the signed-in customer's profile (name, email, company, alert preferences).
- `PUT /me/preferences` — Saves the customer's choices: email alerts on/off, push on/off, and whether they've finished the intro tour.
- `POST /auth/forgot-password` — Customer asks for a password-reset email.
- `POST /auth/reset-password` — Customer sets a new password using the link/token from that email.
- `POST /auth/confirm-device` — Confirms a new device/login using a one-time code.

**Their businesses & sites**
- `GET /businesses` — Lists the companies the customer manages (with how many sites each has).
- `POST /businesses` — Adds a new company (name, company number, VAT/charity number, postcode, type).
- `GET /properties` — Lists the customer's sites/locations (optionally just for one business).
- `POST /properties` — Adds a new site (name, address, postcode, main meter type).
- `GET /properties/{id}/utilities` — Opens one site and shows its electricity, gas, water, broadband and telecoms details: supplier, meter numbers (MPAN/MPRN), rates, and contract end dates.

**The home screen & reports**
- `GET /dashboard/overview` — The big-picture summary: all their contracts, which are expiring, etc. (The app counts these to decide what the home screen shows.)
- `GET /renewals/urgent` — The list of contracts coming up for renewal soon (drives the "contracts ending soon" alert).
- `GET /reports/spend` — Their estimated annual spend, broken down by utility and by site.

**Getting a quote (unchanged in v1)**
- `POST /quotes/multi` — Customer submits a *request* for a quote (which utilities, their meters/suppliers, contact and address). ⚠️ This is the customer asking us for a quote — it is **not** the comparison PDF we email out afterwards.
- `GET /contracts/{id}` — Pulls an existing contract's details to pre-fill the quote form.

**Scanning & checking bills**
- `POST /scans` — Customer uploads a bill (photo(s) or a PDF) for us to read.
- `GET /scans/{id}` — Checks the status of an uploaded bill and the details we pulled from it.
- `POST /scans/{id}/confirm` — Customer confirms the details we extracted (supplier, meter number, dates, usage, which site it belongs to).
- `POST /scans/{id}/request-call` — Customer asks us to call them about a bill we're checking.
- `GET /my/audits-in-progress` — Shows any bill checks we're currently working on for them.

**Talking to us / asking for help**
- `POST /concierge/messages` — Customer sends us a message from the in-app chat.
- `POST /change-requests` — Customer asks for something: a callback, a change to a contract, or to delete their account.
- `POST /meter-installs` — Customer requests a new/updated meter installation (type, fuel, notes, best time to contact).

**News & invite/onboarding links (no login needed)**
- `GET /news` — Loads news/updates shown in the app.
- `GET /share/{token}` — Opens a shared link (e.g. something we've shared with them).
- `GET /onboarding/{token}` — Opens a personalised set-up link we've emailed a new customer.
- `POST /onboarding/{token}/upload-bill` — Lets a new customer upload a bill from that link before they even have an account.
- `POST /onboarding/{token}/request-callback` — Lets a new customer ask us to call them back (name + phone).

