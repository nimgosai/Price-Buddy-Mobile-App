import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const SECTIONS = [
  {
    icon: "scan-outline" as const,
    title: "Snap a bill",
    body: "Take a photo of any utility bill. We read the supplier, tariff, rates and key dates automatically.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "We verify it",
    body: "Our team checks the extracted details against your account, usually within one working day. You'll see it under 'Audit in progress' on your dashboard.",
  },
  {
    icon: "alarm-outline" as const,
    title: "We watch your renewals",
    body: "Every contract is tracked. We flag renewals inside the 90-day action window so you never roll onto an expensive out-of-contract rate.",
  },
  {
    icon: "pricetag-outline" as const,
    title: "We find better deals",
    body: "Ask for a quote on any utility and we shop the market for you. There's no obligation — we only switch you if it saves money.",
  },
];

export default function Help() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/profile"));

  return (
    <View style={styles.root}>
      <ScreenHeader testID="help-header" title="How it works" onBack={goBack} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((s, i) => (
          <Card key={i} testID={`help-section-${i}`} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={s.icon} size={22} color={colors.brandPrimary} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  body: { fontFamily: font.regular, fontSize: type.base, color: colors.onSurfaceSecondary, lineHeight: 20 },
});
