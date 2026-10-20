/**
 * Desktop-web dashboard (≥1024px only). 12-column style grid:
 *   main (8 cols): active tasks, upcoming renewals table, spend breakdown
 *   side (4 cols): quick actions, add-site CTA, account manager / support
 * Mobile renders the original dashboard in app/(tabs)/dashboard.tsx.
 */
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import dayjs from "dayjs";

import { Icon, IconName } from "@/src/components/icon";
import { HaveAQueryPill } from "@/src/components/have-a-query-pill";
import { CtaShimmer } from "@/src/components/cta-shimmer";
import { BusinessSwitcherChip } from "@/src/components/business-switcher-chip";
import { dCard, dt } from "@/src/desktop/tokens";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { DESKTOP_CONTENT_MAX } from "@/src/utils/use-desktop";
import { gbp, spendOf, tier, util } from "@/src/desktop/ui";
import { useBillCapture } from "@/src/desktop/upload-bill";

type Props = {
  scrollRef: React.RefObject<ScrollView | null>;
  refreshing: boolean;
  onRefresh: () => void;
  loading: boolean;
  subtitle: string;
  nudgeEl: React.ReactNode;
  promoEl: React.ReactNode;
  items: any[];
  audits: any[];
  contractCount: number | null;
  docsToSign: number;
  spend: any | null;
  callingId: string | null;
  requestCall: (id: string) => void;
  onMeter: () => void;
  scanRef: React.RefObject<View | null>;
  showTryIt: boolean;
  onOpenRenewals: () => void;
};

export function DesktopDashboard(p: Props) {
  return (
    <ScrollView
      testID="dashboard-scroll"
      ref={p.scrollRef}
      style={{ flex: 1, backgroundColor: dt.canvas }}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={p.refreshing} onRefresh={p.onRefresh} />}
    >
      <View style={s.wrap}>
        <View style={s.pageHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.h1}>Overview</Text>
            <Text style={s.h1Sub}>{p.subtitle}</Text>
          </View>
          <BusinessSwitcherChip variant="desktop" testID="dashboard-business-chip" />
        </View>
        {p.nudgeEl}
        <View style={s.grid}>
          <View style={s.main}>
            {p.items.length > 0 ? <UrgentRenewalBanner items={p.items} onOpen={p.onOpenRenewals} /> : null}
            <TasksCard {...p} />
            <RenewalsCard items={p.items} loading={p.loading} contractCount={p.contractCount} onViewAll={p.onOpenRenewals} />
            <SpendCard spend={p.spend} />
          </View>
          <View style={s.side}>
            <QuickActionsCard onMeter={p.onMeter} scanRef={p.scanRef} showTryIt={p.showTryIt} docsToSign={p.docsToSign} />
            {p.promoEl}
            <AccountManagerCard />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 2.4, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: false }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);
  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity, transform: [{ scale }] }} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

