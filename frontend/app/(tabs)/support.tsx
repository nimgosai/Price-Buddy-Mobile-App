import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { HaveAQueryPill } from "@/src/components/have-a-query-pill";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

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

  return (
    <View style={styles.root}>
      <ScreenHeader testID="support-header" title="Support" subtitle="We're here to help" />
      <ScrollView
        testID="support-screen"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.amCard} testID="support-account-manager-card">
          <View style={styles.amAvatar} testID="support-am-avatar">
            <Icon name="chat" size={24} color={colors.pastel.lavenderIcon} />
          </View>
          <Text style={styles.amName} testID="support-am-name">Your PriceBuddy team</Text>
          <Text style={styles.amSub}>Any question, any time — we&apos;re a single tap away.</Text>

          <Pressable testID="support-call-desk" onPress={() => Linking.openURL(`tel:${PHONE.replace(/\s/g, "")}`)} style={styles.callBtn}>
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
  amCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, alignItems: "center" },
  amAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.pastel.lavender, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  amName: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  amSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, textAlign: "center", marginTop: 4, marginBottom: spacing.lg },
  callBtn: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 50, borderRadius: radius.md, backgroundColor: colors.brandPrimary },
  callText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
  afterHours: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  hoursText: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  sep: { color: colors.muted, opacity: 0.4 },
  emailLink: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary, textDecorationLine: "underline" },

  helpCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  helpKicker: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 0.8, color: colors.pastel.lavenderIcon, textTransform: "uppercase" },
  helpTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginBottom: spacing.xs },
  helpItem: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  helpIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  helpItemTitle: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  helpItemBody: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2, lineHeight: 18 },
});
