import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";

import { Button } from "@/src/components/ui";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const FEATURES = [
  { icon: "alarm-outline" as const, title: "Renewal reminders", body: "Get alerted before contracts end, so nothing rolls over unnoticed." },
  { icon: "scan-outline" as const, title: "Snap a bill", body: "Upload a bill and we'll pull in the details for you." },
  { icon: "trending-down-outline" as const, title: "Better rates", body: "We compare the market before renewal and line up better options." },
  { icon: "headset-outline" as const, title: "Human support", body: "Speak to a dedicated account manager when you need help." },
];

export default function Landing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing["2xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#FDE7DF", "#F8F9FC"]}
          style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}
        >
          <Image
            source={require("../assets/images/pricebuddy-logo.webp")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.eyebrow}>Built for UK businesses of all sizes</Text>
          <Text testID="landing-title" style={styles.headline}>
            Never overpay on utilities again.
          </Text>
          <Text style={styles.accent}>Real human support — not bots.</Text>
          <Text style={styles.sub}>
            Snap a bill, stay ahead of renewals, and get better-rate options before contracts end —
            with a dedicated account manager when you need clear answers.
          </Text>
        </LinearGradient>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.feature} testID={`landing-feature-${i}`}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={22} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}

          <View style={styles.stats}>
            <Stat value="365 days" label="earliest renewal alert before expiry" />
            <Stat value="Same day" label="account manager reply, in working hours" />
            <Stat value="Named manager" label="dedicated to every account from day one" />
          </View>

          <View style={styles.bottomCta}>
            <Text style={styles.bottomCtaTitle}>Ready to take control of your utility bills?</Text>
            <Text style={styles.bottomCtaSub}>Sign up in 30 seconds. No card needed.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          testID="landing-create-account"
          label="Create free account"
          icon="chevron-forward"
          onPress={() => router.push("/splash")}
        />
        <Button
          testID="landing-signin"
          label="I already have an account"
          variant="secondary"
          onPress={() => router.push("/signin")}
        />
        <Pressable testID="landing-partners-link" onPress={() => router.push("/partners")} hitSlop={8} style={styles.partnersLink}>
          <Text style={styles.partnersText}>Are you an accountant? See partner options</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing["2xl"], alignItems: "flex-start" },
  logo: { width: 96, height: 72, marginBottom: spacing.md },
  eyebrow: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.brandPrimary, textTransform: "uppercase", marginBottom: spacing.sm },
  headline: { fontFamily: font.bold, fontSize: type["3xl"], color: colors.heading, letterSpacing: -0.6, lineHeight: 36 },
  accent: { fontFamily: font.semibold, fontSize: type.lg, color: colors.brandPrimary, marginTop: spacing.sm },
  sub: { fontFamily: font.regular, fontSize: type.base, color: colors.onSurfaceSecondary, marginTop: spacing.md, lineHeight: 22 },
  trustStrip: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: spacing.lg },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustDot: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  trustText: { fontFamily: font.medium, fontSize: type.sm, color: colors.muted },

  features: { padding: spacing.xl, gap: spacing.lg },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  featureBody: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2, lineHeight: 18 },

  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  stat: {
    flexGrow: 1,
    minWidth: "30%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  statValue: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  statLabel: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted, marginTop: 2, lineHeight: 14 },

  bottomCta: { backgroundColor: colors.surfaceInverse, borderRadius: radius.md, padding: spacing.xl, marginTop: spacing.sm },
  bottomCtaTitle: { fontFamily: font.bold, fontSize: type.xl, color: "#FFFFFF", letterSpacing: -0.3 },
  bottomCtaSub: { fontFamily: font.regular, fontSize: type.sm, color: "rgba(255,255,255,0.75)", marginTop: spacing.xs },

  partnersLink: { alignSelf: "center", paddingVertical: spacing.xs },
  partnersText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },
  cta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
