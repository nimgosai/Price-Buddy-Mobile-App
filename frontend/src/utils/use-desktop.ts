import { Platform, useWindowDimensions } from "react-native";

/**
 * Desktop-web layout helpers. Everything here is a no-op on iOS/Android and on
 * narrow browser windows, so the approved mobile layout is never affected.
 */
export const DESKTOP_MIN_WIDTH = 1024;
/** Width of the centred column used for sign-in / entry screens on desktop. */
export const DESKTOP_COLUMN_WIDTH = 640;
/** Max content width for screens that have a dedicated wide layout. */
export const DESKTOP_CONTENT_MAX = 1120;
/** Max content width for portal pages that don't have a dedicated wide layout yet. */
export const DESKTOP_PAGE_MAX = 960;
/** Persistent left sidebar width (desktop portal shell). */
export const SIDEBAR_W = 248;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= DESKTOP_MIN_WIDTH;
}

/** Entry / auth routes that never show the portal shell. */
export function isAuthRoute(pathname: string): boolean {
  return /^\/(signin|signup|landing|splash|forgot-password|reset-password|welcome-back|confirm-device|biometric|onboarding|share)(\/|$)/.test(pathname)
    || pathname === "/" || pathname === "";
}

/** Routes that render their own wide desktop layout (full width of the portal content area). */
export function isWideDesktopRoute(pathname: string): boolean {
  if (/^\/dashboard\/?$/.test(pathname)) return true;
  if (/^\/documents\/?$/.test(pathname)) return true;
  if (/^\/documents\/[^/]+\/review\/?$/.test(pathname)) return true;
  return false;
}
