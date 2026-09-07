import { StyleSheet, Text, View } from "react-native";

import { font } from "@/src/theme/theme";

/**
 * Renders a single glyph in every font family/weight once at the app root so the
 * engine rasterizes and caches each typeface up front. Without this, a screen
 * that is the first to use a given weight can briefly paint a fallback font
 * (FOUT) before swapping to the custom face. Kept fully off-screen / invisible.
 */
export function FontWarmup() {
  return (
    <View style={styles.hidden} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Text style={{ fontFamily: font.regular }}>.</Text>
      <Text style={{ fontFamily: font.medium }}>.</Text>
      <Text style={{ fontFamily: font.semibold }}>.</Text>
      <Text style={{ fontFamily: font.bold }}>.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: "absolute", top: -1000, left: -1000, width: 1, height: 1, opacity: 0 },
});
