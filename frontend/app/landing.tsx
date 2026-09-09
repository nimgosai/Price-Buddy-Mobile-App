import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";

import { Button } from "@/src/components/ui";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const BADGES = [
  { emoji: "🏢", label: "All-in-One\nUtilities" },
  { emoji: "⚡", label: "18-Month\nEarly Alerts" },
  { emoji: "👤", label: "Named\nManager" },
];

const FEATURES = [
  { icon: "scan-outline" as const, title: "Snap a bill", body: "Upload any energy, water, or broadband bill to track renewal dates automatically." },
  { icon: "trending-down-outline" as const, title: "Better rates", body: "We compare trusted UK suppliers to secure lower rates before contracts expire." },
  { icon: "headset-outline" as const, title: "Human support", body: "Your dedicated account manager handles all utility switches and queries." },
];

export default function Landing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#FDE7DF", "#F8F9FC"]}
          style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
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
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            {BADGES.map((b) => (
              <View key={b.label} style={styles.badge} testID={`landing-badge-${b.label}`}>
                <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                <Text style={styles.badgeLabel}>{b.label}</Text>
              </View>
            ))}
          </View>

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
          </View>

          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to take control of your utility bills?</Text>
            <Text style={styles.ctaSub}>Sign up in 30 seconds. No credit card needed.</Text>
            <Button
              testID="landing-create-account"
              label="Get Started"
              iconRight="arrow-forward"
              onPress={() => router.push("/splash")}
              style={styles.ctaButton}
            />
            <Pressable
              testID="landing-signin"
              onPress={() => router.push("/signin")}
              hitSlop={8}
              style={styles.signinLink}
            >
              <Text style={styles.signinText}>
                Already have an account? <Text style={styles.signinTextBold}>Sign In</Text>
              </Text>
            </Pressable>
          </View>

          <Pressable
            testID="landing-partners-link"
            onPress={() => router.push("/partners")}
            hitSlop={8}
            style={styles.partnersLink}
          >
            <Text style={styles.partnersText}>Are you an accountant? See partner options</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, alignItems: "flex-start" },
  logo: { width: 96, height: 72, marginBottom: spacing.sm },
  eyebrow: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.brandPrimary, textTransform: "uppercase", marginBottom: spacing.sm },
  headline: { fontFamily: font.bold, fontSize: type["3xl"], color: colors.heading, letterSpacing: -0.6, lineHeight: 36 },
  accent: { fontFamily: font.semibold, fontSize: type.lg, color: colors.brandPrimary, marginTop: spacing.sm },

  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md },

  badgeRow: { flexDirection: "row", gap: spacing.sm },
  badge: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    gap: 6,
  },
  badgeEmoji: { fontSize: 20 },
  badgeLabel: { fontFamily: font.semibold, fontSize: type.kicker, color: colors.heading, textAlign: "center", lineHeight: 14 },

  features: { gap: spacing.md },
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

  ctaCard: { backgroundColor: colors.surfaceInverse, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xs },
  ctaTitle: { fontFamily: font.bold, fontSize: type.xl, color: "#FFFFFF", letterSpacing: -0.3, lineHeight: 26 },
  ctaSub: { fontFamily: font.regular, fontSize: type.sm, color: "rgba(255,255,255,0.75)", marginTop: spacing.xs, marginBottom: spacing.md },
  ctaButton: { alignSelf: "stretch" },
  signinLink: { alignSelf: "center", paddingVertical: spacing.sm },
  signinText: { fontFamily: font.regular, fontSize: type.sm, color: "rgba(255,255,255,0.8)" },
  signinTextBold: { fontFamily: font.semibold, color: "#FFFFFF" },

  partnersLink: { alignSelf: "center", paddingVertical: spacing.xs },
  partnersText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },
});
