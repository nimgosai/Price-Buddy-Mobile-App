import type {
  CompletionStatus,
  DocumentSummary,
  FieldDefinition,
  Signer,
  SigningRequest,
  ViewOnlyDocument,
} from "./types";

const A4 = { widthPt: 595, heightPt: 842, rotation: 0 as const, imageUri: null };
const page = (p: number) => ({ page: p, ...A4 });

const SIGNER: Signer = { id: "signer_1", name: "Anne Baker", role: "Director", email: "anne@acmebakery.co.uk" };

export const DECLARATION = {
  version: "v1",
  text: "I have reviewed this document and intend to sign it.",
};

/** Standard single-page LOA field set (reused by several demo scenarios). */
function loaFields(): FieldDefinition[] {
  return [
    { id: "f_name", page: 1, type: "full_name", label: "Confirm full name", required: true, signerId: "signer_1", rect: { x: 0.1, y: 0.5, w: 0.52, h: 0.05 }, prefill: "Anne Baker" },
    { id: "f_title", page: 1, type: "job_title", label: "Enter job title", required: true, signerId: "signer_1", rect: { x: 0.1, y: 0.57, w: 0.52, h: 0.05 }, prefill: "Director" },
    { id: "f_email", page: 1, type: "email", label: "Confirm email", required: true, signerId: "signer_1", rect: { x: 0.1, y: 0.64, w: 0.6, h: 0.05 }, prefill: "anne@acmebakery.co.uk" },
    { id: "f_sign", page: 1, type: "signature", label: "Tap to sign", required: true, signerId: "signer_1", rect: { x: 0.1, y: 0.74, w: 0.45, h: 0.1 } },
    { id: "f_date", page: 1, type: "date_signed", label: "Date signed", required: true, signerId: "signer_1", rect: { x: 0.62, y: 0.74, w: 0.28, h: 0.05 }, readOnly: true },
  ];
}

/** Build a single-page awaiting-signature LOA request. */
function loaRequest(id: string, documentId: string, version: string): SigningRequest {
  return {
    signingRequestId: id,
    documentId,
    documentVersion: version,
    title: "Letter of Authority — Electricity",
    businessName: "Acme Bakery Ltd",
    companyNumber: "01234567",
    signer: SIGNER,
    status: "awaiting_signature",
    pageCount: 1,
    pages: [page(1)],
    declaration: DECLARATION,
    expiresAt: "2026-12-31T23:59:59Z",
    fields: loaFields(),
  };
}

