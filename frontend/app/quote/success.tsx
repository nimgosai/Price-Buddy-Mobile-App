import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/src/components/ui";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export default function QuoteSuccess() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.body} testID="quote-success">
        <View style={styles.icon}>
          <Ionicons name="checkmark" size={44} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Quote request submitted</Text>
        <Text style={styles.sub}>
          Thanks — our team is on it. We&apos;ll compare the market and come back with your best options.
        </Text>
        {id ? (
          <View style={styles.refCard}>
            <Text style={styles.refLabel}>YOUR REFERENCE</Text>
            <Text testID="quote-success-ref" style={styles.refValue}>{String(id)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cta}>
        <Button testID="quote-success-done" label="Back to home" onPress={() => router.replace("/dashboard")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.xl, justifyContent: "space-between" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  icon: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  title: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, textAlign: "center", letterSpacing: -0.4 },
  sub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, textAlign: "center", lineHeight: 22, paddingHorizontal: spacing.md },
  refCard: { marginTop: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: "center" },
  refLabel: { fontFamily: font.semibold, fontSize: type.kicker, letterSpacing: 0.5, color: colors.muted, textTransform: "uppercase" },
  refValue: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: 2 },
  cta: {},
});
