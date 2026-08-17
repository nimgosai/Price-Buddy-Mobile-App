import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/src/components/ui";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const FEATURES = [
  { icon: "scan-outline" as const, title: "Snap any bill", body: "We read the details automatically" },
  { icon: "trending-down-outline" as const, title: "Cut your costs", body: "We shop the market for better rates" },
  { icon: "alarm-outline" as const, title: "Renewal reminders", body: "Never roll onto an expensive tariff" },
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
          style={[styles.hero, { paddingTop: insets.top + spacing["2xl"] }]}
        >
          <Image
            source={require("../assets/images/pricebuddy-logo.webp")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text testID="landing-title" style={styles.headline}>
            Take control of your business utilities
          </Text>
          <Text style={styles.sub}>
            Utility Contract Hub keeps your energy, water and telecoms contracts in one place — and
            helps you pay less.
          </Text>
        </LinearGradient>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.feature} testID={`landing-feature-${i}`}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={24} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          testID="landing-create-account"
          label="Create free account"
          onPress={() => router.push("/signup")}
        />
        <Button
          testID="landing-signin"
          label="I already have an account"
          variant="secondary"
          onPress={() => router.push("/signin")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing["2xl"], alignItems: "flex-start" },
  logo: { width: 96, height: 80, marginBottom: spacing.lg },
  headline: { fontFamily: font.bold, fontSize: type["3xl"], color: colors.heading, letterSpacing: -0.5, lineHeight: 36 },
  sub: { fontFamily: font.regular, fontSize: type.lg, color: colors.onSurfaceSecondary, marginTop: spacing.md, lineHeight: 24 },
  features: { padding: spacing.xl, gap: spacing.lg },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  featureBody: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2 },
  cta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
