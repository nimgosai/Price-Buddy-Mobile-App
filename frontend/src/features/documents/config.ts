/**
 * Document-signing mock-mode configuration.
 *
 * Mock mode must be EXPLICITLY enabled for development and OFF by default in
 * production. If mock is off and there is no API base configured, the service
 * throws a clear error rather than silently falling back to mock data.
 */
import { API_URL } from "@/src/api/client";

// Explicit opt-in via env; otherwise default to ON only in development.
const envFlag = process.env.EXPO_PUBLIC_DOC_SIGNING_MOCK;
export const DOC_SIGNING_MOCK =
  envFlag === "true" ? true : envFlag === "false" ? false : __DEV__;

export const DOC_SIGNING_API_BASE = API_URL; // reuse the authenticated client base

export function assertUsableConfig() {
  if (!DOC_SIGNING_MOCK && !DOC_SIGNING_API_BASE) {
    throw new Error(
      "Document signing is not configured: no API base and mock mode is disabled.",
    );
  }
}
