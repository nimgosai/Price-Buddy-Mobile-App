import { createContext, useContext } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";

import { useAuth } from "@/src/auth/auth-context";
import { PortalSidebar, PortalTopBar } from "@/src/desktop/portal-shell";
import { BillUploadProvider } from "@/src/desktop/upload-bill";
import { dt } from "@/src/desktop/tokens";
import { colors } from "@/src/theme/theme";
import {
  DESKTOP_COLUMN_WIDTH, DESKTOP_PAGE_MAX, PHONE_COLUMN_WIDTH, SIDEBAR_W, TABLET_COLUMN_WIDTH, isAuthRoute, isSplitAuthRoute, isWideDesktopRoute, useIsDesktop, useWebTier,
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
  const tier = useWebTier();
  const pathname = usePathname();
  const { user } = useAuth();
  const shell = isDesktop && !!user && !isAuthRoute(pathname);
  const column = isDesktop && !shell && !isSplitAuthRoute(pathname);
  const page = shell && !isWideDesktopRoute(pathname);
  // Web below 1024px: centred app shell (480px phone / 820px tablet) on a neutral backdrop.
  const mobileCol = tier === "phone" ? styles.phoneCol : tier === "tablet" ? styles.tabletCol : null;
  // Keep the same element tree in every state so the navigator never remounts.
  return (
    <ShellInsetContext.Provider value={shell ? SIDEBAR_W : 0}>
      <BillUploadProvider>
      <View style={[styles.fill, isDesktop && styles.row, (column || mobileCol) && styles.backdrop, shell && styles.canvas]}>
        {shell ? <PortalSidebar /> : null}
        <View style={[styles.fill, styles.minW0]}>
          {shell ? <PortalTopBar /> : null}
          <View testID={page ? "desktop-frame-page" : mobileCol ? "web-app-shell" : undefined} style={[styles.fill, column && styles.column, page && styles.page, mobileCol]}>{children}</View>
        </View>
      </View>
      </BillUploadProvider>
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
  phoneCol: { width: "100%", maxWidth: PHONE_COLUMN_WIDTH, alignSelf: "center", backgroundColor: colors.surfaceSecondary, overflow: "hidden", boxShadow: "0 0 0 1px #E6E1DA" } as object,
  tabletCol: { width: "100%", maxWidth: TABLET_COLUMN_WIDTH, alignSelf: "center", backgroundColor: colors.surfaceSecondary, overflow: "hidden", boxShadow: "0 0 0 1px #E6E1DA" } as object,
  page: {
    width: "100%", maxWidth: DESKTOP_PAGE_MAX, alignSelf: "center", marginVertical: 24,
    borderWidth: 1, borderColor: dt.border, borderRadius: dt.radius, overflow: "hidden", ...dt.shadowSm,
  },
});
