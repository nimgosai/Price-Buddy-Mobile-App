/**
 * DocumentPageCanvas — PROTOTYPE page renderer (image-based / synthetic).
 *
 * ⚠️ Kept deliberately separate from signing logic, field definitions and API
 * calls. Your developer can REPLACE this component with a real PDF viewer (e.g.
 * react-native-pdf in a dev build, or pdf.js) WITHOUT touching the signing
 * workflow — it only needs to:
 *   1. render the page at `displayWidth` preserving the page aspect ratio
 *      (widthPt x heightPt) and `rotation`, and
 *   2. render `children` (the field overlays) positioned on top in the SAME
 *      coordinate space (normalised top-left — see types.ts).
 *
 * Prototype overlay alignment does NOT prove final PDF signature placement.
 */
import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { DocumentPage } from "./types";
import { Icon } from "@/src/components/icon";
import { colors, font, spacing, type } from "@/src/theme/theme";

export function pageDisplaySize(pageSpec: DocumentPage, displayWidth: number) {
  const rotated = pageSpec.rotation === 90 || pageSpec.rotation === 270;
  const w = rotated ? pageSpec.heightPt : pageSpec.widthPt;
  const h = rotated ? pageSpec.widthPt : pageSpec.heightPt;
  return { width: displayWidth, height: displayWidth * (h / w) };
}

export function DocumentPageCanvas({
  pageSpec,
  displayWidth,
  label,
  isFirstPage,
  simulateRenderFailure,
  onContentDisplayed,
  onContentError,
  children,
}: {
  pageSpec: DocumentPage;
  displayWidth: number;
  label?: string;
  /** Wire first-open callbacks only for the FIRST visible page. */
  isFirstPage?: boolean;
  /** MOCK/DEV: force this page to fail to display once. */
  simulateRenderFailure?: boolean;
  /** Fired when the page CONTENT has successfully displayed (image onLoad / synthetic onLayout). */
  onContentDisplayed?: () => void;
  /** Fired when the page content FAILED to display (image onError / simulated). */
  onContentError?: () => void;
  children?: React.ReactNode;
}) {
  const { width, height } = pageDisplaySize(pageSpec, displayWidth);
  const firedError = useRef(false);

  useEffect(() => {
    if (isFirstPage && simulateRenderFailure && !firedError.current) {
      firedError.current = true;
      onContentError?.();
    }
  }, [isFirstPage, simulateRenderFailure, onContentError]);

  if (isFirstPage && simulateRenderFailure) {
    return (
      <View style={[styles.page, { width, height }, styles.failBox]}>
        <Icon name="warning" size={30} color="#B45309" />
        <Text style={styles.failTitle}>Couldn&apos;t display this page</Text>
        <Text style={styles.failSub}>The document didn&apos;t load. First-open is not recorded.</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.page, { width, height }]}
      onLayout={isFirstPage && !pageSpec.imageUri ? () => onContentDisplayed?.() : undefined}
    >
      {pageSpec.imageUri ? (
        <Image
          source={{ uri: pageSpec.imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          onLoad={isFirstPage ? () => onContentDisplayed?.() : undefined}
          onError={isFirstPage ? () => onContentError?.() : undefined}
        />
      ) : (
        <SyntheticPage page={pageSpec.page} label={label} />
      )}
      {/* Overlay layer shares the page's coordinate box exactly. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

function SyntheticPage({ page, label }: { page: number; label?: string }) {
  return (
    <View style={styles.synthetic}>
      <Text style={styles.watermark}>DEMO DOCUMENT</Text>
      <Text style={styles.synthHeader}>{label ?? "Letter of Authority / Supplier Document"}</Text>
      {Array.from({ length: 10 }).map((_, i) => (
        <View key={i} style={[styles.line, { width: `${70 + ((i * 7) % 25)}%` }]} />
      ))}
      <Text style={styles.synthFoot}>Page {page} · unsigned demo copy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.borderStrong, overflow: "hidden" },
  failBox: { alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg },
  failTitle: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading, textAlign: "center" },
  failSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, textAlign: "center" },
  synthetic: { flex: 1, padding: 18 },
  watermark: {
    position: "absolute",
    top: "42%",
    alignSelf: "center",
    fontFamily: font.bold,
    fontSize: 34,
    color: "rgba(124,58,237,0.08)",
    transform: [{ rotate: "-20deg" }],
  },
  synthHeader: { fontFamily: font.bold, fontSize: type.sm, color: colors.heading, marginBottom: 12 },
  line: { height: 7, borderRadius: 4, backgroundColor: "#EEF0F6", marginBottom: 9 },
  synthFoot: { position: "absolute", bottom: 12, left: 18, fontFamily: font.regular, fontSize: 10, color: colors.muted },
});
