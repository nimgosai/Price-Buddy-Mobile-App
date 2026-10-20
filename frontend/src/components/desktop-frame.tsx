import { createContext, useContext } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";

import { useAuth } from "@/src/auth/auth-context";
import { PortalSidebar, PortalTopBar } from "@/src/desktop/portal-shell";
import { dt } from "@/src/desktop/tokens";
import { colors } from "@/src/theme/theme";
import {
  DESKTOP_COLUMN_WIDTH, DESKTOP_PAGE_MAX, SIDEBAR_W, isAuthRoute, isSplitAuthRoute, isWideDesktopRoute, useIsDesktop,
} from "@/src/utils/use-desktop";

/** Width taken by the desktop sidebar (0 when no portal shell is shown). */
const ShellInsetContext = createContext(0);
export const useShellInset = () => useContext(ShellInsetContext);

/**
 * Desktop-web frame.
 *  - Signed-in portal routes: persistent left sidebar + top header (SaaS shell).
 *  - Entry/auth routes: centred column on a tinted backdrop.
 * Native (iOS/Android) renders children untouched.
 */
export function DesktopFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  return <WebFrame>{children}</WebFrame>;
}

function WebFrame({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const { user } = useAuth();
  const shell = isDesktop && !!user && !isAuthRoute(pathname);
  const column = isDesktop && !shell && !isSplitAuthRoute(pathname);
  const page = shell && !isWideDesktopRoute(pathname);
  // Keep the same element tree in every state so the navigator never remounts.
  return (
    <ShellInsetContext.Provider value={shell ? SIDEBAR_W : 0}>
      <View style={[styles.fill, isDesktop && styles.row, column && styles.backdrop, shell && styles.canvas]}>
        {shell ? <PortalSidebar /> : null}
        <View style={[styles.fill, styles.minW0]}>
          {shell ? <PortalTopBar /> : null}
          <View testID={page ? "desktop-frame-page" : undefined} style={[styles.fill, column && styles.column, page && styles.page]}>{children}</View>
        </View>
      </View>
    </ShellInsetContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: "row" },
  minW0: { minWidth: 0 },
  backdrop: { backgroundColor: "#EFEBE5" },
  canvas: { backgroundColor: dt.canvas },
  column: {
    width: "100%",
    maxWidth: DESKTOP_COLUMN_WIDTH,
    alignSelf: "center",
    backgroundColor: colors.surfaceSecondary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E6E1DA",
    overflow: "hidden",
  },
  // Portal pages without a dedicated wide layout yet: framed panel on the canvas.
  page: {
    width: "100%", maxWidth: DESKTOP_PAGE_MAX, alignSelf: "center", marginVertical: 24,
    borderWidth: 1, borderColor: dt.border, borderRadius: dt.radius, overflow: "hidden", ...dt.shadowSm,
  },
});
