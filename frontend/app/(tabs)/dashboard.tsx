import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
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
import { CtaShimmer } from "@/src/components/cta-shimmer";
import { SpotlightTour, TourStep } from "@/src/components/spotlight-tour";
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
const SUPPORT_PHONE = "0800 368 9822";

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
  const [callingId, setCallingId] = useState<string | null>(null);

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

  const utilChips = useMemo(() => {
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

          {/* Alerts nudge */}
          {showNudge && (
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
          )}

          {/* Compact status badge */}
          {/* Trust banner / expiring contracts card — mirrors the original web app */}
          {items.length === 0 ? (
            <View style={styles.trustBanner} testID="trust-banner">
              <View style={styles.trustIcon}>
                <Icon name="shield" size={26} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustKicker}>Fully secured</Text>
                <Text style={styles.trustTitle}>You&apos;re completely covered</Text>
                <Text style={styles.trustSub}>No utility contracts expiring soon — our systems are watching everything.</Text>
              </View>
            </View>
          ) : (
            <Pressable testID="expiring-soon-card" onPress={() => router.push("/renewals")} style={({ pressed }) => [styles.expCard, pressed && { opacity: 0.95 }]}>
              <View style={styles.expTopRow}>
                <View testID="expiring-count" style={[styles.expCount, { backgroundColor: cfg?.bg, borderColor: cfg?.border }]}>
                  <Text style={[styles.expCountText, { color: cfg?.accent }]}>{items.length}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <PulseDot color={cfg?.accent || "#DC2626"} />
                    <Text style={[styles.expDays, { color: cfg?.accent }]}>
                      {first.days_until_expiry < 0 ? `${Math.abs(first.days_until_expiry)} days overdue` : `${first.days_until_expiry} days remaining`}
                    </Text>
                  </View>
                  <Text style={styles.expMeta} numberOfLines={1}>
                    {utilityLabel(first.utility_type)}
                    {first.supplier_name ? ` · ${first.supplier_name}` : ""}
                    {first.business_name ? ` · ${first.business_name}` : ""}
                    {items.length > 1 ? ` · +${items.length - 1} more` : ""}
                  </Text>
                </View>
                {first.renewable_now ? (
                  <View testID="renewable-pill" style={[styles.renewablePill, { backgroundColor: cfg?.bg, borderColor: cfg?.border }]}>
                    <Text style={[styles.renewablePillText, { color: cfg?.accent }]}>Renewable now</Text>
                  </View>
                ) : null}
              </View>
              <Text testID="expiring-card-title" style={styles.expTitle}>{cfg?.title}</Text>
              {utilChips.length > 0 && (
                <View style={styles.expChips}>
                  {utilChips.map((c) => (
                    <View key={c} style={styles.expChip}>
                      <Text style={styles.expChipText}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.expLink} testID="view-sites-link">
                <Text style={styles.expLinkText}>{items.length > 1 ? `View these ${items.length} contracts` : "View this contract"}</Text>
                <Icon name="chevronRight" size={16} color={colors.heading} />
              </View>
            </Pressable>
          )}

          {/* Audit in progress — mirrors the original web app */}
          {audits.length > 0 && (
            <View style={styles.audit} testID="audit-in-progress-card">
              <View style={styles.auditHead}>
                <View style={styles.auditIcon}>
                  <Icon name="scan" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditTitle}>Audit in progress</Text>
                  <Text style={styles.auditSub}>
                    Our team is verifying {audits.length === 1 ? "your bill" : `${audits.length} bills`}. We&apos;ll be in touch once everything&apos;s confirmed.
                  </Text>
                </View>
              </View>
              {audits.slice(0, 1).map((a) => {
                const called = !!a.call_requested_at;
                const intent = ({ track: "Tracking", quote: "Quote requested", both: "Tracking + Quote" } as Record<string, string>)[a.intent || "track"] || "Tracking";
                return (
                  <View key={a.id} testID={`audit-row-${a.id}`} style={styles.auditRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.auditRowTitle} numberOfLines={1}>
                        {a.supplier_name || "Bill upload"} · {a.supply_address || "Awaiting details"}
                      </Text>
                      <Text style={styles.auditRowSub}>
                        {intent}
                        {a.pages_uploaded > 1 ? ` · ${a.pages_uploaded} pages` : ""}
                      </Text>
                    </View>
                    {called ? (
                      <View style={styles.auditCalled} testID={`audit-call-confirmed-${a.id}`}>
                        <Text style={styles.auditCalledText}>☎ CALL REQUESTED</Text>
                      </View>
                    ) : (
                      <Pressable testID={`audit-request-call-${a.id}`} disabled={callingId === a.id} onPress={() => requestCall(a.id)} style={styles.auditCallBtn}>
                        <Text style={styles.auditCallBtnText}>{callingId === a.id ? "Sending…" : "Request a Call Now"}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
              {audits.length > 1 && (
                <Text style={styles.auditMore} testID="audit-more">+{audits.length - 1} more {audits.length - 1 === 1 ? "bill" : "bills"} being verified</Text>
              )}
              <Pressable testID="audit-call-direct" onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`)} hitSlop={6}>
                <Text style={styles.auditCallDirect}>Or call us direct on {SUPPORT_PHONE}</Text>
              </Pressable>
            </View>
          )}

          {/* Quick actions — 2-column grid, four equal cards */}
          <Text style={styles.quickLabel}>Quick actions</Text>
          <View style={styles.quickGrid}>
            <QuickAction testID="quick-action-scan" innerRef={scanRef} icon="scan" bg={colors.pastel.peach} fg={colors.pastel.peachIcon}
              title="Scan Bill" badge={showTryIt ? "Try it" : undefined} onPress={() => router.push("/scan")} />
            <QuickAction testID="quick-action-add-business" icon="building" bg={colors.pastel.blue} fg={colors.pastel.blueIcon}
              title="Add Business" onPress={() => setAddBiz(true)} />
            <QuickAction testID="action-meter" icon="meter" bg={colors.pastel.lavender} fg={colors.pastel.lavenderIcon}
              title="Meter Installation" onPress={() => setMeter(true)} />
          </View>

          {/* Have a query pill */}
          <HaveAQueryPill />

          {/* Quote promotional banner */}
          <View ref={ctaRef} collapsable={false} testID="lower-bills-cta" style={styles.promo}>
            <View style={styles.promoHead}>
              <View style={styles.promoIcon}>
                <Icon name="pound" size={24} color={colors.pastel.mintIcon} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.promoTitle}>Cut your business energy costs</Text>
                <Text style={styles.promoSub}>Compare quotes from trusted UK suppliers.</Text>
              </View>
            </View>
            <Pressable testID="lower-bills-cta-pill" onPress={() => router.push("/quote/new")} style={({ pressed }) => [styles.promoBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.promoBtnText}>Get a quote</Text>
              <Icon name="chevronRight" size={16} color="#FFFFFF" />
              <CtaShimmer width={340} />
            </Pressable>
          </View>
        </ScrollView>
      )}

      <AddBusinessModal visible={addBiz} onClose={() => setAddBiz(false)} onCreated={() => { setAddBiz(false); toast("Business added.", "success"); refreshBusinesses(); load(); }} />
      <MeterInstallModal visible={meter} onClose={() => setMeter(false)} />

      <SpotlightTour open={tourOpen} steps={tourSteps} onClose={closeTour} />
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
  icon: any; bg: string; fg: string; title: string; onPress: () => void; testID?: string; badge?: string; innerRef?: React.RefObject<View>;
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
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
  expTopRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
  expCount: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  expCountText: { fontFamily: font.bold, fontSize: 22 },
  expDays: { fontFamily: font.bold, fontSize: type.sm },
  expMeta: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  renewablePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  renewablePillText: { fontFamily: font.bold, fontSize: type.kicker },
  expTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginBottom: 12 },
  expChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  expChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  expChipText: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },
  expLink: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  expLinkText: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },

  audit: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, padding: spacing.md },
  auditHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  auditIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" },
  auditTitle: { fontFamily: font.bold, fontSize: type.base, color: "#92400E" },
  auditSub: { fontFamily: font.regular, fontSize: type.sm, color: "#78350F", lineHeight: 18, marginTop: 2 },
  auditRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  auditMore: { fontFamily: font.medium, fontSize: type.kicker, color: "#92400E", marginBottom: 4, marginLeft: 2 },
  auditRowTitle: { fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurface },
  auditRowSub: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted, marginTop: 2 },
  auditCalled: { backgroundColor: "#10B981", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  auditCalledText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.5, color: "#FFFFFF" },
  auditCallBtn: { borderWidth: 1, borderColor: colors.brandPrimary, backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  auditCallBtnText: { fontFamily: font.semibold, fontSize: type.kicker, color: colors.brandPrimary },
  auditCallDirect: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary, textAlign: "center", marginTop: 4 },

  quickLabel: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.muted, textTransform: "uppercase", marginTop: 2, marginLeft: 4 },
  quickGrid: { flexDirection: "row", gap: 12 },
  qa: {
    flex: 1,
    minHeight: 100,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    justifyContent: "flex-start",
    ...shadow.card,
  },
  qaIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  qaTitle: { fontFamily: font.semibold, fontSize: type.sm, lineHeight: 17, color: colors.heading },
  qaBadge: {
    position: "absolute", top: 8, right: 8, zIndex: 2, flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: colors.brandPrimary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill,
  },
  qaBadgeText: { fontFamily: font.bold, fontSize: 10, color: "#FFFFFF", letterSpacing: 0.5 },

  promo: { backgroundColor: colors.pastel.mint, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xs, gap: spacing.md },
  promoHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  promoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  promoTitle: { fontFamily: font.bold, fontSize: type.lg, lineHeight: 21, color: colors.heading, letterSpacing: -0.2 },
  promoSub: { fontFamily: font.regular, fontSize: type.sm, lineHeight: 18, color: "#065F46", marginTop: 3 },
  promoBtn: { minHeight: 42, borderRadius: radius.sm, backgroundColor: colors.pastel.mintIcon, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, overflow: "hidden" },
  promoBtnText: { fontFamily: font.semibold, fontSize: type.base, color: "#FFFFFF" },
});