/** Documents shown in the My Documents list. */
export const MOCK_DOCUMENTS: DocumentSummary[] = [
  {
    id: "doc_loa_01",
    signingRequestId: "sr_loa_01",
    title: "Letter of Authority — Electricity",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Head Office — Manchester",
    dateIssued: "2026-09-18T09:00:00Z",
    status: "awaiting_signature",
  },
  {
    id: "doc_sc_01",
    signingRequestId: "sr_sc_01",
    title: "Supplier Contract — British Gas (3-year)",
    type: "supplier_contract",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Unit 4 — Leeds",
    dateIssued: "2026-09-20T14:30:00Z",
    status: "awaiting_signature",
  },
  {
    id: "doc_q_01",
    signingRequestId: null,
    title: "Quote — Electricity renewal options",
    type: "quote",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Head Office — Manchester",
    dateIssued: "2026-09-15T11:00:00Z",
    status: "available",
  },
  {
    id: "doc_loa_done",
    signingRequestId: "sr_loa_done",
    title: "Letter of Authority — Water",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Head Office — Manchester",
    dateIssued: "2026-08-01T10:00:00Z",
    status: "completed",
  },
  {
    id: "doc_loa_exp",
    signingRequestId: "sr_loa_exp",
    title: "Letter of Authority — Telecoms",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Unit 4 — Leeds",
    dateIssued: "2026-06-01T10:00:00Z",
    status: "expired",
  },
  {
    id: "doc_sc_cancel",
    signingRequestId: "sr_sc_cancel",
    title: "Supplier Contract — EDF (cancelled)",
    type: "supplier_contract",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Unit 4 — Leeds",
    dateIssued: "2026-09-10T09:00:00Z",
    status: "cancelled",
  },
  {
    id: "doc_loa_fail",
    signingRequestId: "sr_loa_fail",
    title: "Letter of Authority — Gas (demo: processing fails)",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Head Office — Manchester",
    dateIssued: "2026-09-22T09:00:00Z",
    status: "awaiting_signature",
  },
  {
    id: "doc_loa_lost",
    signingRequestId: "sr_loa_lost",
    title: "Letter of Authority — EV charging (demo: lost response)",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Head Office — Manchester",
    dateIssued: "2026-09-23T09:00:00Z",
    status: "awaiting_signature",
  },
  {
    id: "doc_loa_cancel_live",
    signingRequestId: "sr_loa_cancel_live",
    title: "Letter of Authority — Broadband (demo: cancelled while open)",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Unit 4 — Leeds",
    dateIssued: "2026-09-24T09:00:00Z",
    status: "awaiting_signature",
  },
  {
    id: "doc_loa_exp_live",
    signingRequestId: "sr_loa_exp_live",
    title: "Letter of Authority — Waste (demo: expires while open)",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Unit 4 — Leeds",
    dateIssued: "2026-09-25T09:00:00Z",
    status: "awaiting_signature",
  },
  {
    id: "doc_superseded",
    signingRequestId: "sr_superseded",
    title: "Letter of Authority — Electricity (demo: updated version)",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Head Office — Manchester",
    dateIssued: "2026-09-26T09:00:00Z",
    status: "awaiting_signature",
  },
  {
    id: "doc_unauth",
    signingRequestId: "sr_unauthorized",
    title: "Supplier Contract — (demo: not your document)",
    type: "supplier_contract",
    businessName: "Beta Catering Ltd",
    siteLabel: "Another business",
    dateIssued: "2026-09-27T09:00:00Z",
    status: "awaiting_signature",
  },
  {
    id: "doc_loa_imgfail",
    signingRequestId: "sr_loa_imgfail",
    title: "Letter of Authority — Signage (demo: page fails to display)",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Head Office — Manchester",
    dateIssued: "2026-09-28T09:00:00Z",
    status: "awaiting_signature",
  },
  {
    id: "doc_loa_fopen_fail",
    signingRequestId: "sr_loa_fopen_fail",
    title: "Letter of Authority — Parking (demo: first-open API fails once)",
    type: "loa",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Head Office — Manchester",
    dateIssued: "2026-09-29T09:00:00Z",
    status: "awaiting_signature",
  },
];

