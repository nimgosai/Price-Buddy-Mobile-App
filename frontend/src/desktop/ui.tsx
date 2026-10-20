/** Shared desktop-web page primitives (≥1024px only). */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Icon, IconName } from "@/src/components/icon";
import { dCard, dt } from "@/src/desktop/tokens";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { DESKTOP_CONTENT_MAX } from "@/src/utils/use-desktop";

export const UTIL: Record<string, { label: string; icon: IconName; color: string }> = {
  electricity: { label: "Electricity", icon: "bolt", color: "#F59E0B" },
  electric: { label: "Electricity", icon: "bolt", color: "#F59E0B" },
  gas: { label: "Gas", icon: "fire", color: "#F97316" },
  water: { label: "Water", icon: "droplet", color: "#3B82F6" },
  broadband: { label: "Broadband", icon: "wifi", color: "#8B5CF6" },
  telecoms: { label: "Telecoms", icon: "phone", color: "#10B981" },
};
export const util = (u?: string) =>
  UTIL[(u || "").toLowerCase()] || { label: u ? u[0].toUpperCase() + u.slice(1) : "Utility", icon: "bolt" as IconName, color: "#64748B" };
export const gbp = (n: number) => `£${Math.round(Number(n) || 0).toLocaleString("en-GB")}`;
export const spendOf = (it: any) =>
  Number(it.annual_spend ?? it.spend ?? it.total ?? it.amount ?? it.annual_cost ?? it.total_spend ?? 0);

