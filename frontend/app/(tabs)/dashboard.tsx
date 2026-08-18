import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { AddBusinessModal } from "@/src/components/add-business-modal";
import { MeterInstallModal } from "@/src/components/meter-install-modal";
import { apiRequest } from "@/src/api/client";
import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";

const UTILITY_LABEL: Record<string, string> = {
  electricity: "Electricity",
  electric: "Electricity",
  gas: "Gas",
  water: "Water",
  telecoms: "Telecoms",
  broadband: "Broadband",
};

function utilityLabel(u?: string): string {
  const k = (u || "").toLowerCase();
  if (UTILITY_LABEL[k]) return UTILITY_LABEL[k];
  return u ? u.charAt(0).toUpperCase() + u.slice(1) : "Utility";
}

// Mirrors the live web app urgency function fl(daysLeft, utility)
function urgencyFor(days: number | null | undefined, utility?: string): string {
  if (days === null || days === undefined) return "missing";
  if (days <= 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 60) return "high";
  if (days <= 90) return "medium";
  const u = (utility || "").toLowerCase();
  if (["electricity", "electric", "gas"].includes(u) && days <= 365) return "renewable";
  if (days <= 180) return "low";
  return "normal";
}

type Cfg = { title: string; pill: string; accent: string; bg: string; border: string };
const URGENCY_CFG: Record<string, Cfg> = {
  missing: { title: "Action required: end date missing", pill: "No end date", accent: "#EA580C", bg: "#FFF1ED", border: "#FFE0D6" },
  expired: { title: "Action required: contract has ended", pill: "Expired", accent: "#991B1B", bg: "#FEE2E2", border: "#FECACA" },
  critical: { title: "Action required: Avoid out-of-contract rates", pill: "Critical", accent: "#DC2626", bg: "#FFE7E1", border: "#FECACA" },
  high: { title: "Action required: Avoid out-of-contract rates", pill: "Ending soon", accent: "#EA580C", bg: "#FFF1ED", border: "#FFE0D6" },
  medium: { title: "Renewal window opening", pill: "Approaching", accent: "#B45309", bg: "#FEF3C7", border: "#FDE68A" },
  renewable: { title: "Renewable now — lock in a new rate", pill: "Renewable now", accent: "#6D28D9", bg: "#EDE9FE", border: "#DDD6FE" },
  low: { title: "Upcoming contract renewals", pill: "Tracking", accent: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE" },
  normal: { title: "All good — tracking your contracts", pill: "Locked in", accent: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
};

function greeting(): { salutation: string; subtitle: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12)
    return { salutation: "Good Morning", subtitle: "A fresh start — let's see what's ahead today." };
  if (h >= 12 && h < 17)
    return { salutation: "Good Afternoon", subtitle: "Mid-day check-in — here's where things stand." };
  return { salutation: "Good Evening", subtitle: "Winding down — quick scan before you log off?" };
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, refreshUser } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addBiz, setAddBiz] = useState(false);
  const [meter, setMeter] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [turningOn, setTurningOn] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<{ items: any[] }>("/renewals/urgent");
      const list = Array.isArray(res?.items) ? res.items : [];
      list.sort((a, b) => (a.days_until_expiry ?? 9999) - (b.days_until_expiry ?? 9999));
      setItems(list);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const firstName = useMemo(() => {
    const fn = user?.full_name?.trim();
    if (fn) return fn.split(/\s+/)[0];
    if (user?.email) return user.email.split("@")[0];
    return "there";
  }, [user]);

  const initials = useMemo(() => {
    const base = user?.full_name || user?.email || "U";
    return base
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user]);

  const g = greeting();
  const first = items[0];
  const cfg = first ? URGENCY_CFG[urgencyFor(first.days_until_expiry, first.utility_type)] : null;
  const uniqueUtils = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    items.forEach((it) => {
      const l = utilityLabel(it.utility_type);
      if (!seen.has(l)) {
        seen.add(l);
        out.push(l);
      }
    });
    return out;
  }, [items]);

  const showNudge = !nudgeDismissed && !user?.push_notifications_enabled;

  const turnOnAlerts = async () => {
    setTurningOn(true);
    try {
      await apiRequest("/me/preferences", {
        method: "PUT",
        body: {
          email_notifications_enabled: user?.email_notifications_enabled ?? true,
          push_notifications_enabled: true,
        },
      });
      refreshUser().catch(() => {});
      toast("Alerts are on — we'll keep you posted.", "success");
      setNudgeDismissed(true);
    } catch {
      toast("Couldn't turn on alerts.", "error");
    } finally {
      setTurningOn(false);
    }
  };

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={[styles.center, { paddingTop: insets.top }]} testID="dashboard-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          testID="dashboard-scroll"
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing["2xl"] },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Greeting */}
          <View style={styles.greetRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text testID="dashboard-greeting" style={styles.greetTitle} numberOfLines={1}>
                {g.salutation}, {firstName}
              </Text>
              <Text style={styles.greetSub} numberOfLines={1}>
                {g.subtitle}
              </Text>
            </View>
            <Pressable
              testID="dashboard-bell"
              onPress={() => router.push("/profile")}
              hitSlop={8}
              style={styles.bell}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.heading} />
            </Pressable>
          </View>

          {/* Alerts nudge */}
          {showNudge && (
            <View style={styles.nudge} testID="notif-nudge">
              <View style={styles.nudgeIcon}>
                <Ionicons name="notifications" size={18} color={colors.brandPrimary} />
              </View>
              <Text style={styles.nudgeText}>Turn on alerts so you never miss a renewal deadline.</Text>
              <Pressable
                testID="notif-nudge-turn-on"
                onPress={turnOnAlerts}
                disabled={turningOn}
                style={styles.nudgeBtn}
              >
                {turningOn ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.nudgeBtnText}>Turn on</Text>
                )}
              </Pressable>
              <Pressable
                testID="notif-nudge-dismiss"
                onPress={() => setNudgeDismissed(true)}
                hitSlop={8}
                style={styles.nudgeClose}
              >
                <Ionicons name="close" size={16} color={colors.muted} />
              </Pressable>
            </View>
          )}

          {/* Trust banner (nothing urgent) OR Action-required card */}
          {items.length === 0 ? (
            <View style={styles.trust} testID="trust-banner">
              <View style={styles.trustIcon}>
                <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustKicker}>Fully secured</Text>
                <Text style={styles.trustTitle}>You&apos;re completely covered</Text>
                <Text style={styles.trustSub}>
                  No utility contracts expiring soon — our systems are watching everything.
                </Text>
              </View>
            </View>
          ) : (
            <Pressable
              testID="expiring-soon-card"
              onPress={() => router.push("/renewals")}
              style={({ pressed }) => [styles.attnCard, pressed && { opacity: 0.95 }]}
            >
              <View style={styles.attnTop}>
                <View
                  testID="expiring-count"
                  style={[
                    styles.attnCount,
                    { backgroundColor: cfg?.bg, borderColor: cfg?.border },
                  ]}
                >
                  <Text style={[styles.attnCountText, { color: cfg?.accent }]}>{items.length}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.attnDaysRow}>
                    <View style={[styles.attnDot, { backgroundColor: cfg?.accent }]} />
                    <Text style={[styles.attnDays, { color: cfg?.accent }]}>
                      {first.days_until_expiry < 0
                        ? `${Math.abs(first.days_until_expiry)} days overdue`
                        : `${first.days_until_expiry} days remaining`}
                    </Text>
                  </View>
                  <Text style={styles.attnMeta} numberOfLines={1}>
                    {utilityLabel(first.utility_type)}
                    {first.supplier_name ? ` · ${first.supplier_name}` : ""}
                    {first.business_name ? ` · ${first.business_name}` : ""}
                    {items.length > 1 ? ` · +${items.length - 1} more` : ""}
                  </Text>
                </View>
                {first.renewable_now ? (
                  <View
                    style={[styles.renewPill, { backgroundColor: cfg?.bg, borderColor: cfg?.border }]}
                  >
                    <Text style={[styles.renewPillText, { color: cfg?.accent }]}>Renewable now</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.attnTitle}>{cfg?.title}</Text>

              {uniqueUtils.length > 0 && (
                <View style={styles.chipRow}>
                  {uniqueUtils.map((u) => (
                    <View key={u} style={styles.chip}>
                      <Text style={styles.chipText}>{u}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.attnLink}>
                <Text style={styles.attnLinkText}>
                  {items.length > 1 ? `View these ${items.length} contracts` : "View this contract"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.heading} />
              </View>
            </Pressable>
          )}

          {/* Quick actions */}
          <Text style={styles.quickLabel}>QUICK ACTIONS</Text>
          <View style={styles.quickGrid}>
            <QuickAction
              testID="quick-action-scan"
              icon="scan-outline"
              bg={colors.pastel.peach}
              fg={colors.pastel.peachIcon}
              title="Smart Bill Upload"
              desc="Upload electric or gas bills. We'll handle your renewal."
              onPress={() => router.push("/scan")}
            />
            <QuickAction
              testID="quick-action-add-business"
              icon="business-outline"
              bg={colors.pastel.blue}
              fg={colors.pastel.blueIcon}
              title="Add another business"
              desc="Manage multiple companies under one account."
              onPress={() => setAddBiz(true)}
            />
            <QuickAction
              testID="quick-action-meter"
              icon="speedometer-outline"
              bg={colors.pastel.lavender}
              fg={colors.pastel.lavenderIcon}
              title="Meter Installation"
              desc="Smart meter, new electric or gas supply."
              onPress={() => setMeter(true)}
            />
          </View>

          {/* Lower-bills quote promo */}
          <Pressable
            testID="lower-bills-cta"
            onPress={() => router.push("/quote/new")}
            style={({ pressed }) => [styles.promo, pressed && { opacity: 0.95 }]}
          >
            <View style={styles.promoIcon}>
              <Ionicons name="cash-outline" size={24} color={colors.pastel.mintIcon} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.promoTitle}>Need to lower your business utility bills in the UK?</Text>
              <Text style={styles.promoSub}>
                <Text style={styles.promoSubStrong}>Get a quote</Text> — we&apos;ll market-check your contract.
              </Text>
            </View>
            <View style={styles.promoPill}>
              <Text style={styles.promoPillText}>Get Quote</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
        </ScrollView>
      )}

      <AddBusinessModal
        visible={addBiz}
        onClose={() => setAddBiz(false)}
        onCreated={() => {
          setAddBiz(false);
          toast("Business added.", "success");
          load();
        }}
      />
      <MeterInstallModal visible={meter} onClose={() => setMeter(false)} />
    </View>
  );
}

