/**
 * SignaturePad — Expo-compatible signature capture.
 *
 * Dependencies: `react-native-svg` (already in the project) + React Native core
 * `PanResponder`. No WebView, works in Expo Go.
 *
 * OUTPUT FORMAT (document for backend): an SVG data URI
 *   `data:image/svg+xml;utf8,<svg viewBox="0 0 W H">...<path d=.../></svg>`
 * with a known viewBox (W x H = capture box in px). The backend should embed the
 * signature into the final PDF by rasterising this vector (or request PNG output
 * in production). Dimensions are the capture box; scale to the field rect.
 *
 * Signatures are kept in memory only (never localStorage) and must be applied
 * explicitly to each signature field by the caller.
 */
import { useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const BOX_W = 320;
const BOX_H = 180;

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

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
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
      onPanResponderRelease: () => {
        if (current.current) setPaths((p) => [...p, current.current]);
        current.current = "";
      },
    }),
  ).current;

  const allPaths = current.current ? [...paths, current.current] : paths;
  const isEmpty = allPaths.length === 0;

  const clear = () => {
    setPaths([]);
    current.current = "";
    force((n) => n + 1);
  };

  const apply = () => {
    if (isEmpty) return;
    const body = allPaths
      .map((d) => `<path d="${d}" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX_W} ${BOX_H}">${body}</svg>`;
    const dataUri = `data:image/svg+xml;utf8,${svg}`;
    onApply(dataUri, { width: BOX_W, height: BOX_H });
  };

  return (
    <View style={styles.wrap} testID="signature-pad">
      <Text style={styles.title}>{title}</Text>
      <View style={styles.canvas} {...responder.panHandlers}>
        <Svg width={BOX_W} height={BOX_H}>
          {allPaths.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke="#111" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
        {isEmpty ? <Text style={styles.hint}>Sign here with your finger</Text> : null}
      </View>
      {isEmpty ? <Text style={styles.err}>A signature is required.</Text> : null}
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
          disabled={isEmpty}
          style={[styles.btn, styles.apply, isEmpty && { opacity: 0.45 }]}
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
    width: BOX_W,
    height: BOX_H,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { position: "absolute", fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  err: { fontFamily: font.regular, fontSize: type.sm, color: colors.error, textAlign: "center" },
  row: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" },
  btn: { height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  ghost: { backgroundColor: colors.surfaceTertiary },
  ghostText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  apply: { backgroundColor: colors.brandPrimary },
  applyText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onBrandPrimary },
});
