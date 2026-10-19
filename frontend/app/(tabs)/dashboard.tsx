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
import Ionicons from "@react-native-vector-icons/ionicons";

import { Icon, IconName } from "@/src/components/icon";
import { HaveAQueryPill } from "@/src/components/have-a-query-pill";
import { CtaShimmer } from "@/src/components/cta-shimmer";
import { SpotlightTour, TourStep } from "@/src/components/spotlight-tour";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { MeterInstallModal } from "@/src/components/meter-install-modal";
import { apiRequest } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { useTabScrollToTop } from "@/src/utils/use-tab-scroll-to-top";
import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";
import { DESKTOP_CONTENT_MAX, desktopTabBarPad, useIsDesktop } from "@/src/utils/use-desktop";

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
  const { width, height } = useWindowDimensions();
  const scrollRef = useTabScrollToTop();
  const isDesktop = useIsDesktop();

  const [items, setItems] = useState<any[]>([]);
  const [contractCount, setContractCount] = useState<number | null>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meter, setMeter] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [turningOn, setTurningOn] = useState(false);
  const [showTryIt, setShowTryIt] = useState(false);
  const [callingId, setCallingId] = useState<string | null>(null);

  // Guided spotlight tour
  const scanRef = useRef<View>(null);
  const ctaRef = useRef<View>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const tourTriggered = useRef(false);

  const measure = (ref: React.RefObject<View | null>) =>
    new Promise<{ x: number; y: number; w: number; h: number } | null>((resolve) => {
      if (!ref.current) return resolve(null);
      ref.current.measureInWindow((x, y, w, h) => resolve({ x, y, w, h }));
    });

  const startTour = useCallback(async () => {
    const [scan, cta] = await Promise.all([measure(scanRef), measure(ctaRef)]);
    const tabH = 60 + Math.max(insets.bottom, Platform.OS === "android" ? 10 : 0);
    const tabPad = desktopTabBarPad(width, isDesktop); // 0 on mobile
    const tabW = (width - tabPad * 2) / 5;
    const sitesRect = { x: tabPad + tabW * 1, y: height - tabH + 4, w: tabW, h: 52 };
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
  }, [insets.bottom, width, height, isDesktop]);

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
    try {
      const ov = await apiRequest<any>("/dashboard/overview");
      const all = ov?.all_contracts || ov?.contracts || [];
      setContractCount(Array.isArray(all) ? all.length : 0);
    } catch {
      setContractCount(0);
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

  const utilChips = useMemo(() => {
    const EMOJI: Record<string, string> = { electricity: "⚡", electric: "⚡", gas: "🔥", water: "💧", telecoms: "🌐", broadband: "🌐" };
    const map = new Map<string, { label: string; emoji: string; count: number }>();
    items.forEach((it) => {
      const key = String(it.utility_type || "").toLowerCase();
      const label = utilityLabel(it.utility_type);
      const e = map.get(label) || { label, emoji: EMOJI[key] || "•", count: 0 };
      e.count += 1;
      map.set(label, e);
    });
    return Array.from(map.values());
  }, [items]);

  const requestCall = async (id: string) => {
    setCallingId(id);
    try {
      await apiRequest(`/scans/${id}/request-call`, { method: "POST" });
      const a = await apiRequest<any[]>("/my/audits-in-progress");
      setAudits(Array.isArray(a) ? a : []);
    } catch {
      toast("Couldn't send the request. Please try again.", "error");
    } finally {
      setCallingId(null);
    }
  };

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

  const greetEl = (
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
  );

  // Alerts nudge
  const nudgeEl = showNudge && (
            <View style={styles.nudge} testID="notif-nudge">
              <View style={styles.nudgeIcon}>
                <Icon name="bell" size={16} color={colors.brandPrimary} />
              </View>
              <Text style={styles.nudgeText}>Turn on alerts so you never miss a renewal deadline.</Text>
              <Pressable testID="notif-nudge-turn-on" onPress={turnOnAlerts} disabled={turningOn} style={styles.nudgeBtn}>
                {turningOn ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.nudgeBtnText}>Turn on</Text>}
              </Pressable>
              <Pressable testID="notif-nudge-dismiss" onPress={() => setNudgeDismissed(true)} hitSlop={8} style={styles.nudgeClose}>
                <Ionicons name="close" size={16} color={colors.muted} />
              </Pressable>
            </View>
          );

  // Status card — only for users WITH contracts. Brand-new users
  // (contractCount === 0) see no status card; the green "Add a site
  // or business" banner below becomes their single primary action.
  const statusEl = !loading && (contractCount ?? 0) > 0 && (items.length === 0 ? (
            <View style={styles.trustBanner} testID="trust-banner">
              <View style={styles.trustIcon}>
                <Icon name="shield" size={26} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustKicker}>Protected</Text>
                <Text style={styles.trustTitle}>All contracts actively monitored</Text>
                <Text style={styles.trustSub}>Every contract is verified and watched — we&apos;ll alert you up to 18 months before renewal.</Text>
              </View>
            </View>
          ) : (
            <View testID="expiring-soon-card" style={styles.alertCard}>
              <View style={styles.alertTopRow}>
                <Text testID="expiring-card-title" style={styles.alertTitle}>
                  {items.length} contract{items.length === 1 ? "" : "s"} ending soon
                </Text>
                <View testID="expiring-days-badge" style={styles.daysBadge}>
                  <PulseDot color="#DC2626" />
                  <Text style={styles.daysBadgeText}>
                    {first.days_until_expiry < 0 ? `${Math.abs(first.days_until_expiry)}d overdue` : `${first.days_until_expiry} days left`}
                  </Text>
                </View>
              </View>
              <Text style={styles.alertSub}>Lock in new rates now to avoid out-of-contract price increases.</Text>
              {utilChips.length > 0 && (
                <View style={styles.expChips}>
                  {utilChips.map((c) => (
                    <Pressable key={c.label} testID={`util-pill-${c.label}`} onPress={() => router.push("/renewals")} style={({ pressed }) => [styles.expChip, pressed && { opacity: 0.7 }]}>
                      <Text style={styles.expChipText}>{c.emoji} {c.label} ({c.count})</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Pressable testID="view-sites-link" onPress={() => router.push("/renewals")} style={({ pressed }) => [styles.alertBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.alertBtnText}>Review &amp; Lock In Rates ({items.length}) →</Text>
              </Pressable>
            </View>
          ));

  // Bill verification — compact status card
  const auditEl = !loading && audits.length > 0 && (
            <View style={styles.audit} testID="audit-in-progress-card">
              <View style={styles.auditHead}>
                <View style={styles.auditIcon}>
                  <Icon name="document" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.auditTitle}>Bill verification in progress</Text>
                  <View style={styles.auditPill}>
                    <Text style={styles.auditPillText}>1 business day turnaround</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.auditSub}>
                We&apos;re checking your rates against current market tariffs to find your best savings.
              </Text>
              {audits[0]?.call_requested_at ? (
                <View style={styles.auditDone} testID="audit-call-confirmed">
                  <Text style={styles.auditDoneText}>☎ Callback requested</Text>
                </View>
              ) : (
                <Pressable testID="audit-request-call" disabled={callingId === audits[0]?.id} onPress={() => requestCall(audits[0].id)} style={({ pressed }) => [styles.auditCta, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.auditCtaText}>{callingId === audits[0]?.id ? "Sending…" : "Request a callback"}</Text>
                </Pressable>
              )}
            </View>
          );

  // Primary CTA — green "compare tariffs" banner (above Quick actions)
  const promoEl = (
          <View ref={ctaRef} collapsable={false} testID="lower-bills-cta" style={styles.promo}>
            <View style={styles.promoHead}>
              <View style={styles.promoIcon}>
                <Icon name="building" size={22} color={colors.pastel.mintIcon} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.promoTitle}>Add a site or business</Text>
                <Text style={styles.promoSub}>Add another business or location, or compare your utility prices.</Text>
              </View>
            </View>
            <Pressable testID="lower-bills-cta-pill" onPress={() => router.push("/quote/new")} style={({ pressed }) => [styles.promoBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.promoBtnText}>Add or get a quote</Text>
              <Icon name="chevronRight" size={16} color="#FFFFFF" />
              <CtaShimmer width={340} />
            </Pressable>
          </View>
  );

  // Quick actions — two core tiles side-by-side
  const quickEl = (
    <>
          <Text style={styles.quickLabel}>Quick actions</Text>
          <View style={styles.quickGrid}>
            <QuickAction testID="quick-action-scan" innerRef={scanRef} icon="scan" bg={colors.pastel.peach} fg={colors.pastel.peachIcon}
              title="Scan Bill" badge={showTryIt ? "Try it" : undefined} onPress={() => router.push("/scan")} />
            <QuickAction testID="action-meter" icon="meter" bg={colors.pastel.lavender} fg={colors.pastel.lavenderIcon}
              title="Meter Installation" onPress={() => setMeter(true)} />
          </View>
    </>
  );

  // My Documents — full-width card linking to the Documents hub
  const docCardEl = (
          <Pressable
            testID="home-my-documents"
            onPress={() => router.push("/documents")}
            style={({ pressed }) => [styles.docCard, pressed && { opacity: 0.95 }]}
          >
            <View style={styles.docCardIcon}>
              <Icon name="document" size={22} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docCardTitle}>My Documents</Text>
              <Text style={styles.docCardSub}>Access your utility contracts, LOAs and quotes</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.muted} />
          </Pressable>
  );

  const overlays = (
    <>
      <MeterInstallModal visible={meter} onClose={() => setMeter(false)} />

      <SpotlightTour open={tourOpen} steps={tourSteps} onClose={closeTour} />
    </>
  );

  // DESKTOP WEB ONLY: centred two-column dashboard.
  if (isDesktop) {
    return (
      <View style={styles.root}>
        <ScrollView
          testID="dashboard-scroll"
          ref={scrollRef}
          contentContainerStyle={dsk.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={dsk.wrap}>
            {greetEl}
            {nudgeEl}
            <View style={dsk.cols}>
              <View style={dsk.main}>
                {statusEl}
                {auditEl}
                {promoEl}
              </View>
              <View style={dsk.side}>
                {quickEl}
                {docCardEl}
                <HaveAQueryPill />
              </View>
            </View>
          </View>
        </ScrollView>
        {overlays}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        testID="dashboard-scroll"
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
          {greetEl}
          {nudgeEl}
          {statusEl}
          {auditEl}
          {promoEl}
          {quickEl}
          {docCardEl}

          {/* Support / chat — subtle banner near the bottom */}
          <HaveAQueryPill />
        </ScrollView>

      {overlays}
    </View>
  );
}

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 2, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);
  return (
    <View style={{ width: 8, height: 8, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity, transform: [{ scale }] }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

function QuickAction({ icon, bg, fg, title, onPress, testID, badge, innerRef }: {
  icon: IconName; bg: string; fg: string; title: string; onPress: () => void; testID?: string; badge?: string; innerRef?: React.RefObject<View | null>;
}) {
  const { width } = useWindowDimensions();
  const narrow = width < 360;
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
    <Pressable ref={innerRef} collapsable={false} testID={testID} onPress={onPress} style={({ pressed }) => [styles.qa, narrow && { padding: 10 }, pressed && { opacity: 0.9 }]}>
      {badge ? (
        <Animated.View testID="quick-action-badge" style={[styles.qaBadge, { transform: [{ scale }] }]}>
          <Icon name="sparkle" size={10} color="#FFFFFF" />
          <Text style={styles.qaBadgeText}>{badge}</Text>
        </Animated.View>
      ) : null}
      <View style={[styles.qaIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={24} color={fg} />
      </View>
      <Text style={[styles.qaTitle, narrow && { fontSize: 11, lineHeight: 15, letterSpacing: -0.1 }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF8F5" },
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

  trustBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  trustIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center" },
  trustKicker: { fontFamily: font.bold, fontSize: type.sm, color: "#065F46" },
  trustTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: 2, marginBottom: 4 },
  trustSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, lineHeight: 17 },

  expCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 18,
    padding: spacing.md,
    ...shadow.card,
  },
  expTopRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
  expCount: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  expCountText: { fontFamily: font.bold, fontSize: 22 },
  expDays: { fontFamily: font.bold, fontSize: type.sm },
  expMeta: { fontFamily: font.regular, fontSize: type.sm, color: "#64748B", marginTop: 3, flexShrink: 1 },
  renewablePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  renewablePillText: { fontFamily: font.bold, fontSize: type.kicker },
  expTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginBottom: 12 },
  expChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  expChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#FDE68A" },
  expChipText: { fontFamily: font.semibold, fontSize: type.sm, color: "#92400E" },

  alertCard: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 16, padding: spacing.lg, ...shadow.card },
  alertTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 },
  alertTitle: { flex: 1, fontFamily: font.bold, fontSize: 18, color: colors.heading, letterSpacing: -0.3 },
  daysBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  daysBadgeText: { fontFamily: font.bold, fontSize: 12, color: "#B91C1C" },
  alertSub: { fontFamily: font.regular, fontSize: type.sm, color: "#78350F", lineHeight: 19, marginBottom: 14 },
  alertBtn: { height: 50, borderRadius: 12, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center" },
  alertBtnText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
  expLink: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  expLinkText: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },

  audit: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderLeftWidth: 3, borderLeftColor: "#F59E0B", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, gap: 10, ...shadow.card },
  auditHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  auditIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  auditTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.heading },
  auditPill: { alignSelf: "flex-start", marginTop: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  auditPillText: { fontFamily: font.medium, fontSize: 12, color: "#B45309" },
  auditSub: { fontFamily: font.regular, fontSize: 13, color: colors.onSurfaceSecondary, lineHeight: 18 },
  auditCta: { alignSelf: "flex-start", height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: "#CBD5E1", paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  auditCtaText: { fontFamily: font.semibold, fontSize: 13, color: colors.heading },
  auditDone: { alignSelf: "flex-start", height: 36, borderRadius: radius.pill, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  auditDoneText: { fontFamily: font.semibold, fontSize: 13, color: "#047857" },

  quickLabel: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.muted, textTransform: "uppercase", marginTop: 2, marginLeft: 4 },
  quickGrid: { flexDirection: "row", gap: 12 },
  docCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 12 },
  docCardIcon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
  docCardTitle: { fontFamily: font.bold, fontSize: type.title, color: colors.heading },
  docCardSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  qa: {
    flex: 1,
    minHeight: 100,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 18,
    padding: 12,
    justifyContent: "flex-start",
    ...shadow.card,
  },
  qaIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  qaTitle: { fontFamily: font.semibold, fontSize: type.sm, lineHeight: 17, color: colors.heading },
  qaBadge: {
    position: "absolute", top: 8, right: 8, zIndex: 2, flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: colors.brandPrimary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill,
  },
  qaBadgeText: { fontFamily: font.bold, fontSize: 10, color: "#FFFFFF", letterSpacing: 0.5 },

  promo: { backgroundColor: "#D1FAE5", borderRadius: 18, padding: spacing.lg, marginTop: spacing.xs, gap: 15 },
  promoHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  promoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  promoTitle: { fontFamily: font.bold, fontSize: type.lg, lineHeight: 21, color: colors.heading, letterSpacing: -0.2 },
  promoSub: { fontFamily: font.regular, fontSize: type.sm, lineHeight: 18, color: "#065F46", marginTop: 4 },
  promoBtn: { minHeight: 42, borderRadius: 10, backgroundColor: "#065F46", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, overflow: "hidden" },
  promoBtnText: { fontFamily: font.semibold, fontSize: type.base, color: "#FFFFFF" },
});

// Desktop web only (≥1024px). Never applied on iOS/Android.
const dsk = StyleSheet.create({
  scroll: { paddingHorizontal: spacing["2xl"], paddingTop: spacing["2xl"], paddingBottom: spacing["3xl"] },
  wrap: { width: "100%", maxWidth: DESKTOP_CONTENT_MAX, alignSelf: "center", gap: spacing.lg },
  cols: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xl, marginTop: spacing.sm },
  main: { flex: 3, minWidth: 0, gap: spacing.lg },
  side: { flex: 2, minWidth: 0, gap: 12 },
});
