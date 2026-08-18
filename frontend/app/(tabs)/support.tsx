import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { HaveAQueryPill } from "@/src/components/have-a-query-pill";
import { useAuth } from "@/src/auth/auth-context";
import { useScrollTopOnFocus } from "@/src/hooks/use-scroll-top-on-focus";
import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";

const PHONE = "0800 368 9822";
const EMAIL = "hello@pricebuddy.co.uk";

const HELP: { icon: IconName; title: string; body: string; bg: string; fg: string }[] = [
  { icon: "document", title: "We check your bills for you", body: "We'll flag errors and confirm the numbers.", bg: colors.pastel.mint, fg: colors.pastel.mintIcon },
  { icon: "bolt", title: "We look for better rates", body: "Across electricity, gas, water and more.", bg: colors.pastel.yellow, fg: colors.pastel.yellowIcon },
  { icon: "building", title: "We handle site changes", body: "Add sites, switch tariffs, and leave the paperwork to us.", bg: colors.pastel.blue, fg: colors.pastel.blueIcon },
  { icon: "phone", title: "Talk to an expert directly", body: "Get quick answers during working hours.", bg: colors.pastel.lavender, fg: colors.pastel.lavenderIcon },
  { icon: "shield", title: "And anything else", body: "From meter installs to supplier disputes — we'll sort it.", bg: colors.pastel.peach, fg: colors.pastel.peachIcon },
];

export default function Support() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const firstName = (user?.full_name?.trim()?.split(/\s+/)[0]) || (user?.email?.split("@")[0]) || "there";
  const initials = (user?.full_name || user?.email || "U").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const scrollRef = useScrollTopOnFocus();

  return (
    <View style={styles.root}>
      <ScreenHeader testID="support-header" title="Support" onBack={() => router.push("/dashboard")} />
      <ScrollView
        ref={scrollRef}
        testID="support-screen"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.amCard} testID="support-account-manager-card">
          <View style={styles.amBanner}>
            <Text style={styles.amGreeting}>Hi {firstName}, we&apos;ve got you.</Text>
            <Text style={styles.amBannerSub}>Any question, any time — we&apos;re a single tap away.</Text>
          </View>
          <View style={styles.amAvatar} testID="support-am-avatar">
            <Text style={styles.amAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.amName} testID="support-am-name">Your account team</Text>
          <Text style={styles.amSub}>Price Buddy support team</Text>

          <Pressable testID="support-call-desk" onPress={() => Linking.openURL(`tel:${PHONE.replace(/\s/g, "")}`)} style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.9 }]}>
            <Icon name="phone" size={18} color="#FFFFFF" />
            <Text style={styles.callText}>Call the desk</Text>
          </Pressable>

          <View style={styles.afterHours} testID="support-after-hours">
            <View style={styles.dot} />
            <Text style={styles.hoursText}>Mon–Fri · 9am – 4pm UK</Text>
            <Text style={styles.sep}>·</Text>
            <Text testID="support-email-link" onPress={() => Linking.openURL(`mailto:${EMAIL}?subject=Support%20request`)} style={styles.emailLink}>
              Drop us an email
            </Text>
          </View>
        </View>

        <View style={{ marginVertical: spacing.sm }}>
          <HaveAQueryPill />
        </View>

        <View style={styles.helpCard} testID="support-help-card">
          <Text style={styles.helpKicker}>WHAT WE DO</Text>
          <Text style={styles.helpTitle}>How our team can help</Text>
          {HELP.map((h, i) => (
            <View key={h.title} style={styles.helpItem} testID={`support-help-item-${i}`}>
              <View style={[styles.helpIcon, { backgroundColor: h.bg }]}><Icon name={h.icon} size={18} color={h.fg} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.helpItemTitle}>{h.title}</Text>
                <Text style={styles.helpItemBody}>{h.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.md },
  amCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingBottom: spacing.lg, alignItems: "center", overflow: "hidden", ...shadow.card },
  amBanner: { alignSelf: "stretch", backgroundColor: "#1A1F36", paddingTop: spacing.lg, paddingBottom: 44, paddingHorizontal: spacing.lg },
  amGreeting: { fontFamily: font.bold, fontSize: type.xl, color: "#FFFFFF" },
  amBannerSub: { fontFamily: font.regular, fontSize: type.sm, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  amAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: -36, borderWidth: 4, borderColor: colors.surface },
  amAvatarText: { fontFamily: font.bold, fontSize: type.xl, color: "#FFFFFF" },
  amName: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: spacing.sm },
  amSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, textAlign: "center", marginTop: 2, marginBottom: spacing.lg },
  callBtn: { alignSelf: "stretch", marginHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 50, borderRadius: radius.md, backgroundColor: colors.brandPrimary },
  callText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
  afterHours: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  hoursText: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  sep: { color: colors.muted, opacity: 0.4 },
  emailLink: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary, textDecorationLine: "underline" },

  helpCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  helpKicker: { fontFamily: font.semibold, fontSize: type.kicker, letterSpacing: 0.5, color: colors.muted, textTransform: "uppercase" },
  helpTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, marginBottom: spacing.xs, letterSpacing: -0.3 },
  helpItem: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  helpIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  helpItemTitle: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  helpItemBody: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2, lineHeight: 18 },
});
