import { Platform, useWindowDimensions } from "react-native";

/**
 * Desktop-web layout helpers. Everything here is a no-op on iOS/Android and on
 * narrow browser windows, so the approved mobile layout is never affected.
 */
export const DESKTOP_MIN_WIDTH = 1024;
/** Width of the centred column used for screens without a dedicated wide layout. */
export const DESKTOP_COLUMN_WIDTH = 640;
/** Max content width for screens that have a dedicated wide layout. */
export const DESKTOP_CONTENT_MAX = 1120;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= DESKTOP_MIN_WIDTH;
}

/** Horizontal padding that centres the bottom tab items inside the desktop column. */
export function desktopTabBarPad(windowWidth: number, isDesktop: boolean): number {
  return isDesktop ? Math.max(0, (windowWidth - DESKTOP_COLUMN_WIDTH) / 2) : 0;
}

/** Routes that render their own wide desktop layout (everything else gets the centred column). */
export function isWideDesktopRoute(pathname: string): boolean {
  if (/^\/(dashboard|sites|reports|support|profile|renewals)\/?$/.test(pathname)) return true; // tab routes
  if (/^\/documents\/?$/.test(pathname)) return true;
  if (/^\/documents\/[^/]+\/review\/?$/.test(pathname)) return true;
  return false;
}