/** Signing requests keyed by id. Synthetic field definitions. */
export const MOCK_REQUESTS: Record<string, SigningRequest> = {
  sr_loa_01: {
    ...loaRequest("sr_loa_01", "doc_loa_01", "v1-sha256:demo-loa-electricity"),
  },
  sr_sc_01: {
    signingRequestId: "sr_sc_01",
    documentId: "doc_sc_01",
    documentVersion: "v2-sha256:demo-supplier-britishgas",
    title: "Supplier Contract — British Gas (3-year)",
    businessName: "Acme Bakery Ltd",
    companyNumber: "01234567",
    signer: SIGNER,
    status: "awaiting_signature",
    pageCount: 3,
    pages: [page(1), page(2), page(3)],
    declaration: DECLARATION,
    expiresAt: "2026-12-31T23:59:59Z",
    fields: [
      { id: "s_ack", page: 1, type: "acknowledgement", label: "I have read the terms", required: true, signerId: "signer_1", rect: { x: 0.1, y: 0.85, w: 0.06, h: 0.035 } },
      { id: "s_name", page: 3, type: "full_name", label: "Confirm full name", required: true, signerId: "signer_1", rect: { x: 0.1, y: 0.45, w: 0.52, h: 0.05 }, prefill: "Anne Baker" },
      { id: "s_initials", page: 3, type: "initials", label: "Add initials", required: true, signerId: "signer_1", rect: { x: 0.1, y: 0.52, w: 0.2, h: 0.05 } },
      { id: "s_sign1", page: 3, type: "signature", label: "Tap to sign", required: true, signerId: "signer_1", rect: { x: 0.1, y: 0.62, w: 0.45, h: 0.1 } },
      { id: "s_sign2", page: 3, type: "signature", label: "Sign (counterpart)", required: true, signerId: "signer_1", rect: { x: 0.1, y: 0.75, w: 0.45, h: 0.1 } },
      { id: "s_date", page: 3, type: "date_signed", label: "Date signed", required: true, signerId: "signer_1", rect: { x: 0.62, y: 0.62, w: 0.28, h: 0.05 }, readOnly: true },
    ],
  },
  sr_loa_done: {
    signingRequestId: "sr_loa_done",
    documentId: "doc_loa_done",
    documentVersion: "v1-sha256:demo-loa-water",
    title: "Letter of Authority — Water",
    businessName: "Acme Bakery Ltd",
    companyNumber: "01234567",
    signer: SIGNER,
    status: "completed",
    pageCount: 1,
    pages: [page(1)],
    declaration: DECLARATION,
    fields: [],
  },
  sr_loa_exp: {
    signingRequestId: "sr_loa_exp",
    documentId: "doc_loa_exp",
    documentVersion: "v1-sha256:demo-loa-telecoms",
    title: "Letter of Authority — Telecoms",
    businessName: "Acme Bakery Ltd",
    signer: SIGNER,
    status: "expired",
    pageCount: 1,
    pages: [page(1)],
    declaration: DECLARATION,
    fields: [],
  },
  sr_sc_cancel: {
    signingRequestId: "sr_sc_cancel",
    documentId: "doc_sc_cancel",
    documentVersion: "v1-sha256:demo-supplier-edf",
    title: "Supplier Contract — EDF",
    businessName: "Acme Bakery Ltd",
    signer: SIGNER,
    status: "cancelled",
    pageCount: 1,
    pages: [page(1)],
    declaration: DECLARATION,
    fields: [],
  },
  sr_loa_fail: { ...loaRequest("sr_loa_fail", "doc_loa_fail", "v1-sha256:demo-loa-gas"), title: "Letter of Authority — Gas" },
  sr_loa_lost: { ...loaRequest("sr_loa_lost", "doc_loa_lost", "v1-sha256:demo-loa-ev"), title: "Letter of Authority — EV charging" },
  sr_loa_cancel_live: { ...loaRequest("sr_loa_cancel_live", "doc_loa_cancel_live", "v1-sha256:demo-loa-broadband"), title: "Letter of Authority — Broadband" },
  sr_loa_exp_live: { ...loaRequest("sr_loa_exp_live", "doc_loa_exp_live", "v1-sha256:demo-loa-waste"), title: "Letter of Authority — Waste" },
  sr_superseded: { ...loaRequest("sr_superseded", "doc_superseded", "v1-sha256:demo-loa-superseded"), title: "Letter of Authority — Electricity" },
  sr_loa_imgfail: { ...loaRequest("sr_loa_imgfail", "doc_loa_imgfail", "v1-sha256:demo-loa-signage"), title: "Letter of Authority — Signage" },
  sr_loa_fopen_fail: { ...loaRequest("sr_loa_fopen_fail", "doc_loa_fopen_fail", "v1-sha256:demo-loa-parking"), title: "Letter of Authority — Parking" },
};

/**
 * MOCK-ONLY: force a specific rejection when the customer taps "Sign and submit".
 * Simulates the backend rejecting a submission the customer already had open.
 * NOTE: `lost_response` records the submission server-side THEN drops the response
 * on the first attempt, so a retry (same idempotency key) is recognised and does
 * NOT create a second submission.
 */
