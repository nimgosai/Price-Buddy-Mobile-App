import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";

import { Button } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const BENEFITS = [
  { icon: "people-outline" as const, title: "Onboard clients in seconds", body: "Send a secure invite link — clients upload a bill or request a callback, no logins to manage." },
  { icon: "eye-outline" as const, title: "Full visibility", body: "See every client's contract status and renewal urgency from one dashboard." },
  { icon: "lock-closed-outline" as const, title: "Rates stay private", body: "You see contract status and history — never the underlying tariff rates." },
  { icon: "sync-outline" as const, title: "Works with Xero", body: "Sync status updates straight into your accounting workflow." },
];

export default function Partners() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/landing"));

  return (
    <View style={styles.root}>
      <ScreenHeader testID="partners-header" title="For accountants" onBack={goBack} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing["2xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={["#FDE7DF", "#F8F9FC"]} style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="briefcase" size={22} color={colors.brandPrimary} />
          </View>
          <Text testID="partners-title" style={styles.headline}>
            Save your clients money on utilities
          </Text>
          <Text style={styles.sub}>
            Refer your clients to PriceBuddy and give them expert utility contract management — while
            you keep full oversight.
          </Text>
        </LinearGradient>

        <View style={styles.list}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.item} testID={`partners-benefit-${i}`}>
              <View style={styles.itemIcon}>
                <Ionicons name={b.icon} size={22} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{b.title}</Text>
                <Text style={styles.itemBody}>{b.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          testID="partners-cta"
          label="Become a partner"
          icon="open-outline"
          onPress={() => Linking.openURL("https://pricebuddy.co.uk/partners")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  hero: { paddingHorizontal: spacing.xl, paddingVertical: spacing["2xl"], alignItems: "flex-start", gap: spacing.md },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headline: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, letterSpacing: -0.5, lineHeight: 32 },
  sub: { fontFamily: font.regular, fontSize: type.lg, color: colors.onSurfaceSecondary, lineHeight: 24 },
  list: { padding: spacing.xl, gap: spacing.lg },
  item: { flexDirection: "row", gap: spacing.md },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  itemBody: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2, lineHeight: 20 },
  cta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
