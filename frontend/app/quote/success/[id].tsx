import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/src/components/ui";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export default function QuoteSuccess() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing["3xl"] }]}>
        <View style={styles.icon}>
          <Ionicons name="checkmark" size={44} color="#fff" />
        </View>
        <Text testID="quote-success-title" style={styles.title}>
          Quote request sent
        </Text>
        <Text style={styles.sub}>
          Our team is now shopping the market for you. We&apos;ll be in touch with the best
          options we can find — usually within a couple of working days.
        </Text>
        <View style={styles.steps}>
          {[
            { icon: "search-outline", text: "We compare suppliers on your behalf" },
            { icon: "call-outline", text: "We call or email you with the best deal" },
            { icon: "thumbs-up-outline", text: "You decide — no obligation to switch" },
          ].map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons name={s.icon as any} size={18} color={colors.brandPrimary} />
              </View>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}
        </View>
        <Button
          testID="quote-success-done"
          label="Back to dashboard"
          onPress={() => router.replace("/dashboard")}
          style={{ alignSelf: "stretch", marginTop: spacing["2xl"] }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  wrap: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xl },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, textAlign: "center" },
  sub: {
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  steps: { alignSelf: "stretch", gap: spacing.md, marginTop: spacing["2xl"] },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { flex: 1, fontFamily: font.medium, fontSize: type.base, color: colors.onSurface },
});
