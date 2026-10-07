/**
 * Price Buddy — Document Signing shared types (prototype).
 *
 * These types are the SHARED CONTRACT between this frontend prototype and the
 * separate backend/admin project. Keep them identical on both sides.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * COORDINATE CONVENTION (must match backend exactly)
 * ──────────────────────────────────────────────────────────────────────────
 * - Page indexing: 1-based (`page: 1` is the first page).
 * - Origin: TOP-LEFT of the *rotation-corrected, displayed* page.
 * - Units: NORMALISED floats in [0..1]. `x,y` = top-left of the field box,
 *   `w,h` = width/height, all as a fraction of the displayed page width/height.
 * - Example: a box at x=0.1,y=0.8,w=0.3,h=0.06 sits 10% from the left, 80%
 *   down, 30% of page width wide, 6% of page height tall.
 * - Page dimensions: the backend MUST send each page's intrinsic size in PDF
 *   points (`widthPt`,`heightPt`, 1pt = 1/72 inch) and `rotation` (0/90/180/270).
 * - Rotation handling: normalised coords are relative to the page AS DISPLAYED
 *   (after applying `rotation`). The frontend never rotates coords; it renders
 *   the already-rotation-corrected page and lays overlays on top.
 * - Backend conversion: to burn a value into the final PDF, the backend converts
 *   normalised coords -> PDF user-space points on the *unrotated* page, applying
 *   the inverse of `rotation`. The frontend's job is review/placement preview only.
 *
 * ⚠️ Prototype overlay alignment does NOT prove final PDF signature placement.
 *    That requires real-backend integration testing against the actual PDF.
 */

export type DocumentType = "loa" | "supplier_contract" | "quote" | "bill" | "other";

/** Signing-request lifecycle (documents that require a signature). */
export type SigningStatus =
  | "awaiting_signature"
  | "processing"
  | "completed"
  | "expired"
  | "cancelled"
  | "needs_attention";

/** View-only documents (no signing workflow) use this neutral status. */
export type ViewOnlyStatus = "available";

export type DocumentStatus = SigningStatus | ViewOnlyStatus;

export type FieldType =
  | "signature"
  | "full_name"
  | "job_title"
  | "email"
  | "telephone"
  | "initials"
  | "date_signed"
  | "acknowledgement";

/** A page of the document as the renderer should display it. */
export interface DocumentPage {
  page: number; // 1-based
  widthPt: number; // intrinsic width in PDF points
  heightPt: number; // intrinsic height in PDF points
  rotation: 0 | 90 | 180 | 270;
  /** Optional raster for the real/image renderer. Prototype may be null -> synthetic page. */
  imageUri: string | null;
}

/** Field definition created by admin on the backend; synthetic in the prototype. */
export interface FieldDefinition {
  id: string; // unique field id
  page: number; // 1-based
  type: FieldType;
  label: string; // e.g. "Tap to sign", "Confirm full name"
  required: boolean;
  signerId: string; // intended signer id
  /** Normalised top-left box (see coordinate convention). */
  rect: { x: number; y: number; w: number; h: number };
  prefill?: string | null;
  readOnly?: boolean;
}

export interface DocumentSummary {
  id: string; // document id
  signingRequestId: string | null; // null for view-only docs
  title: string;
  type: DocumentType;
  businessName: string;
  siteLabel?: string | null;
  dateIssued: string; // ISO (UTC) from backend
  status: DocumentStatus;
}

/** A read-only document (no signing workflow). Rendered in the view screen. */
export interface ViewOnlyDocument {
  id: string;
  title: string;
  type: DocumentType;
  businessName: string;
  siteLabel?: string | null;
  dateIssued: string; // ISO (UTC)
  pageCount: number;
  pages: DocumentPage[];
  note?: string | null; // optional context line shown to the customer
}

export interface Signer {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
}

export interface SigningRequest {
  signingRequestId: string;
  documentId: string;
  documentVersion: string; // immutable version string / hash
  title: string;
  businessName: string;
  companyNumber?: string | null;
  signer: Signer; // intended signer (do NOT assume == logged-in user)
  status: SigningStatus;
  pageCount: number;
  pages: DocumentPage[];
  fields: FieldDefinition[];
  /** Acceptance declaration the customer must tick. */
  declaration: { version: string; text: string };
  expiresAt?: string | null; // ISO UTC
}

/** Value the customer completed for a field during the session (in memory only). */
export interface FieldValue {
  fieldId: string;
  /** text for text fields, "true" for acknowledgement, dataUri (PNG) for signature. */
  value: string;
}

export interface SubmissionPayload {
  signingRequestId: string;
  documentVersion: string; // must match the request's immutable version
  fields: FieldValue[];
  declaration: { version: string; accepted: true };
  idempotencyKey: string; // reuse on retry to avoid duplicate signing
}

export interface SubmissionAck {
  signingRequestId: string;
  status: "processing"; // accepted for processing; NOT completed
  receivedAt: string; // backend timestamp (UTC) — simulated in mock
}

export interface CompletionStatus {
  signingRequestId: string;
  status: SigningStatus; // processing | completed | needs_attention | expired | cancelled
  /** Present only when completed by the backend. */
  completion?: {
    reference: string; // unique signing-request reference
    signatoryName: string;
    signedAtUtc: string; // authoritative server timestamp (UTC)
    signedPdfUrl: string; // authenticated / short-lived url
    auditRecordUrl: string; // authenticated / short-lived url
    combinedUrl?: string | null;
    simulated?: boolean; // true in mock mode
  };
  message?: string | null; // rejection/failure reason
}

export type DocumentFilter = "all" | "needs_signature" | "completed";
