/**
 * Development-only MOCK adapter. Honestly simulates backend responses using
 * synthetic data. It NEVER produces a real signed PDF — completed files are
 * labelled demo fixtures. See service.ts for the switch.
 */
import type {
  CompletionStatus,
  DocumentSummary,
  SigningRequest,
  SubmissionAck,
  SubmissionPayload,
  ViewOnlyDocument,
} from "./types";
import {
  MOCK_AUDIT,
  MOCK_COMPLETED,
  MOCK_DOCUMENTS,
  MOCK_FIRST_OPEN_FAILS_ONCE,
  MOCK_PROCESSING_BEHAVIOR,
  MOCK_RENDER_FIRST_PAGE_FAILS,
  MOCK_REQUESTS,
  MOCK_SUBMIT_OVERRIDE,
  MOCK_VIEW_DOCS,
} from "./fixtures";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// In-memory session state (lost on reload — mirrors "not persisted on device").
const firstOpened = new Set<string>();
const firstOpenFailedOnce = new Set<string>(); // ids whose first recordFirstOpen was failed
const renderFailedOnce = new Set<string>(); // ids whose first page-render was failed once
type Submission = { idempotencyKey: string; at: number; recovered?: boolean; recoveredAt?: number };
const submissions = new Map<string, Submission>();

const PROCESS_MS = 4000; // happy-path processing time
const FAIL_AT_MS = 2500; // when fail_then_recover flips to needs_attention

export class MockDocError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const mockAdapter = {
  async listDocuments(): Promise<DocumentSummary[]> {
    await delay(500);
    return [...MOCK_DOCUMENTS];
  },

  async getSigningRequest(id: string): Promise<SigningRequest> {
    await delay(450);
    if (!id || id === "sr_unauthorized") throw new MockDocError("unauthorized", "You are not authorised to view this document. It may belong to a different account.");
    const req = MOCK_REQUESTS[id];
    if (!req) throw new MockDocError("not_found", "Signing request not found.");
    // Reflect any in-session submission as processing/completed.
    const sub = submissions.get(id);
    if (sub) return { ...req, status: statusFor(id, sub) === "completed" ? "completed" : "processing" };
    return req;
  },

  async getViewDocument(id: string): Promise<ViewOnlyDocument> {
    await delay(400);
    const doc = MOCK_VIEW_DOCS[id];
    if (!doc) throw new MockDocError("not_found", "Document not found.");
    return doc;
  },

  /**
   * Called ONLY after the exact first document page has successfully DISPLAYED
   * (not when metadata loaded). Deduplicated server-side (in-session Set here).
   * Some demo ids fail the first attempt to prove safe retry.
   */
  async recordFirstOpen(id: string): Promise<{ recorded: boolean; duplicate: boolean }> {
    await delay(150);
    if (MOCK_FIRST_OPEN_FAILS_ONCE[id] && !firstOpenFailedOnce.has(id)) {
      firstOpenFailedOnce.add(id);
      throw new MockDocError("network", "Couldn't record first-open (simulated). Safe to retry.");
    }
    const duplicate = firstOpened.has(id);
    firstOpened.add(id);
    return { recorded: true, duplicate };
  },

  /**
   * MOCK-ONLY: should the FIRST page fail to render this time? Fails once, then
   * succeeds on reload (so recovery can be demonstrated). Returns false outside mock.
   */
  renderFirstPageFails(id: string): boolean {
    if (!MOCK_RENDER_FIRST_PAGE_FAILS[id]) return false;
    if (renderFailedOnce.has(id)) return false;
    renderFailedOnce.add(id);
    return true;
  },

