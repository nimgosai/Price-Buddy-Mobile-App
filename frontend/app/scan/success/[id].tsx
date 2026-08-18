import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import dayjs from "dayjs";

import { Icon, IconName } from "@/src/components/icon";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const SUPPORT_PHONE = "0800 368 9822";

function tierFor(days: number | null, utility?: string): string {
  if (days === null) return "missing";
  if (days <= 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 60) return "high";
  if (days <= 90) return "medium";
  const u = (utility || "").toLowerCase();
  if (["electricity", "electric", "gas"].includes(u) && days <= 365) return "renewable";
  if (days <= 180) return "low";
  return "normal";
}

type Cfg = {
  route: "A" | "B";
  icon: IconName;
  grad: [string, string];
  headline: string;
  body: (end: string | null, days: number | null) => string;
};

const CFG: Record<string, Cfg> = {
  missing: {
    route: "A", icon: "scan", grad: ["#FB923C", "#EA580C"], headline: "Bill analyzed!",
    body: () => "We couldn't read an end date from this bill. We've pulled live quotes so you can lock in a competitive rate right away, just in case.",
  },
  expired: {
    route: "A", icon: "bolt", grad: ["#DC2626", "#991B1B"], headline: "Your contract has ended.",
    body: (end) => `${end ? `Your contract ended on ${end}` : "This contract is past its end date"} — meaning you're currently rolling on out-of-contract rates (typically 30–80% higher). Lock in a new rate today to stop the bleed.`,
  },
  critical: {
    route: "A", icon: "bolt", grad: ["#EF4444", "#DC2626"], headline: "Bill analyzed! Your contract is ending soon.",
    body: (end, days) => `Your contract ends ${end ? `on ${end}` : `in ${days} days`}. To save you from rolling onto expensive out-of-contract rates, we've pulled live market quotes for you.`,
  },
  high: {
    route: "A", icon: "bolt", grad: ["#FB923C", "#EA580C"], headline: "Bill analyzed! Time to start shopping.",
    body: (end, days) => `Your contract ends ${end ? `on ${end}` : `in about ${days} days`}. That's the sweet spot to compare suppliers — we've pulled live market quotes so you can lock in before rates move.`,
  },
  medium: {
    route: "A", icon: "bolt", grad: ["#FBBF24", "#D97706"], headline: "Bill analyzed! Your renewal window is open.",
    body: (end, days) => `Your contract ends ${end ? `on ${end}` : `in roughly ${days} days`} — you're inside the 90-day action window. Worth scoping out live quotes now so you have time to pick the best deal.`,
  },
  renewable: {
    route: "A", icon: "bolt", grad: ["#A78BFA", "#6D28D9"], headline: "Bill added! You're in the renewable window.",
    body: (end, days) => `UK businesses can lock in a new energy contract up to 12 months before the current one ends — and yours ends ${end ? `on ${end}` : `in ${days} days`}. We've pulled live market quotes so you can secure the rate now.`,
  },
  low: {
    route: "B", icon: "shield", grad: ["#A78BFA", "#6D28D9"], headline: "Bill added to your dashboard!",
    body: (end, days) => `We've parsed your details. Your contract is locked in until ${end || `${days} days out`}. You don't need to do a thing — we're tracking this and will ping you 90 days before your renewal window opens.`,
  },
  normal: {
    route: "B", icon: "shield", grad: ["#10B981", "#059669"], headline: "Bill added to your dashboard!",
    body: (end) => `Nice — you're locked in until ${end || "the renewal date"}. We're tracking this and will alert you at 365, 180 and 90 days before renewal so you never get caught off-guard.`,
  },
};

export default function ScanSuccess() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const p = useLocalSearchParams<{
    property_id?: string;
    status?: string;
    contract_end_date?: string;
    supplier_name?: string;
    utility_type?: string;
  }>();

  const { tier, endDisplay, days } = useMemo(() => {
    const end = p.contract_end_date;
    if (!end) return { tier: "missing", endDisplay: null as string | null, days: null as number | null };
    const d = dayjs(end);
    if (!d.isValid()) return { tier: "missing", endDisplay: null, days: null };
    const diff = d.startOf("day").diff(dayjs().startOf("day"), "day");
    return { tier: tierFor(diff, p.utility_type), endDisplay: d.format("D MMM YYYY"), days: diff };
  }, [p.contract_end_date, p.utility_type]);

  const cfg = CFG[tier];
  const pending = p.status === "pending_review";

  const quoteHref = () => {
    const parts: string[] = [];
    if (p.utility_type) parts.push(`utility=${encodeURIComponent(p.utility_type)}`);
    if (p.supplier_name) parts.push(`incumbent=${encodeURIComponent(p.supplier_name)}`);
    if (p.property_id) parts.push(`property=${encodeURIComponent(p.property_id)}`);
    return parts.length ? `/quote/new?${parts.join("&")}` : "/quote/new";
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={cfg.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circle}>
          <Icon name={cfg.icon} size={48} color="#FFFFFF" />
        </LinearGradient>

        <Text testID="scan-success-headline" style={styles.headline}>{cfg.headline}</Text>
        <Text testID="scan-success-subtext" style={styles.body}>{cfg.body(endDisplay, days)}</Text>

        {pending && (
          <View style={styles.auditCard} testID="audit-team-card">
            <Text style={styles.auditText}>
              <Text style={styles.auditStrong}>Heads up: </Text>
              Our Audit Team will verify the parsed details and may call to confirm anything that needs
              a second look.
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {cfg.route === "A" ? (
            <Pressable testID="success-view-live-quotes" onPress={() => router.replace(quoteHref() as any)}>
              <LinearGradient colors={cfg.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                <Icon name="bolt" size={18} color="#FFFFFF" />
                <Text style={styles.primaryText}>View Live Quotes</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable testID="success-go-to-dashboard" onPress={() => router.replace("/dashboard")} style={[styles.primaryBtn, { backgroundColor: colors.brandPrimary }]}>
              <Text style={styles.primaryText}>Go to Dashboard</Text>
            </Pressable>
          )}

          {p.property_id ? (
            <Pressable testID="success-view-site" onPress={() => router.replace(`/sites/${p.property_id}`)} style={styles.ghostBtn}>
              <Text style={styles.ghostText}>View site details</Text>
            </Pressable>
          ) : null}

          <Pressable
            testID="scan-success-call-us"
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`)}
            style={styles.ghostBtn}
          >
            <Icon name="phone" size={16} color={colors.onSurfaceSecondary} />
            <Text style={[styles.ghostText, { color: colors.onSurfaceSecondary }]}>Got a question? Call {SUPPORT_PHONE}</Text>
          </Pressable>

          <Pressable testID="success-scan-another" onPress={() => router.replace("/scan")} style={styles.ghostBtn}>
            <Icon name="scan" size={18} color={colors.heading} />
            <Text style={styles.ghostText}>Scan another bill</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { paddingHorizontal: spacing.lg, alignItems: "center" },
  circle: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  headline: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, textAlign: "center", marginBottom: spacing.md },
  body: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, textAlign: "center", lineHeight: 22, maxWidth: 360, marginBottom: spacing.lg },
  auditCard: { alignSelf: "stretch", backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  auditText: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, lineHeight: 19 },
  auditStrong: { fontFamily: font.bold, color: colors.heading },
  actions: { alignSelf: "stretch", gap: spacing.sm },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 52, borderRadius: radius.md },
  primaryText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
  ghostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 50, borderRadius: radius.md },
  ghostText: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
});
