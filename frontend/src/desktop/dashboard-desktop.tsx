/**
 * Desktop-web dashboard (≥1024px only). 12-column style grid:
 *   main (8 cols): active tasks, upcoming renewals table, spend breakdown
 *   side (4 cols): quick actions, add-site CTA, account manager / support
 * Mobile renders the original dashboard in app/(tabs)/dashboard.tsx.
 */
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import dayjs from "dayjs";

import { Icon, IconName } from "@/src/components/icon";
import { HaveAQueryPill } from "@/src/components/have-a-query-pill";
import { dCard, dt } from "@/src/desktop/tokens";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { DESKTOP_CONTENT_MAX } from "@/src/utils/use-desktop";

const UTIL: Record<string, { label: string; icon: IconName; color: string }> = {
  electricity: { label: "Electricity", icon: "bolt", color: "#F59E0B" },
  electric: { label: "Electricity", icon: "bolt", color: "#F59E0B" },
  gas: { label: "Gas", icon: "fire", color: "#F97316" },
  water: { label: "Water", icon: "droplet", color: "#3B82F6" },
  broadband: { label: "Broadband", icon: "wifi", color: "#0EA5E9" },
  telecoms: { label: "Telecoms", icon: "phone", color: "#10B981" },
};
const util = (u?: string) => UTIL[(u || "").toLowerCase()] || { label: u ? u[0].toUpperCase() + u.slice(1) : "Utility", icon: "bolt" as IconName, color: "#64748B" };
const gbp = (n: number) => `£${Math.round(Number(n) || 0).toLocaleString("en-GB")}`;
const spendOf = (it: any) => Number(it.annual_spend ?? it.spend ?? it.total ?? it.amount ?? it.annual_cost ?? it.total_spend ?? 0);

function tier(days: number) {
  if (days <= 30) return { color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA", label: days < 0 ? `${Math.abs(days)}d overdue` : `${days} days left` };
  if (days <= 60) return { color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA", label: `${days} days left` };
  return { color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", label: `${days} days left` };
}

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
        <View>
          <Text style={s.h1}>Overview</Text>
          <Text style={s.h1Sub}>{p.subtitle}</Text>
        </View>
        {p.nudgeEl}
        <View style={s.grid}>
          <View style={s.main}>
            <TasksCard {...p} />
            <RenewalsCard items={p.items} loading={p.loading} contractCount={p.contractCount} />
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
  if (p.items.length > 0) {
    const d = p.items[0]?.days_until_expiry;
    tasks.push({
      key: "renewals", icon: "warning", tint: "#B91C1C", bg: "#FEF2F2",
      title: `${p.items.length} contract${p.items.length === 1 ? "" : "s"} ending soon`,
      sub: typeof d === "number" ? `Earliest ends ${d < 0 ? `${Math.abs(d)} days ago` : `in ${d} days`} — lock in new rates to avoid price rises.` : "Lock in new rates to avoid out-of-contract price rises.",
      cta: "Review rates", onPress: () => router.push("/renewals"),
    });
  }
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
      sub: "Scan a bill or request a quote and we'll start monitoring your renewals.",
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

function RenewalsCard({ items, loading, contractCount }: { items: any[]; loading: boolean; contractCount: number | null }) {
  const router = useRouter();
  const rows = items.slice(0, 6);
  return (
    <View style={s.card} testID="desk-renewals-card">
      <CardHead title="Upcoming renewals" count={items.length} link={items.length ? "View all" : undefined} onLink={() => router.push("/renewals")} testID="desk-renewals-viewall" />
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
                : "Add a site or scan a bill and we'll track every renewal date for you."}
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
          </View>
          {rows.map((c: any, i: number) => {
            const m = util(c.utility_type);
            const end = c.end_date || c.contract_end_date || c.renewal_date;
            const days = c.days_until_expiry ?? (end ? dayjs(end).startOf("day").diff(dayjs().startOf("day"), "day") : 0);
            const t = tier(days);
            return (
              <Pressable
                key={c.contract_id || c.id || i}
                testID={`desk-renewal-row-${i}`}
                onPress={() => c.property_id && router.push(`/sites/${c.property_id}`)}
                style={(st: any) => [s.tr, s.rowDivider, st.hovered && { backgroundColor: dt.canvas }]}
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
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SpendCard({ spend }: { spend: any | null }) {
  const router = useRouter();
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
          <Pressable testID="desk-spend-scan" onPress={() => router.push("/scan")} style={(st: any) => [s.taskBtn, st.hovered && { backgroundColor: dt.hover }]}>
            <Text style={s.taskBtnText}>Scan a bill</Text>
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
  const actions: { key: string; icon: IconName; bg: string; fg: string; title: string; sub: string; badge?: string; onPress: () => void; ref?: React.RefObject<View | null> }[] = [
    { key: "scan", icon: "scan", bg: colors.pastel.peach, fg: colors.pastel.peachIcon, title: "Scan Bill", sub: "Auto-extract rates & renewal date", badge: showTryIt ? "Try it" : undefined, onPress: () => router.push("/scan"), ref: scanRef },
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
  h1: { fontFamily: font.bold, fontSize: type["2xl"], color: dt.text, letterSpacing: -0.5 },
  h1Sub: { fontFamily: font.regular, fontSize: type.base, color: dt.muted, marginTop: 4 },
  grid: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xl },
  main: { flex: 8, minWidth: 0, gap: spacing.xl },
  side: { flex: 4, minWidth: 300, gap: spacing.xl },

  card: { ...dCard, padding: spacing.xl, gap: spacing.lg },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardTitle: { fontFamily: font.semibold, fontSize: type.lg, color: dt.text, letterSpacing: -0.2 },
  countPill: { minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: dt.subtle, alignItems: "center", justifyContent: "center" },
  countText: { fontFamily: font.semibold, fontSize: type.kicker, color: dt.body },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 2, height: 30, paddingHorizontal: 8, borderRadius: 6 },
  linkText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },
  loadingBox: { height: 80, alignItems: "center", justifyContent: "center" },

  emptyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: dt.canvas, borderRadius: 10, padding: spacing.lg, borderWidth: 1, borderColor: dt.subtle },
  taskRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
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
