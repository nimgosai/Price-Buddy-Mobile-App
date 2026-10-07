/**
 * documentSigningService — the single entry point the UI calls.
 *
 * In MOCK mode it delegates to the dev mock adapter. In real mode it calls the
 * backend through the existing authenticated API client (apiRequest). The real
 * endpoints are the proposed contract in docs/DOCUMENT_SIGNING_API_CONTRACT.md.
 */
import { apiRequest } from "@/src/api/client";
import { DOC_SIGNING_MOCK, assertUsableConfig } from "./config";
import { mockAdapter } from "./mock-adapter";
import type {
  CompletionStatus,
  DocumentSummary,
  SigningRequest,
  SubmissionAck,
  SubmissionPayload,
  ViewOnlyDocument,
} from "./types";

export function generateIdempotencyKey(): string {
  // RFC4122-ish; stable per submission attempt, reused on retry.
  return "idem_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

export const documentSigningService = {
  isMock: DOC_SIGNING_MOCK,

  async listDocuments(): Promise<DocumentSummary[]> {
    assertUsableConfig();
    if (DOC_SIGNING_MOCK) return mockAdapter.listDocuments();
    return apiRequest<DocumentSummary[]>("/documents");
  },

  async getSigningRequest(id: string): Promise<SigningRequest> {
    assertUsableConfig();
    if (DOC_SIGNING_MOCK) return mockAdapter.getSigningRequest(id);
    return apiRequest<SigningRequest>(`/signing-requests/${id}`);
  },

  async getViewDocument(id: string): Promise<ViewOnlyDocument> {
    assertUsableConfig();
    if (DOC_SIGNING_MOCK) return mockAdapter.getViewDocument(id);
    return apiRequest<ViewOnlyDocument>(`/documents/${id}/view`);
  },

  async recordFirstOpen(id: string): Promise<{ recorded: boolean; duplicate: boolean }> {
    if (DOC_SIGNING_MOCK) return mockAdapter.recordFirstOpen(id);
    return apiRequest(`/signing-requests/${id}/first-open`, { method: "POST" });
  },

  /**
   * MOCK/DEV-ONLY helper: whether the first page should simulate a render failure.
   * Always false when not in mock mode (then the real image/PDF render callback
   * governs first-open). Not a backend call.
   */
  mockRenderFirstPageFails(id: string): boolean {
    return DOC_SIGNING_MOCK ? mockAdapter.renderFirstPageFails(id) : false;
  },

  async submit(payload: SubmissionPayload): Promise<SubmissionAck> {
    assertUsableConfig();
    if (DOC_SIGNING_MOCK) return mockAdapter.submit(payload);
    return apiRequest<SubmissionAck>(`/signing-requests/${payload.signingRequestId}/submit`, {
      method: "POST",
      body: payload,
    });
  },

  async getStatus(id: string): Promise<CompletionStatus> {
    assertUsableConfig();
    if (DOC_SIGNING_MOCK) return mockAdapter.getStatus(id);
    return apiRequest<CompletionStatus>(`/signing-requests/${id}/status`);
  },

  /**
   * Retry BACKEND PROCESSING of an already-accepted submission. This must NEVER
   * create a new signing submission — it only asks the backend to re-run final
   * PDF/audit generation for the existing submission.
   */
  async retryProcessing(id: string): Promise<CompletionStatus> {
    assertUsableConfig();
    if (DOC_SIGNING_MOCK) return mockAdapter.retryProcessing(id);
    return apiRequest<CompletionStatus>(`/signing-requests/${id}/retry-processing`, { method: "POST" });
  },

  async getAudit(id: string) {
    if (DOC_SIGNING_MOCK) return mockAdapter.getAudit(id);
    return apiRequest(`/signing-requests/${id}/audit`);
  },
};
