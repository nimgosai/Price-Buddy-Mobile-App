import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Icon } from "@/src/components/icon";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

// Mirrors the original web app's quote success screen exactly.
export default function QuoteSuccess() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]} testID="quote-success-screen">
      <View style={styles.body}>
        <View style={styles.icon}>
          <Icon name="document" size={48} color={colors.pastel.mintIcon} />
        </View>
        <Text style={styles.title}>Request received</Text>
        <Text style={styles.sub}>
          Our team is on it. We&apos;ll email you the best rates we can find for your selected services within 1 business day.
        </Text>
        {id ? (
          <Text testID="quote-success-id" style={styles.ref}>Reference: {String(id).slice(0, 8)}</Text>
        ) : null}
      </View>
      <View style={styles.ctas}>
        <Pressable testID="quote-success-home" onPress={() => router.replace("/dashboard")} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.primaryBtnText}>Back to dashboard</Text>
        </Pressable>
        <Pressable testID="quote-success-another" onPress={() => router.replace("/quote/new")} style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.7 }]}>
          <Icon name="plus" size={16} color={colors.brandPrimary} />
          <Text style={styles.ghostBtnText}>Request another quote</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.lg },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  icon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.pastel.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    shadowColor: "#059669",
    shadowOpacity: 0.2,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: { fontFamily: font.bold, fontSize: type["3xl"], color: colors.heading, textAlign: "center", letterSpacing: -0.5, marginBottom: 12 },
  sub: { fontFamily: font.regular, fontSize: type.title, color: colors.muted, textAlign: "center", lineHeight: 22, maxWidth: 320 },
  ref: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.muted, textTransform: "uppercase", marginTop: 14 },
  ctas: { gap: 10 },
  primaryBtn: { height: 52, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
  ghostBtn: { height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  ghostBtnText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brandPrimary },
});
