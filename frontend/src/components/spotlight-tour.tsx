import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";

/**
 * Web-only test/QA bypass: open the app with `?notour=1` in the URL and the
 * guided tour will never render (so automated browser tests aren't blocked).
 * Evaluated once at bundle load, so it survives in-app navigation.
 */
export const TOUR_DISABLED =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  /[?&]notour=1(&|$)/.test(window.location?.search || "");

const DESKTOP_CARD_W = 400;

export type TourStep = {
  title: string;
  body: string;
  /** Screen-space rect of the element to highlight. null → centred card. */
  rect: { x: number; y: number; w: number; h: number } | null;
};

const PAD = 8; // spotlight padding around the target

/**
 * Guided coach-mark tour: dims the screen, cuts a rounded highlight around the
 * current target, and shows a tooltip card with Back / Next / Skip.
 */
export function SpotlightTour({
  open,
  steps,
  onClose,
}: {
  open: boolean;
  steps: TourStep[];
  onClose: (opts: { completed: boolean }) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  if (!open || steps.length === 0 || TOUR_DISABLED) return null;
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i === steps.length - 1;

  const next = () => (last ? onClose({ completed: true }) : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));
  const skip = () => onClose({ completed: false });

  // Highlight rect (padded), clamped to screen.
  const r = step.rect;
  const hole = r
    ? {
        x: Math.max(0, r.x - PAD),
        y: Math.max(0, r.y - PAD),
        w: Math.min(width, r.w + PAD * 2),
        h: r.h + PAD * 2,
      }
    : null;

  // Tooltip placement: below the hole if room, else above.
  const CARD_EST = 190;
  const belowRoom = hole ? height - (hole.y + hole.h) - insets.bottom : 0;
  const placeBelow = !hole || belowRoom > CARD_EST + 24;
  const cardTop = hole
    ? placeBelow
      ? hole.y + hole.h + 14
      : Math.max(insets.top + 8, hole.y - CARD_EST - 14)
    : height / 2 - CARD_EST / 2;

  // Desktop web: a fixed-width card aligned with the highlight instead of full width.
  const cardX = isDesktop
    ? {
        left: Math.max(spacing.lg, Math.min(hole ? hole.x : (width - DESKTOP_CARD_W) / 2, width - DESKTOP_CARD_W - spacing.lg)),
        width: DESKTOP_CARD_W,
      }
    : { left: spacing.lg, right: spacing.lg };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={skip}>
      <View style={StyleSheet.absoluteFill} testID="spotlight-tour">
        {hole ? (
          <>
            {/* Four dim panels around the cutout */}
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.y }]} />
            <View style={[styles.dim, { top: hole.y, left: 0, width: hole.x, height: hole.h }]} />
            <View style={[styles.dim, { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]} />
            <View style={[styles.dim, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]} />
            {/* Highlight ring */}
            <View
              pointerEvents="none"
              style={[styles.ring, { top: hole.y, left: hole.x, width: hole.w, height: hole.h }]}
            />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15,12,30,0.78)" }]} />
        )}

        {/* Tooltip card */}
        <View style={[styles.card, { top: cardTop }, cardX]} testID="spotlight-card">
          <View style={styles.dots}>
            {steps.map((_, k) => (
              <View key={k} style={[styles.dot, k === i && styles.dotActive]} />
            ))}
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <View style={styles.actions}>
            <Pressable testID="tour-skip" onPress={skip} hitSlop={8} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            <View style={styles.rightBtns}>
              {i > 0 && (
                <Pressable testID="tour-back" onPress={back} style={[styles.navBtn, styles.backBtn]}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
              )}
              <Pressable testID="tour-next" onPress={next} style={[styles.navBtn, styles.nextBtn]}>
                <Text style={styles.nextText}>{last ? "Got it" : "Next"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { position: "absolute", backgroundColor: "rgba(15,12,30,0.78)" },
  ring: {
    position: "absolute",
    borderRadius: radius.md,
    borderWidth: 2.5,
    borderColor: colors.brandPrimary,
  },
  card: {
    position: "absolute",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dots: { flexDirection: "row", gap: 6, marginBottom: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfaceTertiary },
  dotActive: { width: 20, backgroundColor: colors.brandPrimary },
  title: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, letterSpacing: -0.3 },
  body: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, lineHeight: 20 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  skipText: { fontFamily: font.semibold, fontSize: type.base, color: colors.muted },
  rightBtns: { flexDirection: "row", gap: spacing.sm },
  navBtn: { height: 42, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  backBtn: { backgroundColor: colors.surfaceTertiary },
  backText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  nextBtn: { backgroundColor: colors.brandPrimary },
  nextText: { fontFamily: font.semibold, fontSize: type.base, color: "#FFFFFF" },
});
