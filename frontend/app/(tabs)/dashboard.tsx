import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Icon } from "@/src/components/icon";
import { HaveAQueryPill } from "@/src/components/have-a-query-pill";
import { SpotlightTour, TourStep } from "@/src/components/spotlight-tour";
import { BusinessSwitcherChip } from "@/src/components/business-switcher-chip";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { useBusiness } from "@/src/business/business-context";
import { AddBusinessModal } from "@/src/components/add-business-modal";
import { MeterInstallModal } from "@/src/components/meter-install-modal";
import { apiRequest } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";

export const TOUR_REPLAY_KEY = "uch_tour_replay";
const SEEN_TRY_IT_KEY = "uch_seen_try_it";

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
  if (h >= 5 && h < 12) return { salutation: "Good morning", subtitle: "A fresh start — let's see what's ahead today." };
  if (h >= 12 && h < 17) return { salutation: "Good afternoon", subtitle: "Mid-day check-in — here's where things stand." };
  return { salutation: "Good evening", subtitle: "Winding down — quick scan before you log off?" };
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const { width, height } = useWindowDimensions();

  const [items, setItems] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addBiz, setAddBiz] = useState(false);
  const [meter, setMeter] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [turningOn, setTurningOn] = useState(false);
  const [showTryIt, setShowTryIt] = useState(false);

  // Guided spotlight tour
  const scanRef = useRef<View>(null);
  const ctaRef = useRef<View>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const tourTriggered = useRef(false);

  const measure = (ref: React.RefObject<View>) =>
    new Promise<{ x: number; y: number; w: number; h: number } | null>((resolve) => {
      if (!ref.current) return resolve(null);
      ref.current.measureInWindow((x, y, w, h) => resolve({ x, y, w, h }));
    });

  const startTour = useCallback(async () => {
    const [scan, cta] = await Promise.all([measure(scanRef), measure(ctaRef)]);
    const tabH = 60 + Math.max(insets.bottom, Platform.OS === "android" ? 10 : 0);
    const tabW = width / 5;
    const sitesRect = { x: tabW * 1, y: height - tabH + 4, w: tabW, h: 52 };
    setTourSteps([
      {
        title: "All your sites & contracts",
        body: 'Tap Sites any time to see your whole portfolio. Got more than one business? Switch between them — or pick "All businesses" to see everything in one list.',
        rect: sitesRect,
      },
      {
        title: "Snap any bill",
        body: "Tap Smart Bill Upload to photograph a bill — we'll auto-extract rates, supplier and renewal date, then our validation engine will confirm the details.",
        rect: scan,
      },
      {
        title: "Hands-free renewal",
        body: "When you're ready, tap this banner to start a quote. Sit back while our platform handles the negotiations and notify you when your bespoke offer is ready.",
        rect: cta,
      },
    ]);
    setTourOpen(true);
  }, [insets.bottom, width, height]);

  const closeTour = useCallback(
    async () => {
      setTourOpen(false);
      try {
        await apiRequest("/me/preferences", { method: "PUT", body: { has_completed_tour: true } });
        refreshUser().catch(() => {});
      } catch {
        /* best-effort persistence */
      }
    },
    [refreshUser],
  );

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<{ items: any[] }>("/renewals/urgent");
      const list = Array.isArray(res?.items) ? res.items : [];
      list.sort((a, b) => (a.days_until_expiry ?? 9999) - (b.days_until_expiry ?? 9999));
      setItems(list);
    } catch {
      setItems([]);
    }
    apiRequest<any[]>("/my/audits-in-progress")
      .then((a) => setAudits(Array.isArray(a) ? a : []))
      .catch(() => setAudits([]));
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
      // Replay requested from Profile: dashboard stays mounted across tabs,
      // so re-check on focus (not just mount).
      storage.getItem<boolean>(TOUR_REPLAY_KEY, false).then((replay) => {
        if (replay) {
          storage.removeItem(TOUR_REPLAY_KEY);
          setTimeout(() => startTour(), 250);
        }
      });
    }, [load, startTour]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Auto-open the guided tour once for first-timers (replay is handled on focus).
  useEffect(() => {
    if (loading || tourTriggered.current || !user) return;
    if (user.has_completed_tour === false) {
      tourTriggered.current = true;
      setTimeout(() => startTour(), 350);
    }
  }, [loading, user, startTour]);

  // "Try it" nudge on Scan: show ONCE for a brand-new user, then never again.
  useEffect(() => {
    if (loading || items.length !== 0) return;
    storage.getItem<boolean>(SEEN_TRY_IT_KEY, false).then((seen) => {
      if (!seen) {
        setShowTryIt(true);
        storage.setItem(SEEN_TRY_IT_KEY, true).catch(() => {});
      }
    });
  }, [loading, items.length]);

  const displayName = useMemo(() => {
    const fn = user?.full_name?.trim();
    if (fn) return fn;
    if (user?.email) return user.email.split("@")[0];
    return "there";
  }, [user]);

  const initials = useMemo(() => {
    const base = user?.full_name || user?.email || "U";
    return base.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  }, [user]);

  const g = greeting();
  const first = items[0];
  const cfg = first ? URGENCY_CFG[urgencyFor(first.days_until_expiry, first.utility_type)] : null;

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
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Greeting */}
          <View style={styles.greetRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.greetTextBlock}>
              <Text testID="dashboard-greeting" style={styles.greetSalutation} numberOfLines={1}>
                {g.salutation},
              </Text>
              <Text testID="dashboard-greeting-name" style={styles.greetName} numberOfLines={2} ellipsizeMode="tail">
                {displayName}
              </Text>
            </View>
            <Pressable testID="dashboard-bell" onPress={() => router.push("/profile")} hitSlop={8} style={styles.bell}>
              <Icon name="bell" size={20} color={colors.heading} />
            </Pressable>
          </View>

          {/* Active business (only when the owner has more than one) */}
          <BusinessSwitcherChip variant="dashboard" testID="dashboard-business-chip" />

          {/* Alerts nudge */}
          {showNudge && (
            <View style={styles.nudge} testID="notif-nudge">
              <View style={styles.nudgeIcon}>
                <Icon name="bell" size={16} color={colors.brandPrimary} />
              </View>
              <Text style={styles.nudgeText}>Turn on renewal alerts</Text>
              <Pressable testID="notif-nudge-turn-on" onPress={turnOnAlerts} disabled={turningOn} style={styles.nudgeBtn}>
                {turningOn ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.nudgeBtnText}>Turn on</Text>}
              </Pressable>
              <Pressable testID="notif-nudge-dismiss" onPress={() => setNudgeDismissed(true)} hitSlop={8} style={styles.nudgeClose}>
                <Ionicons name="close" size={16} color={colors.muted} />
              </Pressable>
            </View>
          )}

          {/* Compact status badge */}
          {items.length === 0 ? (
            <View style={styles.statusBadge} testID="trust-banner">
              <View style={styles.statusIconOk}>
                <Icon name="shield" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>All contracts secured</Text>
                <Text style={styles.statusSub}>Nothing due soon</Text>
              </View>
            </View>
          ) : (
            <Pressable testID="expiring-soon-card" onPress={() => router.push("/renewals")} style={({ pressed }) => [styles.statusBadge, pressed && { opacity: 0.9 }]}>
              <View testID="expiring-count" style={[styles.statusCount, { backgroundColor: cfg?.bg, borderColor: cfg?.border }]}>
                <Text style={[styles.statusCountText, { color: cfg?.accent }]}>{items.length}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.statusTitle}>
                  {items.length === 1 ? "1 contract needs attention" : `${items.length} contracts need attention`}
                </Text>
                <Text style={[styles.statusSub, { color: cfg?.accent }]} numberOfLines={1}>
                  {first.days_until_expiry < 0 ? `${Math.abs(first.days_until_expiry)} days overdue` : `${first.days_until_expiry} days left`} · {utilityLabel(first.utility_type)}
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.muted} />
            </Pressable>
          )}

          {/* Audit in progress */}
          {audits.length > 0 && (
            <View style={styles.audit} testID="audit-in-progress-card">
              <View style={styles.auditIcon}>
                <Icon name="document" size={16} color="#B45309" />
              </View>
              <Text style={styles.auditText}>
                Verifying {audits.length} {audits.length === 1 ? "bill" : "bills"}
              </Text>
            </View>
          )}

          {/* Quick actions — compact 2-column grid */}
          <Text style={styles.quickLabel}>QUICK ACTIONS</Text>
          <View style={styles.quickGrid}>
            <QuickAction testID="quick-action-scan" innerRef={scanRef} icon="scan" bg={colors.pastel.peach} fg={colors.pastel.peachIcon}
              title="Scan Bill" badge={showTryIt ? "Try it" : undefined} onPress={() => router.push("/scan")} />
            <QuickAction testID="quick-action-add-business" icon="building" bg={colors.pastel.blue} fg={colors.pastel.blueIcon}
              title="Add Business" onPress={() => setAddBiz(true)} />
            <QuickAction testID="quick-action-meter" icon="meter" bg={colors.pastel.lavender} fg={colors.pastel.lavenderIcon}
              title="Meter Installation" onPress={() => setMeter(true)} />
            <QuickAction testID="quick-action-contracts" icon="document" bg={colors.pastel.mint} fg={colors.pastel.mintIcon}
              title="View Contracts" onPress={() => router.push("/contracts")} />
          </View>

          {/* Have a query pill */}
          <HaveAQueryPill />

          {/* Lower-bills quote promo — concise */}
          <Pressable ref={ctaRef} collapsable={false} testID="lower-bills-cta" onPress={() => router.push("/quote/new")} style={({ pressed }) => [styles.promo, pressed && { opacity: 0.95 }]}>
            <View style={styles.promoIcon}>
              <Icon name="pound" size={22} color={colors.pastel.mintIcon} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.promoTitle}>Lower your utility bills</Text>
              <Text style={styles.promoSub}>Free market check on your contract</Text>
            </View>
            <View style={styles.promoPill}>
              <Text style={styles.promoPillText}>Get Quote</Text>
              <Icon name="chevronRight" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
        </ScrollView>
      )}

      <AddBusinessModal visible={addBiz} onClose={() => setAddBiz(false)} onCreated={() => { setAddBiz(false); toast("Business added.", "success"); refreshBusinesses(); load(); }} />
      <MeterInstallModal visible={meter} onClose={() => setMeter(false)} />

      <SpotlightTour open={tourOpen} steps={tourSteps} onClose={closeTour} />
    </View>
  );
}

