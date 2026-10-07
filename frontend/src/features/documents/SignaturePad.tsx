/**
 * SignaturePad — Expo-compatible signature capture.
 *
 * Dependencies: `react-native-svg` (already in the project) + React Native core
 * `PanResponder`. No WebView, works in Expo Go and on physical devices.
 *
 * OUTPUT FORMAT (document for backend): an SVG data URI
 *   `data:image/svg+xml;utf8,<svg viewBox="0 0 W H">...<path d=.../></svg>`
 * with a known viewBox (W x H = capture box in px). The backend should embed the
 * signature into the final PDF by rasterising this vector (or request PNG output
 * in production). Dimensions are the capture box; scale to the field rect.
 *
 * Signatures are kept in memory only (never localStorage) and must be applied
 * explicitly to each signature field by the caller.
 *
 * MOBILE ROBUSTNESS:
 * - Strokes are accumulated in an array and persist across multiple touch
 *   gestures until "Clear" is tapped.
 * - `onPanResponderTerminate` commits the in-progress stroke, and the pad refuses
 *   to yield the responder to a parent ScrollView, so strokes never vanish on a
 *   finger-lift / second stroke on Android.
 * - Only strokes with actual movement (real ink) count — a tap (no line) is
 *   ignored, so an empty/dotted "signature" can never mark a field complete.
 */
import { useRef, useState } from "react";
import { Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const ASPECT = 180 / 320; // height / width of the capture box
const DEFAULT_W = Math.min(320, Dimensions.get("window").width - 72);

const hasInk = (paths: string[]) => paths.some((d) => d.includes(" L "));

export function SignaturePad({
  title = "Draw your signature",
  onApply,
  onCancel,
}: {
  title?: string;
  onApply: (dataUri: string, meta: { width: number; height: number }) => void;
  onCancel: () => void;
}) {
  const [paths, setPaths] = useState<string[]>([]);
  const current = useRef<string>("");
  const [, force] = useState(0);
  const [size, setSize] = useState({ w: DEFAULT_W, h: Math.round(DEFAULT_W * ASPECT) });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Never let a parent ScrollView/modal steal the drawing gesture.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        current.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        force((n) => n + 1);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        current.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        force((n) => n + 1);
      },
      onPanResponderRelease: () => commitStroke(),
      onPanResponderTerminate: () => commitStroke(),
    }),
  ).current;

  // Commit the in-progress stroke ONLY if it contains real movement (has a line
  // segment). A pure tap is discarded so it can't be mistaken for a signature.
  function commitStroke() {
    const d = current.current;
    current.current = "";
    if (d && d.includes(" L ")) setPaths((p) => [...p, d]);
    else force((n) => n + 1);
  }

  const live = current.current ? [...paths, current.current] : paths;
  const inked = hasInk(live);

  const clear = () => {
    setPaths([]);
    current.current = "";
    force((n) => n + 1);
  };

  const apply = () => {
    const strokes = paths.filter((d) => d.includes(" L "));
    if (strokes.length === 0) return; // never apply an empty signature
    const body = strokes
      .map((d) => `<path d="${d}" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size.w} ${size.h}">${body}</svg>`;
    const dataUri = `data:image/svg+xml;utf8,${svg}`;
    onApply(dataUri, { width: size.w, height: size.h });
  };

  return (
    <View style={styles.wrap} testID="signature-pad">
      <Text style={styles.title}>{title}</Text>
      <View
        style={[styles.canvas, { width: size.w, height: size.h }]}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0 && w !== size.w) setSize({ w, h: Math.round(w * ASPECT) });
        }}
        {...responder.panHandlers}
      >
        <Svg width={size.w} height={size.h}>
          {live.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke="#111" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
        {!inked ? <Text style={styles.hint} pointerEvents="none">Sign here with your finger</Text> : null}
      </View>
      {!inked ? (
        <Text style={styles.err}>Draw your signature above — a tap alone won&apos;t count.</Text>
      ) : (
        <Text style={styles.ok}>Looks good. Add more strokes if needed, or tap Apply.</Text>
      )}
      <View style={styles.row}>
        <Pressable testID="sig-clear" onPress={clear} style={[styles.btn, styles.ghost]}>
          <Text style={styles.ghostText}>Clear</Text>
        </Pressable>
        <Pressable testID="sig-cancel" onPress={onCancel} style={[styles.btn, styles.ghost]}>
          <Text style={styles.ghostText}>Cancel</Text>
        </Pressable>
        <Pressable
          testID="sig-apply"
          onPress={apply}
          disabled={!inked}
          style={[styles.btn, styles.apply, !inked && { opacity: 0.45 }]}
        >
          <Text style={styles.applyText}>Apply signature</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  title: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  canvas: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  hint: { position: "absolute", fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  err: { fontFamily: font.regular, fontSize: type.sm, color: colors.error, textAlign: "center" },
  ok: { fontFamily: font.regular, fontSize: type.sm, color: colors.success, textAlign: "center" },
  row: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" },
  btn: { height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  ghost: { backgroundColor: colors.surfaceTertiary },
  ghostText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  apply: { backgroundColor: colors.brandPrimary },
  applyText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onBrandPrimary },
});