export const MOCK_SUBMIT_OVERRIDE: Record<string, "cancelled" | "expired" | "superseded" | "lost_response"> = {
  sr_loa_cancel_live: "cancelled",
  sr_loa_exp_live: "expired",
  sr_superseded: "superseded",
  sr_loa_lost: "lost_response",
};

/**
 * MOCK-ONLY: how the backend "processes" an accepted submission.
 * `fail_then_recover` → processing → needs_attention (processing failed), then a
 * retry-processing call finishes without re-signing.
 */
export const MOCK_PROCESSING_BEHAVIOR: Record<string, "complete" | "fail_then_recover"> = {
  sr_loa_fail: "fail_then_recover",
};

/**
 * MOCK-ONLY: force the FIRST visible page to FAIL to display on the first render,
 * so first-open must NOT fire. Reloading succeeds (so recovery can be shown).
 * In a real build this is governed by the actual image/PDF render callback.
 */
export const MOCK_RENDER_FIRST_PAGE_FAILS: Record<string, boolean> = {
  sr_loa_imgfail: true,
};

/**
 * MOCK-ONLY: make the FIRST recordFirstOpen call fail (then succeed on retry),
 * to prove the document stays usable and the event retries safely without being
 * permanently marked recorded locally.
 */
export const MOCK_FIRST_OPEN_FAILS_ONCE: Record<string, boolean> = {
  sr_loa_fopen_fail: true,
};

export const MOCK_COMPLETED: Record<string, CompletionStatus["completion"]> = {
  sr_loa_done: {
    reference: "PB-SR-2026-000418",
    signatoryName: "Anne Baker",
    signedAtUtc: "2026-08-01T10:14:32Z",
    signedPdfUrl: "mock://signed/sr_loa_done.pdf",
    auditRecordUrl: "mock://audit/sr_loa_done.pdf",
    combinedUrl: "mock://combined/sr_loa_done.pdf",
    simulated: true,
  },
};

/** View-only documents (no signing workflow). Keyed by document id. */
export const MOCK_VIEW_DOCS: Record<string, ViewOnlyDocument> = {
  doc_q_01: {
    id: "doc_q_01",
    title: "Quote — Electricity renewal options",
    type: "quote",
    businessName: "Acme Bakery Ltd",
    siteLabel: "Head Office — Manchester",
    dateIssued: "2026-09-15T11:00:00Z",
    pageCount: 2,
    pages: [page(1), page(2)],
    note: "This is a view-only quote. No signature is required.",
  },
};

/** Synthetic audit fixture — CLEARLY labelled demo. Not real evidence. */
export const MOCK_AUDIT = {
  simulated: true,
  title: "Price Buddy Signing Audit Record (DEMO FIXTURE)",
  reference: "PB-SR-2026-000418",
  documentTitle: "Letter of Authority — Water",
  documentVersion: "v1-sha256:demo-loa-water",
  pageCount: 1,
  businessName: "Acme Bakery Ltd",
  companyNumber: "01234567",
  senderAdmin: "admin@pricebuddy.co.uk (demo)",
  intendedSigner: "Anne Baker — Director — anne@acmebakery.co.uk",
  submittingAccount: "anne@acmebakery.co.uk (demo authenticated session)",
  authMethod: "Email + password session (demo)",
  acceptanceWording: DECLARATION.text,
  acceptanceVersion: DECLARATION.version,
  events: [
    { label: "Request created", utc: "2026-08-01T09:00:00Z" },
    { label: "Document made available", utc: "2026-08-01T09:01:10Z" },
    { label: "First opened", utc: "2026-08-01T10:10:05Z" },
    { label: "Signature submitted", utc: "2026-08-01T10:14:20Z" },
    { label: "Final file stored", utc: "2026-08-01T10:14:32Z" },
  ],
  deviceMetadata: "IP 203.0.113.10 (supporting metadata only — not proof of identity)",
  originalPdfHash: "sha256:demo-original-aaaa1111",
  signedPdfHash: "sha256:demo-signed-bbbb2222",
  note: "Simulated audit record for prototype testing only. The real record is generated by the backend from server-recorded events.",
};