/** Red, gently shimmering call-to-action so urgent renewals can't be missed. */
function UrgentRenewalBanner({ items, onOpen }: { items: any[]; onOpen: () => void }) {
  const first = items[0];
  const days = typeof first?.days_until_expiry === "number" ? first.days_until_expiry : null;
  const counts = new Map<string, number>();
  items.forEach((c) => { const l = util(c.utility_type).label; counts.set(l, (counts.get(l) || 0) + 1); });
  return (
    <View style={s.urgent} testID="desk-urgent-renewals">
      <CtaShimmer width={900} />
      <View style={s.urgentIcon}><Icon name="warning" size={22} color="#FFFFFF" /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Text style={s.urgentTitle}>{items.length} contract{items.length === 1 ? "" : "s"} ending soon</Text>
          {days != null ? (
            <View style={s.urgentBadge} testID="desk-urgent-days">
              <PulseDot color="#DC2626" />
              <Text style={s.urgentBadgeText}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days} days left`}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.urgentSub}>Lock in new rates now to avoid out-of-contract price increases.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {Array.from(counts.entries()).map(([l, n]) => (
            <View key={l} style={s.urgentChip}><Text style={s.urgentChipText}>{l} ({n})</Text></View>
          ))}
        </View>
      </View>
      <Pressable testID="desk-urgent-review" onPress={onOpen} style={(st: any) => [s.urgentBtn, st.hovered && { backgroundColor: "#991B1B" }]}>
        <Text style={s.urgentBtnText}>Review &amp; lock in rates</Text>
        <Icon name="chevronRight" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function CardHead({ title, count, link, onLink, testID }: { title: string; count?: number; link?: string; onLink?: () => void; testID?: string }) {
  return (
    <View style={s.cardHead}>
      <Text style={s.cardTitle}>{title}</Text>
      {count ? <View style={s.countPill}><Text style={s.countText}>{count}</Text></View> : null}
      <View style={{ flex: 1 }} />
      {link ? (
        <Pressable testID={testID} onPress={onLink} style={(st: any) => [s.linkBtn, st.hovered && { backgroundColor: dt.hover }]}>
          <Text style={s.linkText}>{link}</Text>
          <Icon name="chevronRight" size={14} color={colors.brandPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

type Task = { key: string; icon: IconName; tint: string; bg: string; title: string; sub: string; cta: string; onPress?: () => void; done?: boolean; busy?: boolean };

function TasksCard(p: Props) {
  const router = useRouter();
  const tasks: Task[] = [];
  // Renewals are surfaced by the red banner above, so tasks stay focused on other actions.
  if (p.docsToSign > 0) {
    tasks.push({
      key: "docs", icon: "document", tint: "#7C3AED", bg: "#F5F3FF",
      title: `${p.docsToSign} document${p.docsToSign === 1 ? "" : "s"} awaiting your signature`,
      sub: "Review and sign securely online — it only takes a minute.",
      cta: "Review & sign", onPress: () => router.push("/documents"),
    });
  }
  const audit = p.audits[0];
  if (audit) {
    tasks.push({
      key: "audit", icon: "clipboard", tint: "#B45309", bg: "#FFFBEB",
      title: "Bill verification in progress",
      sub: "We're checking your rates against current market tariffs · 1 business day turnaround.",
      cta: audit.call_requested_at ? "Callback requested" : p.callingId === audit.id ? "Sending…" : "Request a callback",
      done: !!audit.call_requested_at, busy: p.callingId === audit.id,
      onPress: audit.call_requested_at ? undefined : () => p.requestCall(audit.id),
    });
  }
  if (!p.loading && (p.contractCount ?? 0) === 0) {
    tasks.push({
      key: "first-site", icon: "building", tint: colors.pastel.mintIcon, bg: "#ECFDF5",
      title: "Add your first site",
      sub: "Upload a bill or request a quote and we'll start monitoring your renewals.",
      cta: "Get started", onPress: () => router.push("/quote/new"),
    });
  }

  return (
    <View style={s.card} testID="desk-tasks-card">
      <CardHead title="Active tasks" count={tasks.length} />
      {p.loading ? (
        <View style={s.loadingBox}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : tasks.length === 0 ? (
        <View style={s.emptyRow}>
          <View style={[s.taskIcon, { backgroundColor: "#ECFDF5" }]}><Icon name="check" size={18} color="#059669" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.taskTitle}>You&apos;re all caught up</Text>
            <Text style={s.taskSub}>Nothing needs your attention right now.</Text>
          </View>
        </View>
      ) : (
        <View>
          {tasks.map((t, i) => (
            <View key={t.key} style={[s.taskRow, i > 0 && s.rowDivider]} testID={`desk-task-${t.key}`}>
              <View style={[s.taskIcon, { backgroundColor: t.bg }]}><Icon name={t.icon} size={18} color={t.tint} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.taskTitle}>{t.title}</Text>
                <Text style={s.taskSub}>{t.sub}</Text>
              </View>
              {t.done ? (
                <View style={s.donePill}><Icon name="check" size={12} color="#047857" /><Text style={s.donePillText}>{t.cta}</Text></View>
              ) : (
                <Pressable
                  testID={`desk-task-${t.key}-cta`}
                  disabled={t.busy}
                  onPress={t.onPress}
                  style={(st: any) => [s.taskBtn, st.hovered && { backgroundColor: dt.hover }]}
                >
                  <Text style={s.taskBtnText}>{t.cta}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function RenewalsCard({ items, loading, contractCount, onViewAll }: { items: any[]; loading: boolean; contractCount: number | null; onViewAll: () => void }) {
  const router = useRouter();
  const rows = items.slice(0, 6);
  return (
    <View style={s.card} testID="desk-renewals-card">
      <CardHead title="Upcoming renewals" count={items.length} link={items.length ? "View all" : undefined} onLink={onViewAll} testID="desk-renewals-viewall" />
      {loading ? (
        <View style={s.loadingBox}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : rows.length === 0 ? (
        <View style={s.emptyRow}>
          <View style={[s.taskIcon, { backgroundColor: "#ECFDF5" }]}><Icon name="shield" size={18} color="#059669" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.taskTitle}>No contracts ending in the next 90 days</Text>
            <Text style={s.taskSub}>
              {(contractCount ?? 0) > 0
                ? "All contracts are actively monitored — we'll alert you up to 18 months before renewal."
                : "Add a site or upload a bill and we'll track every renewal date for you."}
            </Text>
          </View>
        </View>
      ) : (
        <View style={s.table}>
          <View style={[s.tr, s.thead]}>
            <Text style={[s.th, s.cUtil]}>Utility</Text>
            <Text style={[s.th, s.cSupplier]}>Supplier</Text>
            <Text style={[s.th, s.cSite]}>Site</Text>
            <Text style={[s.th, s.cDate]}>Ends</Text>
            <Text style={[s.th, s.cStatus]}>Status</Text>
            <Text style={[s.th, s.cAction, { textAlign: "right" }]}>Action</Text>
          </View>
          {rows.map((c: any, i: number) => {
            const m = util(c.utility_type);
            const end = c.end_date || c.contract_end_date || c.renewal_date;
            const days = c.days_until_expiry ?? (end ? dayjs(end).startOf("day").diff(dayjs().startOf("day"), "day") : 0);
            const t = tier(days);
            return (
              <View
                key={c.contract_id || c.id || i}
                testID={`desk-renewal-row-${i}`}
                style={[s.tr, s.rowDivider]}
              >
                <View style={[s.cUtil, s.utilCell]}>
                  <View style={[s.utilDot, { backgroundColor: `${m.color}1F` }]}><Icon name={m.icon} size={13} color={m.color} /></View>
                  <Text style={s.td} numberOfLines={1}>{m.label}</Text>
                </View>
                <Text style={[s.td, s.cSupplier]} numberOfLines={1}>{c.supplier_name || "Supplier TBC"}</Text>
                <Text style={[s.tdMuted, s.cSite]} numberOfLines={1}>{c.property_name || "—"}{c.postcode ? ` · ${c.postcode}` : ""}</Text>
                <Text style={[s.tdMuted, s.cDate]} numberOfLines={1}>{end && dayjs(end).isValid() ? dayjs(end).format("D MMM YYYY") : "—"}</Text>
                <View style={s.cStatus}>
                  <View style={[s.statusPill, { backgroundColor: t.bg, borderColor: t.border }]}><Text style={[s.statusText, { color: t.color }]}>{t.label}</Text></View>
                </View>
                <View style={[s.cAction, s.actionCell]}>
                  <Pressable
                    testID={`desk-renewal-review-${i}`}
                    onPress={() => c.property_id && router.push(`/sites/${c.property_id}`)}
                    style={(st: any) => [s.rowBtnGhost, st.hovered && { backgroundColor: dt.hover }]}
                  >
                    <Text style={s.rowBtnGhostText}>Review</Text>
                  </Pressable>
                  <Pressable
                    testID={`desk-renewal-quote-${i}`}
                    onPress={() => router.push({ pathname: "/quote/new", params: { propertyId: String(c.property_id || ""), utility: c.utility_type || "", contractId: c.contract_id || c.id || "", incumbent: c.supplier_name || "" } })}
                    style={(st: any) => [s.rowBtn, st.hovered && { backgroundColor: colors.brandPrimaryPressed }]}
                  >
                    <Text style={s.rowBtnText}>Get quote</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SpendCard({ spend }: { spend: any | null }) {
  const router = useRouter();
  const bill = useBillCapture();
  const total = Number(spend?.total_annual_spend ?? 0);
  const byUtil: any[] = spend?.by_utility ?? [];
  const contracts: any[] = spend?.contracts ?? [];
  const sites: any[] = spend?.by_site ?? [];
  const max = Math.max(1, ...byUtil.map(spendOf));
  const empty = total === 0 && byUtil.length === 0;
  return (
    <View style={s.card} testID="desk-spend-card">
      <CardHead title="Spend breakdown" link={empty ? undefined : "Open reports"} onLink={() => router.navigate("/reports")} testID="desk-spend-open" />
      {empty ? (
        <View style={s.emptyRow}>
          <View style={[s.taskIcon, { backgroundColor: colors.brandTertiary }]}><Icon name="bolt" size={18} color={colors.brandPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.taskTitle}>No spend data yet</Text>
            <Text style={s.taskSub}>Once a contract is confirmed with rates, your annual spend appears here.</Text>
          </View>
          <Pressable testID="desk-spend-scan" onPress={() => bill.open()} style={(st: any) => [s.taskBtn, st.hovered && { backgroundColor: dt.hover }]}>
            <Text style={s.taskBtnText}>Upload a bill</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          <View style={s.metrics}>
            <Metric label="Estimated annual spend" value={gbp(total)} strong />
            <Metric label="Contracts" value={String(contracts.length)} />
            <Metric label="Sites" value={String(sites.length || 1)} />
          </View>
          <View style={{ gap: spacing.md }}>
            {byUtil.map((it, i) => {
              const m = util(it.utility || it.utility_type);
              const v = spendOf(it);
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return (
                <View key={i} style={s.barRow}>
                  <Text style={s.barLabel} numberOfLines={1}>{m.label}</Text>
                  <View style={s.barTrack}><View style={[s.barFill, { width: `${Math.max(3, (v / max) * 100)}%`, backgroundColor: m.color }]} /></View>
                  <Text style={s.barValue}>{gbp(v)}</Text>
                  <Text style={s.barPct}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[s.metric, strong && s.metricStrong]}>
      <Text style={[s.metricLabel, strong && { color: "rgba(255,255,255,0.8)" }]}>{label}</Text>
      <Text style={[s.metricValue, strong && { color: "#FFFFFF" }]}>{value}</Text>
    </View>
  );
}

function QuickActionsCard({ onMeter, scanRef, showTryIt, docsToSign }: { onMeter: () => void; scanRef: React.RefObject<View | null>; showTryIt: boolean; docsToSign: number }) {
  const router = useRouter();
  const bill = useBillCapture();
  const actions: { key: string; icon: IconName; bg: string; fg: string; title: string; sub: string; badge?: string; onPress: () => void; ref?: React.RefObject<View | null> }[] = [
    { key: "scan", icon: "document", bg: colors.pastel.peach, fg: colors.pastel.peachIcon, title: "Upload Bill", sub: "PDF, JPG or PNG — details extracted for you", badge: showTryIt ? "Try it" : undefined, onPress: () => bill.open(), ref: scanRef },
    { key: "meter", icon: "meter", bg: colors.pastel.lavender, fg: colors.pastel.lavenderIcon, title: "Meter Installation", sub: "Book a new or smart meter", onPress: onMeter },
    { key: "docs", icon: "document", bg: "#EDE9FE", fg: "#7C3AED", title: "My Documents", sub: "Contracts, LOAs and quotes", badge: docsToSign ? `${docsToSign} to sign` : undefined, onPress: () => router.push("/documents") },
  ];
  return (
    <View style={s.card} testID="desk-quick-actions">
      <CardHead title="Quick actions" />
      <View style={{ gap: 4 }}>
        {actions.map((a) => (
          <Pressable
            key={a.key}
            ref={a.ref}
            collapsable={false}
            testID={a.key === "scan" ? "quick-action-scan" : a.key === "meter" ? "action-meter" : "home-my-documents"}
            onPress={a.onPress}
            style={(st: any) => [s.qaRow, st.hovered && { backgroundColor: dt.canvas, borderColor: dt.border }]}
          >
            <View style={[s.qaIcon, { backgroundColor: a.bg }]}><Icon name={a.icon} size={18} color={a.fg} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.qaTitle}>{a.title}</Text>
              <Text style={s.qaSub} numberOfLines={1}>{a.sub}</Text>
            </View>
            {a.badge ? <View style={s.qaBadge}><Text style={s.qaBadgeText}>{a.badge}</Text></View> : null}
            <Icon name="chevronRight" size={16} color="#94A3B8" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function AccountManagerCard() {
  return (
    <View style={[s.card, { padding: 0, overflow: "hidden" }]} testID="desk-account-manager">
      <View style={s.amBanner}>
        <View style={s.amAvatar}><Icon name="users" size={20} color="#FFFFFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.amTitle}>Your account team</Text>
          <Text style={s.amSub}>Price Buddy support team</Text>
        </View>
      </View>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={s.amHours}><View style={s.dot} /><Text style={s.amHoursText}>Available Mon–Fri · 9am – 4pm UK</Text></View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable testID="desk-am-call" onPress={() => Linking.openURL("tel:08003689822")} style={(st: any) => [s.amBtnPrimary, st.hovered && { backgroundColor: colors.brandPrimaryPressed }]}>
            <Icon name="phone" size={15} color="#FFFFFF" />
            <Text style={s.amBtnPrimaryText}>Call the desk</Text>
          </Pressable>
          <Pressable testID="desk-am-email" onPress={() => Linking.openURL("mailto:hello@pricebuddy.co.uk?subject=Support%20request")} style={(st: any) => [s.amBtn, st.hovered && { backgroundColor: dt.hover }]}>
            <Icon name="mail" size={15} color={dt.text} />
            <Text style={s.amBtnText}>Email</Text>
          </Pressable>
        </View>
        <HaveAQueryPill />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: spacing["2xl"], paddingBottom: spacing["3xl"] },
  wrap: { width: "100%", maxWidth: DESKTOP_CONTENT_MAX + 160, alignSelf: "center", gap: spacing.xl },
  pageHead: { flexDirection: "row", alignItems: "flex-end", gap: spacing.lg },
  h1: { fontFamily: font.bold, fontSize: type["2xl"], color: dt.text, letterSpacing: -0.5 },
  h1Sub: { fontFamily: font.regular, fontSize: type.base, color: dt.muted, marginTop: 4 },
  grid: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xl },
  main: { flex: 8, minWidth: 0, gap: spacing.xl },
  side: { flex: 4, minWidth: 300, gap: spacing.xl },

  card: { ...dCard, padding: spacing.xl, gap: spacing.lg },
  urgent: {
    flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.xl, borderRadius: dt.radius, overflow: "hidden",
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", boxShadow: "0 0 0 4px rgba(220,38,38,0.06), 0 6px 20px rgba(220,38,38,0.12)",
  } as object,
  urgentIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  urgentTitle: { fontFamily: font.bold, fontSize: type.xl, color: "#7F1D1D", letterSpacing: -0.3 },
  urgentBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#FECACA" },
  urgentBadgeText: { fontFamily: font.semibold, fontSize: type.kicker, color: "#B91C1C" },
  urgentSub: { fontFamily: font.regular, fontSize: type.sm, color: "#991B1B" },
  urgentChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "rgba(220,38,38,0.08)" },
  urgentChipText: { fontFamily: font.medium, fontSize: type.kicker, color: "#991B1B" },
  urgentBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 42, paddingHorizontal: 18, borderRadius: 8, backgroundColor: "#DC2626" },
  urgentBtnText: { fontFamily: font.semibold, fontSize: type.sm, color: "#FFFFFF" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardTitle: { fontFamily: font.semibold, fontSize: type.lg, color: dt.text, letterSpacing: -0.2 },
  countPill: { minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: dt.subtle, alignItems: "center", justifyContent: "center" },
  countText: { fontFamily: font.semibold, fontSize: type.kicker, color: dt.body },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 2, height: 30, paddingHorizontal: 8, borderRadius: 6 },
  linkText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },
  loadingBox: { height: 80, alignItems: "center", justifyContent: "center" },

  emptyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: dt.canvas, borderRadius: 10, padding: spacing.lg, borderWidth: 1, borderColor: dt.subtle },
  taskRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  rowDivider: { borderTopWidth: 1, borderTopColor: dt.subtle },
  taskIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  taskTitle: { fontFamily: font.semibold, fontSize: type.base, color: dt.text },
  taskSub: { fontFamily: font.regular, fontSize: type.sm, color: dt.muted, marginTop: 2, lineHeight: 18 },
  taskBtn: { height: 34, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: dt.border, backgroundColor: dt.card, alignItems: "center", justifyContent: "center" },
  taskBtnText: { fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
  donePill: { flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0" },
  donePillText: { fontFamily: font.semibold, fontSize: type.kicker, color: "#047857" },

  table: { borderWidth: 1, borderColor: dt.border, borderRadius: 10, overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, minHeight: 48, gap: spacing.md },
  thead: { backgroundColor: dt.canvas, minHeight: 38 },
  th: { fontFamily: font.semibold, fontSize: type.kicker, letterSpacing: 0.6, textTransform: "uppercase", color: dt.muted },
  td: { fontFamily: font.medium, fontSize: type.sm, color: dt.text },
  tdMuted: { fontFamily: font.regular, fontSize: type.sm, color: dt.muted },
  cUtil: { flex: 1.3 },
  cSupplier: { flex: 1.4 },
  cSite: { flex: 2 },
  cDate: { flex: 1.1 },
  cStatus: { flex: 1.1, alignItems: "flex-start" },
  cAction: { flex: 1.7 },
  actionCell: { flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  rowBtn: { height: 30, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  rowBtnText: { fontFamily: font.semibold, fontSize: type.kicker, color: "#FFFFFF" },
  rowBtnGhost: { height: 30, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: dt.border, backgroundColor: dt.card, alignItems: "center", justifyContent: "center" },
  rowBtnGhostText: { fontFamily: font.semibold, fontSize: type.kicker, color: dt.text },
  utilCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  utilDot: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  statusText: { fontFamily: font.semibold, fontSize: type.kicker },

  metrics: { flexDirection: "row", gap: spacing.md },
  metric: { flex: 1, borderWidth: 1, borderColor: dt.border, borderRadius: 10, padding: spacing.lg, gap: 4 },
  metricStrong: { flex: 1.4, backgroundColor: "#1A1F36", borderColor: "#1A1F36" },
  metricLabel: { fontFamily: font.medium, fontSize: type.kicker, letterSpacing: 0.4, textTransform: "uppercase", color: dt.muted },
  metricValue: { fontFamily: font.bold, fontSize: 24, color: dt.text, letterSpacing: -0.5 },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  barLabel: { width: 110, fontFamily: font.medium, fontSize: type.sm, color: dt.body },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: dt.subtle, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { width: 80, textAlign: "right", fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
  barPct: { width: 40, textAlign: "right", fontFamily: font.regular, fontSize: type.kicker, color: dt.muted },

  qaRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "transparent" },
  qaIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  qaTitle: { fontFamily: font.semibold, fontSize: type.base, color: dt.text },
  qaSub: { fontFamily: font.regular, fontSize: type.kicker, color: dt.muted, marginTop: 1 },
  qaBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.brandPrimary },
  qaBadgeText: { fontFamily: font.bold, fontSize: 10, color: "#FFFFFF" },

  amBanner: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#1A1F36", padding: spacing.lg },
  amAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  amTitle: { fontFamily: font.semibold, fontSize: type.base, color: "#FFFFFF" },
  amSub: { fontFamily: font.regular, fontSize: type.kicker, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  amHours: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" },
  amHoursText: { fontFamily: font.regular, fontSize: type.sm, color: dt.body },
  amBtnPrimary: { flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 8, backgroundColor: colors.brandPrimary },
  amBtnPrimaryText: { fontFamily: font.semibold, fontSize: type.sm, color: "#FFFFFF" },
  amBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 8, borderWidth: 1, borderColor: dt.border },
  amBtnText: { fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
});
