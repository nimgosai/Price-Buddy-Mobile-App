import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const API_URL = `${BASE_URL}/api`;

export const TOKEN_KEY = "uch_auth_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseBody(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Non-JSON (e.g. a 502 gateway HTML page)
    return { detail: null, _raw: text };
  }
}

function messageFromBody(body: any, fallback: string): string {
  if (!body) return fallback;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  if (typeof body.message === "string") return body.message;
  return fallback;
}

type RequestOpts = {
  method?: string;
  body?: any;
  auth?: boolean;
  timeoutMs?: number;
};

export async function apiRequest<T = any>(
  path: string,
  { method = "GET", body, auth = true, timeoutMs = 30000 }: RequestOpts = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth) {
    const token = await storage.secureGet<string>(TOKEN_KEY, "");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === "AbortError") {
      throw new ApiError("This is taking longer than usual. Please try again.", 0);
    }
    throw new ApiError("Network error. Check your connection and try again.", 0);
  }
  clearTimeout(timer);

  const parsed = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(
      messageFromBody(parsed, `Something went wrong (${res.status}).`),
      res.status,
    );
  }
  return parsed as T;
}
