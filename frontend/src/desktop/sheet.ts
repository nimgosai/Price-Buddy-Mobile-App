import { StyleSheet } from "react-native";

import { useIsDesktop } from "@/src/utils/use-desktop";

/**
 * Desktop web (≥1024px): turns a mobile bottom sheet into a centred dialog card
 * instead of stretching edge-to-edge. Returns `false` styles on mobile (no change).
 */
export function useDesktopSheet(maxWidth = 560) {
  const isDesktop = useIsDesktop();
  return {
    isDesktop,
    backdrop: isDesktop && s.backdrop,
    kav: isDesktop && s.kav,
    sheet: isDesktop && [s.sheet, { maxWidth }],
  };
}

const s = StyleSheet.create({
  backdrop: { justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(15,23,42,0.45)" },
  kav: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  sheet: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingBottom: 24,
    boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
  } as object,
});
