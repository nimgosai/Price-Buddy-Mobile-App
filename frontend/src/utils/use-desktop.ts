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
/** Max content width for portal pages without a dedicated wide layout (forms, support, profile). */
export const DESKTOP_PAGE_MAX = 760;
/** Persistent left sidebar width (desktop portal shell). */
export const SIDEBAR_W = 248;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= DESKTOP_MIN_WIDTH;
}

/** Web below the desktop portal: phone (<768px) or tablet (768–1023px). */
export const TABLET_MIN_WIDTH = 768;
/** Web phone-width browsers: app shell is capped at this width and centred. */
export const PHONE_COLUMN_WIDTH = 480;
/** Web tablets: comfortable centred content column. */
export const TABLET_COLUMN_WIDTH = 820;

export type WebTier = "native" | "phone" | "tablet" | "desktop";

export function useWebTier(): WebTier {
  const { width } = useWindowDimensions();
  if (Platform.OS !== "web") return "native";
  if (width >= DESKTOP_MIN_WIDTH) return "desktop";
  if (width >= TABLET_MIN_WIDTH) return "tablet";
  return "phone";
}

/** Web ≥768px: pop-ups render as centred dialogs instead of full-width bottom sheets. */
export function useIsTabletUp(): boolean {
  const t = useWebTier();
  return t === "tablet" || t === "desktop";
}

/**
 * Width actually available to mobile layouts. Native = full window (unchanged);
 * web phone/tablet = the centred app column; desktop = full window.
 */
export function useFrameWidth(): number {
  const { width } = useWindowDimensions();
  const tier = useWebTier();
  if (tier === "phone") return Math.min(width, PHONE_COLUMN_WIDTH);
  if (tier === "tablet") return Math.min(width, TABLET_COLUMN_WIDTH);
  return width;
}

/** Entry / auth routes that never show the portal shell. */
export function isAuthRoute(pathname: string): boolean {
  return /^\/(signin|signup|landing|splash|forgot-password|reset-password|welcome-back|confirm-device|biometric|onboarding|share)(\/|$)/.test(pathname)
    || pathname === "/" || pathname === "";
}

/** Sign-in / sign-up render their own full-width two-panel desktop layout. */
export function isSplitAuthRoute(pathname: string): boolean {
  return /^\/(signin|signup)\/?$/.test(pathname);
}

/** Routes that render their own wide desktop layout (full width of the portal content area). */
export function isWideDesktopRoute(pathname: string): boolean {
  if (/^\/(dashboard|sites|reports|renewals|quotes)\/?$/.test(pathname)) return true;
  if (/^\/quote\/new\/?$/.test(pathname)) return true; // two-column quote form
  if (/^\/sites\/(?!new\/?$)[^/]+\/?$/.test(pathname)) return true; // site detail
  if (/^\/documents\/?$/.test(pathname)) return true;
  if (/^\/documents\/[^/]+\/review\/?$/.test(pathname)) return true;
  return false;
}
