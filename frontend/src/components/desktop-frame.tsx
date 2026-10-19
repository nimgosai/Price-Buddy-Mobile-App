import { Platform, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";

import { colors } from "@/src/theme/theme";
import { DESKTOP_COLUMN_WIDTH, isWideDesktopRoute, useIsDesktop } from "@/src/utils/use-desktop";

/**
 * Desktop-web frame. On wide browser windows, screens without a dedicated wide
 * layout are shown in a centred column instead of stretching edge-to-edge.
 * Native (iOS/Android) renders children untouched.
 */
export function DesktopFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  return <WebFrame>{children}</WebFrame>;
}

function WebFrame({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const column = isDesktop && !isWideDesktopRoute(pathname);
  // Keep the same element tree in every state so the navigator never remounts.
  return (
    <View style={[styles.fill, isDesktop && styles.backdrop]}>
      <View style={[styles.fill, column && styles.column]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { backgroundColor: "#EFEBE5" },
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
});