  async submit(payload: SubmissionPayload): Promise<SubmissionAck> {
    await delay(700);
    const id = payload.signingRequestId;
    const req = MOCK_REQUESTS[id];
    if (!req) throw new MockDocError("not_found", "Signing request not found.");
    if (req.status === "expired") throw new MockDocError("expired", "This request has expired and can no longer be signed.");
    if (req.status === "cancelled") throw new MockDocError("cancelled", "This request was cancelled.");
    if (payload.documentVersion !== req.documentVersion)
      throw new MockDocError("superseded", "This document was updated. Please reopen the latest version.");

    const existing = submissions.get(id);
    const override = MOCK_SUBMIT_OVERRIDE[id];

    // Simulated "cancelled / expired / superseded while the screen was open".
    if (override === "cancelled")
      throw new MockDocError("cancelled", "Price Buddy cancelled this request while you had it open. Please contact your account manager.");
    if (override === "expired")
      throw new MockDocError("expired", "This request expired while you had it open and can no longer be signed.");
    if (override === "superseded")
      throw new MockDocError("superseded", "This document was updated after you opened it. Please go back and reopen the latest version.");

    // Simulated lost response: record server-side, then drop the response on the
    // FIRST attempt. A retry with the SAME idempotency key is recognised below
    // and returns processing WITHOUT creating a second submission.
    if (override === "lost_response" && !existing) {
      submissions.set(id, { idempotencyKey: payload.idempotencyKey, at: Date.now() });
      throw new MockDocError("network", "Your connection dropped before we could confirm. Your signature may already have been received — tap Try again to check. You won't sign twice.");
    }

    // Idempotent accept: only ever create ONE submission per request.
    if (!existing) {
      submissions.set(id, { idempotencyKey: payload.idempotencyKey, at: Date.now() });
    }
    return { signingRequestId: id, status: "processing", receivedAt: new Date().toISOString() };
  },

  async getStatus(id: string): Promise<CompletionStatus> {
    await delay(500);
    const req = MOCK_REQUESTS[id];
    if (!req) throw new MockDocError("not_found", "Signing request not found.");
    if (req.status === "expired" || req.status === "cancelled")
      return { signingRequestId: id, status: req.status, message: `This request is ${req.status}.` };
    if (req.status === "completed")
      return { signingRequestId: id, status: "completed", completion: MOCK_COMPLETED[id] ?? demoCompletion(id) };

    const sub = submissions.get(id);
    if (!sub) return { signingRequestId: id, status: "awaiting_signature" };

    const s = statusFor(id, sub);
    if (s === "needs_attention")
      return {
        signingRequestId: id,
        status: "needs_attention",
        message: "We couldn't finish preparing your signed document. Your signature was received — you don't need to sign again.",
      };
    if (s === "completed")
      return { signingRequestId: id, status: "completed", completion: demoCompletion(id) };
    return { signingRequestId: id, status: "processing" };
  },

  /** Retry PROCESSING only — never creates a new submission. */
  async retryProcessing(id: string): Promise<CompletionStatus> {
    await delay(500);
    const sub = submissions.get(id);
    if (!sub) throw new MockDocError("not_found", "There is no submission to finish processing.");
    sub.recovered = true;
    sub.recoveredAt = Date.now();
    return { signingRequestId: id, status: "processing" };
  },

  async getAudit(_id: string) {
    await delay(300);
    return MOCK_AUDIT;
  },
};

/** Resolve the effective status for an in-session submission. */
function statusFor(id: string, sub: Submission): "processing" | "needs_attention" | "completed" {
  const behavior = MOCK_PROCESSING_BEHAVIOR[id] ?? "complete";
  if (behavior === "fail_then_recover" && !sub.recovered) {
    return Date.now() - sub.at > FAIL_AT_MS ? "needs_attention" : "processing";
  }
  const base = sub.recovered ? sub.recoveredAt! : sub.at;
  return Date.now() - base > PROCESS_MS ? "completed" : "processing";
}

function demoCompletion(id: string): NonNullable<CompletionStatus["completion"]> {
  return {
    reference: `PB-SR-DEMO-${id.slice(-4).toUpperCase()}`,
    signatoryName: MOCK_REQUESTS[id]?.signer.name ?? "Demo Signer",
    signedAtUtc: new Date().toISOString(),
    signedPdfUrl: `mock://signed/${id}.pdf`,
    auditRecordUrl: `mock://audit/${id}.pdf`,
    combinedUrl: `mock://combined/${id}.pdf`,
    simulated: true,
  };
}