function QuickAction({
  icon,
  bg,
  fg,
  title,
  desc,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  fg: string;
  title: string;
  desc: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.qa, pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.qaIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={fg} />
      </View>
      <Text style={styles.qaTitle}>{title}</Text>
      <Text style={styles.qaDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md },

  greetRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.pastel.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.bold, fontSize: type.lg, color: colors.pastel.lavenderIcon },
  greetTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, letterSpacing: -0.3 },
  greetSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },

  nudge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  nudgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  nudgeText: { flex: 1, fontFamily: font.medium, fontSize: type.sm, color: colors.heading, lineHeight: 18 },
  nudgeBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minWidth: 66,
    alignItems: "center",
  },
  nudgeBtnText: { fontFamily: font.semibold, fontSize: type.sm, color: "#FFFFFF" },
  nudgeClose: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },

  trust: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  trustIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  trustKicker: { fontFamily: font.bold, fontSize: type.sm, color: "#065F46" },
  trustTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: 2 },
  trustSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: 4, lineHeight: 18 },

  attnCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  attnTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  attnCount: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  attnCountText: { fontFamily: font.bold, fontSize: type.xl },
  attnDaysRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  attnDot: { width: 8, height: 8, borderRadius: 4 },
  attnDays: { fontFamily: font.bold, fontSize: type.sm },
  attnMeta: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: 3 },
  renewPill: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1 },
  renewPillText: { fontFamily: font.semibold, fontSize: 11 },
  attnTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: spacing.md },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  chip: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  chipText: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },
  attnLink: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: spacing.md },
  attnLinkText: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },

  quickLabel: {
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.muted,
    marginTop: spacing.sm,
    marginLeft: 2,
  },
  quickGrid: { flexDirection: "row", gap: spacing.sm },
  qa: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  qaIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  qaTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  qaDesc: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, marginTop: 4, lineHeight: 16 },

  promo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.pastel.mint,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  promoIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  promoTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  promoSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: 4 },
  promoSubStrong: { fontFamily: font.bold, color: colors.heading },
  promoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.pastel.mintIcon,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  promoPillText: { fontFamily: font.semibold, fontSize: type.sm, color: "#FFFFFF" },
});
