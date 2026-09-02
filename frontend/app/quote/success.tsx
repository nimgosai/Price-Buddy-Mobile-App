import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Icon } from "@/src/components/icon";
import { useAuth } from "@/src/auth/auth-context";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const NEXT_STEPS = [
  { emoji: "🔍", text: "We're comparing current UK business tariffs for your site." },
  { emoji: "📞", text: "If we need to verify meter details (MPAN/MPRN), a member of our team will give you a quick call." },
  { emoji: "✉️", text: "Once confirmed, we'll email your custom price comparison and savings breakdown." },
];

export default function QuoteSuccess() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const firstName = (user?.full_name || "").trim().split(/\s+/)[0] || "";

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]} testID="quote-success-screen">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.icon}>
          <Icon name="document" size={44} color={colors.pastel.mintIcon} />
        </View>
        <Text style={styles.title}>Request received</Text>
        <Text style={styles.sub}>
          Thanks{firstName ? ` ${firstName}` : ""}, we&apos;ve received your quote request.
        </Text>

        <View style={styles.nextBox} testID="what-happens-next">
          <Text style={styles.nextTitle}>What happens next:</Text>
          {NEXT_STEPS.map((s, i) => (
            <View key={i} style={styles.nextRow}>
              <Text style={styles.nextEmoji}>{s.emoji}</Text>
              <Text style={styles.nextText}>{s.text}</Text>
            </View>
          ))}
        </View>

        {id ? (
          <View style={styles.refBadge} testID="quote-success-id">
            <Text style={styles.refText}>REFERENCE: {String(id).slice(0, 8).toUpperCase()}</Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.ctas}>
        <Pressable testID="quote-success-home" onPress={() => router.replace("/dashboard")} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.primaryBtnText}>Back to dashboard</Text>
        </Pressable>
        <Pressable testID="quote-success-another" onPress={() => router.replace("/quote/new")} hitSlop={8} style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.linkBtnText}>Request another quote</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.lg },
  body: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, paddingVertical: spacing.lg },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.pastel.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#059669",
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.heading, textAlign: "center", letterSpacing: -0.3, marginBottom: 8 },
  sub: { fontFamily: font.regular, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  nextBox: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 12,
  },
  nextTitle: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  nextRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  nextEmoji: { fontSize: 15, marginTop: 1 },
  nextText: { flex: 1, fontFamily: font.regular, fontSize: type.sm, lineHeight: 19, color: colors.onSurfaceSecondary },
  refBadge: { marginTop: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  refText: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.muted },
  ctas: { gap: 6 },
  primaryBtn: { height: 48, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
  linkBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  linkBtnText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brandPrimary },
});