export function tier(days: number) {
  if (days <= 30) return { color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA", label: days < 0 ? `${Math.abs(days)}d overdue` : `${days} days left` };
  if (days <= 60) return { color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA", label: `${days} days left` };
  if (days <= 90) return { color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", label: `${days} days left` };
  return { color: "#047857", bg: "#ECFDF5", border: "#A7F3D0", label: `${days} days left` };
}

export function DesktopPage({
  testID, title, subtitle, actions, children, refreshing, onRefresh, scrollRef, maxWidth = DESKTOP_CONTENT_MAX + 160,
}: {
  testID?: string; title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode;
  refreshing?: boolean; onRefresh?: () => void; scrollRef?: React.RefObject<ScrollView | null>; maxWidth?: number;
}) {
  return (
    <ScrollView
      ref={scrollRef}
      testID={testID}
      style={{ flex: 1, backgroundColor: dt.canvas }}
      contentContainerStyle={s.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <View style={[s.wrap, { maxWidth }]}>
        <View style={s.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.h1} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={s.sub} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
          {actions ? <View style={s.actions}>{actions}</View> : null}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

export function Panel({ title, right, children, testID, pad = true }: { title?: string; right?: React.ReactNode; children: React.ReactNode; testID?: string; pad?: boolean }) {
  return (
    <View style={[s.panel, !pad && { padding: 0 }]} testID={testID}>
      {title ? (
        <View style={[s.panelHead, !pad && { paddingHorizontal: spacing.xl, paddingTop: spacing.lg }]}>
          <Text style={s.panelTitle}>{title}</Text>
          <View style={{ flex: 1 }} />
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export type Col = { key: string; label: string; flex?: number; align?: "left" | "right"; sortable?: boolean };

export function Table({ cols, children, testID, sort, onSort }: {
  cols: Col[]; children: React.ReactNode; testID?: string;
  sort?: { key: string; dir: "asc" | "desc" } | null; onSort?: (key: string) => void;
}) {
  return (
    <View style={s.table} testID={testID}>
      <View style={[s.tr, s.thead]}>
        {cols.map((c) => {
          const style = [s.th, c.align === "right" && { textAlign: "right" as const }];
          if (!c.sortable || !onSort) {
            return <Text key={c.key} style={[...style, { flex: c.flex ?? 1 }]} numberOfLines={1}>{c.label}</Text>;
          }
          const on = sort?.key === c.key;
          return (
            <Pressable
              key={c.key}
              testID={`${testID || "table"}-sort-${c.key}`}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${c.label}`}
              onPress={() => onSort(c.key)}
              style={(st: any) => [s.thBtn, { flex: c.flex ?? 1 }, st.hovered && { opacity: 0.75 }]}
            >
              <Text style={[...style, on && { color: dt.text }]} numberOfLines={1}>{c.label}</Text>
              <Text style={[s.sortArrow, on && { color: colors.brandPrimary }]}>{on ? (sort!.dir === "asc" ? "▲" : "▼") : "↕"}</Text>
            </Pressable>
          );
        })}
      </View>
      {children}
    </View>
  );
}

export function TRow({ children, onPress, testID }: { children: React.ReactNode; onPress?: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      style={(st: any) => [s.tr, s.trBody, st.hovered && onPress && { backgroundColor: dt.canvas }]}
    >
      {children}
    </Pressable>
  );
}

export function Cell({ flex = 1, children, align, muted, strong }: { flex?: number; children: React.ReactNode; align?: "left" | "right"; muted?: boolean; strong?: boolean }) {
  const isText = typeof children === "string" || typeof children === "number";
  return (
    <View style={{ flex, minWidth: 0, alignItems: align === "right" ? "flex-end" : "flex-start" }}>
      {isText ? <Text style={[s.td, muted && s.tdMuted, strong && s.tdStrong]} numberOfLines={1}>{children}</Text> : children}
    </View>
  );
}

export function UtilCell({ utility }: { utility?: string }) {
  const m = util(utility);
  return (
    <View style={s.utilCell}>
      <View style={[s.utilDot, { backgroundColor: `${m.color}1F` }]}><Icon name={m.icon} size={13} color={m.color} /></View>
      <Text style={s.td} numberOfLines={1}>{m.label}</Text>
    </View>
  );
}

/** Client-side pagination for desktop tables. */
export function usePaged<T>(rows: T[], size = 10) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const cur = Math.min(page, pages - 1);
  return { rows: rows.slice(cur * size, cur * size + size), page: cur, pages, total: rows.length, size, setPage };
}

/** Table footer: "Showing 1–10 of 24" + Prev / Next. Rendered inside <Table> so its border closes cleanly. */
export function Pager({ page, pages, total, size, setPage, testID = "table-pager" }: {
  page: number; pages: number; total: number; size: number; setPage: (n: number) => void; testID?: string;
}) {
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  const btn = (label: string, disabled: boolean, onPress: () => void, id: string) => (
    <Pressable testID={`${testID}-${id}`} disabled={disabled} onPress={onPress} style={(st: any) => [s.pageBtn, disabled && { opacity: 0.4 }, st.hovered && !disabled && { backgroundColor: dt.hover }]}>
      <Text style={s.pageBtnText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={s.pager} testID={testID}>
      <Text style={s.pagerText}>Showing {from}–{to} of {total}</Text>
      <View style={{ flex: 1 }} />
      {btn("Previous", page === 0, () => setPage(page - 1), "prev")}
      <Text style={s.pagerText}>Page {page + 1} of {pages}</Text>
      {btn("Next", page >= pages - 1, () => setPage(page + 1), "next")}
    </View>
  );
}

export function StatusPill({ days }: { days: number }) {
  const t = tier(days);
  return (
    <View style={[s.pill, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[s.pillText, { color: t.color }]}>{t.label}</Text>
    </View>
  );
}

export function Metric({ label, value, sub, dark, testID }: { label: string; value: string; sub?: string; dark?: boolean; testID?: string }) {
  return (
    <View style={[s.metric, dark && s.metricDark]} testID={testID}>
      <Text style={[s.metricLabel, dark && { color: "rgba(255,255,255,0.75)" }]} numberOfLines={1}>{label}</Text>
      <Text style={[s.metricValue, dark && { color: "#FFFFFF" }]} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={[s.metricSub, dark && { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

export function HeaderButton({ label, icon, onPress, primary, testID }: { label: string; icon?: IconName; onPress: () => void; primary?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={(st: any) => [s.hBtn, primary ? s.hBtnPrimary : s.hBtnGhost, st.hovered && (primary ? { backgroundColor: colors.brandPrimaryPressed } : { backgroundColor: dt.hover })]}
    >
      {icon ? <Icon name={icon} size={15} color={primary ? "#FFFFFF" : dt.text} /> : null}
      <Text style={[s.hBtnText, { color: primary ? "#FFFFFF" : dt.text }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyPanel({ icon, title, sub, action, testID }: { icon: IconName; title: string; sub: string; action?: React.ReactNode; testID?: string }) {
  return (
    <View style={s.empty} testID={testID}>
      <View style={s.emptyIcon}><Icon name={icon} size={24} color={colors.brandPrimary} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export const ds = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xl, alignItems: "flex-start" },
  metrics: { flexDirection: "row", gap: spacing.lg },
});

const s = StyleSheet.create({
  scroll: { padding: spacing["2xl"], paddingBottom: spacing["3xl"] },
  wrap: { width: "100%", alignSelf: "center", gap: spacing.xl },
  head: { flexDirection: "row", alignItems: "flex-end", gap: spacing.lg },
  h1: { fontFamily: font.bold, fontSize: type["2xl"], color: dt.text, letterSpacing: -0.5 },
  sub: { fontFamily: font.regular, fontSize: type.base, color: dt.muted, marginTop: 4 },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },

  panel: { ...dCard, padding: spacing.xl, gap: spacing.lg },
  panelHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  panelTitle: { fontFamily: font.semibold, fontSize: type.lg, color: dt.text, letterSpacing: -0.2 },

  table: { borderWidth: 1, borderColor: dt.border, borderRadius: 10, overflow: "hidden", backgroundColor: dt.card },
  tr: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, gap: spacing.md },
  thead: { backgroundColor: dt.canvas, minHeight: 40, borderBottomWidth: 1, borderBottomColor: dt.border },
  trBody: { minHeight: 52, borderTopWidth: 1, borderTopColor: dt.subtle },
  th: { fontFamily: font.semibold, fontSize: type.kicker, letterSpacing: 0.6, textTransform: "uppercase", color: dt.muted },
  thBtn: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0, height: 40 },
  sortArrow: { fontSize: 10, color: "#94A3B8" },
  pager: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: dt.border, backgroundColor: dt.canvas },
  pagerText: { fontFamily: font.regular, fontSize: type.sm, color: dt.muted },
  pageBtn: { height: 32, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: dt.border, backgroundColor: dt.card, alignItems: "center", justifyContent: "center" },
  pageBtnText: { fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
  td: { fontFamily: font.medium, fontSize: type.sm, color: dt.text },
  tdMuted: { fontFamily: font.regular, color: dt.muted },
  tdStrong: { fontFamily: font.semibold },
  utilCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  utilDot: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  pillText: { fontFamily: font.semibold, fontSize: type.kicker },

  metric: { ...dCard, flex: 1, padding: spacing.lg, gap: 4 },
  metricDark: { backgroundColor: "#1A1F36", borderColor: "#1A1F36" },
  metricLabel: { fontFamily: font.medium, fontSize: type.kicker, letterSpacing: 0.4, textTransform: "uppercase", color: dt.muted },
  metricValue: { fontFamily: font.bold, fontSize: 24, color: dt.text, letterSpacing: -0.5 },
  metricSub: { fontFamily: font.regular, fontSize: type.kicker, color: dt.muted },

  hBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  hBtnPrimary: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  hBtnGhost: { backgroundColor: dt.card, borderColor: dt.border },
  hBtnText: { fontFamily: font.semibold, fontSize: type.sm },

  empty: { ...dCard, alignItems: "center", padding: spacing["3xl"] },
  emptyIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  emptyTitle: { fontFamily: font.semibold, fontSize: type.xl, color: dt.text },
  emptySub: { fontFamily: font.regular, fontSize: type.base, color: dt.muted, textAlign: "center", marginTop: 6, maxWidth: 440, lineHeight: 21 },
});