function QuickAction({ icon, bg, fg, title, onPress, testID, badge, innerRef }: {
  icon: any; bg: string; fg: string; title: string; onPress: () => void; testID?: string; badge?: string; innerRef?: React.RefObject<View>;
}) {
  const { width } = useWindowDimensions();
  const fontSize = Math.max(12, Math.min(15, width * 0.037));
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!badge) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      { iterations: 4 },
    );
    loop.start();
    return () => loop.stop();
  }, [badge, scale]);

  return (
    <Pressable ref={innerRef} collapsable={false} testID={testID} onPress={onPress} style={({ pressed }) => [styles.qa, pressed && { opacity: 0.9 }]}>
      {badge ? (
        <Animated.View testID="quick-action-badge" style={[styles.qaBadge, { transform: [{ scale }] }]}>
          <Icon name="sparkle" size={10} color="#FFFFFF" />
          <Text style={styles.qaBadgeText}>{badge}</Text>
        </Animated.View>
      ) : null}
      <View style={[styles.qaIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={22} color={fg} />
      </View>
      <Text style={[styles.qaTitle, { fontSize, lineHeight: fontSize * 1.25 }]} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: 12 },

  greetRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: 4, paddingVertical: 4 },
  greetTextBlock: { flex: 1, minWidth: 0, justifyContent: "center" },
  greetSalutation: { fontFamily: font.medium, fontSize: type.base, color: colors.heading, letterSpacing: -0.1, marginBottom: 1 },
  greetName: { fontFamily: font.semibold, fontSize: type.xl, color: colors.heading, letterSpacing: -0.3, lineHeight: 22 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pastel.lavender, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.bold, fontSize: type.lg, color: colors.pastel.lavenderIcon },
  bell: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadow.card },

  nudge: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.brandTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  nudgeIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  nudgeText: { flex: 1, fontFamily: font.semibold, fontSize: type.sm, color: colors.heading },
  nudgeBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, minWidth: 62, alignItems: "center" },
  nudgeBtnText: { fontFamily: font.semibold, fontSize: type.sm, color: "#FFFFFF" },
  nudgeClose: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadow.card,
  },
  statusIconOk: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center" },
  statusCount: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  statusCountText: { fontFamily: font.bold, fontSize: type.lg },
  statusTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  statusSub: { fontFamily: font.medium, fontSize: type.sm, color: colors.muted, marginTop: 2 },

  audit: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  auditIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  auditText: { flex: 1, fontFamily: font.semibold, fontSize: type.sm, color: "#92400E" },

  quickLabel: { fontFamily: font.semibold, fontSize: type.kicker, letterSpacing: 0.5, color: colors.muted, textTransform: "uppercase", marginTop: 2, marginLeft: 2 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  qa: { width: "47.5%", flexGrow: 1, gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, minHeight: 92, justifyContent: "flex-start" },
  qaIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  qaTitle: { fontFamily: font.bold, color: colors.heading },
  qaBadge: {
    position: "absolute", top: 8, right: 8, zIndex: 2, flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: colors.brandPrimary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill,
  },
  qaBadgeText: { fontFamily: font.bold, fontSize: 10, color: "#FFFFFF", letterSpacing: 0.3 },

  promo: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.pastel.mint, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginTop: spacing.xs },
  promoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  promoTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  promoSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  promoPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.pastel.mintIcon, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill },
  promoPillText: { fontFamily: font.semibold, fontSize: type.sm, color: "#FFFFFF" },
});
