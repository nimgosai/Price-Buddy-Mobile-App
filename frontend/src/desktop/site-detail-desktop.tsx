/** Desktop-web Site detail: contracts table + contract rate slide-over drawer (≥1024px only). */
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import dayjs from "dayjs";

import { Icon } from "@/src/components/icon";
import { DialogButton, SlideOver } from "@/src/desktop/overlays";
import { dt } from "@/src/desktop/tokens";
import {
  Cell, DesktopPage, EmptyPanel, HeaderButton, Metric, Panel, StatusPill, TRow, Table, UtilCell, ds, gbp, util,
} from "@/src/desktop/ui";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const fmt = (d?: string) => (d && dayjs(d).isValid() ? dayjs(d).format("D MMM YYYY") : "—");
const p2 = (v: any, suffix: string) => (v != null ? `${Number(v).toFixed(2)}p ${suffix}` : "—");

function estCost(c: any): number | null {
  if (c.unit_rate_day == null || c.annual_usage == null) return null;
  return (Number(c.unit_rate_day) * Number(c.annual_usage)) / 100
    + (c.standing_charge != null ? (365 * Number(c.standing_charge)) / 100 : 0)
    + (c.kva_charge != null ? (365 * Number(c.kva_charge)) / 100 : 0);
}

type Props = {
  siteId: string;
  title: string;
  subtitle?: string;
  property: any;
  utilities: Record<string, any>;
  order: readonly string[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  onBack: () => void;
  onRequestChange: (c: any) => void;
};

export function SiteDetailDesktop(p: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const withContract = p.order.filter((u) => p.utilities[u]);
  const missing = p.order.filter((u) => !p.utilities[u]);
  const costs = withContract.map((u) => estCost(p.utilities[u])).filter((n): n is number => n != null);
  const nextDays = withContract.length ? Math.min(...withContract.map((u) => p.utilities[u].days_until_expiry ?? 9999)) : null;

  const quote = (u: string, c: any) =>
    router.push({ pathname: "/quote/new", params: { propertyId: String(p.siteId), utility: u, contractId: c.id || c._id || "", incumbent: c.supplier_name || "" } });

  return (
    <>
      <DesktopPage
        testID="site-detail-desktop"
        title={p.title}
        subtitle={[p.subtitle, p.property?.business_name].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <HeaderButton testID="site-detail-back" label="All sites" icon="arrowLeft" onPress={p.onBack} />
            <HeaderButton testID="site-scan-bill" label="Scan new bill" icon="scan" primary onPress={() => router.push("/scan")} />
          </>
        }
      >
        {p.loading ? (
          <View style={s.loading} testID="site-detail-loading"><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
        ) : p.error ? (
          <EmptyPanel testID="site-detail-error" icon="warning" title="Couldn't load this site" sub={p.error} action={<DialogButton label="Try again" variant="ghost" onPress={p.reload} />} />
        ) : (
          <>
            <View style={ds.metrics}>
              <Metric label="Contracts on file" value={String(withContract.length)} sub={`of ${p.order.length} utilities`} dark />
              <Metric label="Next renewal" value={nextDays == null ? "—" : nextDays < 0 ? "Overdue" : `${nextDays} days`} sub={nextDays == null ? "no contracts yet" : "until earliest end date"} />
              <Metric label="Est. annual cost" value={costs.length ? gbp(costs.reduce((a, b) => a + b, 0)) : "—"} sub="from logged rates" />
            </View>

            <Panel title="Contracts & rates" testID="site-contracts-panel">
              {withContract.length === 0 ? (
                <Text style={s.muted}>No contracts on file for this site yet — scan a bill and we&apos;ll add it once reviewed.</Text>
              ) : (
                <Table
                  testID="site-contracts-table"
                  cols={[
                    { key: "u", label: "Utility", flex: 1.2 },
                    { key: "s", label: "Supplier", flex: 1.5 },
                    { key: "r", label: "Unit / day rate", flex: 1.3 },
                    { key: "sc", label: "Standing charge", flex: 1.3 },
                    { key: "e", label: "Ends", flex: 1.1 },
                    { key: "st", label: "Status", flex: 1.1 },
                    { key: "x", label: "", flex: 0.9, align: "right" },
                  ]}
                >
                  {withContract.map((u) => {
                    const c = p.utilities[u];
                    return (
                      <TRow key={u} testID={`utility-section-${u}`} onPress={() => setOpen(u)}>
                        <Cell flex={1.2}><UtilCell utility={u} /></Cell>
                        <Cell flex={1.5} strong>{c.supplier_name || "Supplier TBC"}</Cell>
                        <Cell flex={1.3}>{p2(c.unit_rate_day, `/ ${c.usage_unit || "kWh"}`)}</Cell>
                        <Cell flex={1.3}>{p2(c.standing_charge, "/ day")}</Cell>
                        <Cell flex={1.1} muted>{fmt(c.end_date)}</Cell>
                        <Cell flex={1.1}><StatusPill days={c.days_until_expiry ?? 0} /></Cell>
                        <Cell flex={0.9} align="right"><Text style={s.link} testID={`utility-open-${u}`}>View rates</Text></Cell>
                      </TRow>
                    );
                  })}
                </Table>
              )}
            </Panel>

            {missing.length > 0 ? (
              <Panel title="No contract on file" testID="site-missing-panel">
                <View style={s.chips}>
                  {missing.map((u) => {
                    const m = util(u);
                    return (
                      <View key={u} style={s.chip} testID={`utility-section-${u}`}>
                        <Icon name={m.icon} size={14} color={m.color} />
                        <Text style={s.chipText}>{m.label}</Text>
                        <DialogButton testID={`utility-add-${u}`} label={`Scan ${m.label.toLowerCase()} bill`} variant="ghost" onPress={() => router.push("/scan")} />
                      </View>
                    );
                  })}
                </View>
              </Panel>
            ) : null}
          </>
        )}
      </DesktopPage>

      {open && p.utilities[open] ? (
        <ContractDrawer
          utility={open}
          contract={p.utilities[open]}
          businessName={p.property?.business_name}
          onClose={() => setOpen(null)}
          onQuote={() => { const u = open; setOpen(null); quote(u, p.utilities[u]); }}
          onRequestChange={() => { const c = p.utilities[open]; setOpen(null); p.onRequestChange(c); }}
        />
      ) : null}
    </>
  );
}

function ContractDrawer({ utility, contract: c, businessName, onClose, onQuote, onRequestChange }: {
  utility: string; contract: any; businessName?: string; onClose: () => void; onQuote: () => void; onRequestChange: () => void;
}) {
  const m = util(utility);
  const isElec = utility === "electricity";
  const unit = c.usage_unit || "kWh";
  const est = estCost(c);
  const days = c.days_until_expiry ?? 0;
  const fixed = String(c.tariff_type || "").toLowerCase() === "fixed";
  const rates: { label: string; value: string; strong?: boolean }[] = [
    { label: isElec ? "Day rate" : "Unit rate", value: p2(c.unit_rate_day, `/ ${unit}`) },
    { label: "Standing charge", value: p2(c.standing_charge, "/ day") },
    ...(isElec && c.unit_rate_night != null ? [{ label: "Night rate", value: p2(c.unit_rate_night, `/ ${unit}`) }] : []),
    ...(isElec && c.unit_rate_eve_weekend != null ? [{ label: "Eve / wknd rate", value: p2(c.unit_rate_eve_weekend, `/ ${unit}`) }] : []),
    ...(isElec && c.kva_charge != null ? [{ label: "kVA charge", value: p2(c.kva_charge, "/ day") }] : []),
    ...(isElec && c.availability_capacity != null ? [{ label: "Capacity", value: `${Number(c.availability_capacity).toLocaleString()} kVA` }] : []),
    { label: "Annual usage", value: c.annual_usage != null ? `${Number(c.annual_usage).toLocaleString()} ${unit}` : "—" },
    { label: "Est. annual cost", value: est != null ? gbp(est) : "—", strong: true },
  ];
  return (
    <SlideOver
      testID={`contract-drawer-${utility}`}
      title={`${m.label} contract`}
      subtitle={[c.supplier_name || "Supplier TBC", businessName].filter(Boolean).join(" · ")}
      icon={m.icon}
      iconBg={`${m.color}1F`}
      iconColor={m.color}
      width={600}
      onClose={onClose}
      footer={
        <>
          <DialogButton testID={`utility-request-change-${utility}`} label="Request callback" variant="ghost" onPress={onRequestChange} />
          <DialogButton testID={`utility-get-quote-${utility}`} label={c.renewable_now && days > 90 ? "Lock in new rate" : "Get quote"} variant="success" onPress={onQuote} />
        </>
      }
    >
      <View style={s.statusRow}>
        <StatusPill days={days} />
        {c.tariff_type ? (
          <View style={[s.badge, { backgroundColor: fixed ? "#D1FAE5" : "#FEF3C7" }]}>
            <Text style={[s.badgeText, { color: fixed ? "#059669" : "#B45309" }]}>{String(c.tariff_type).toUpperCase()}</Text>
          </View>
        ) : null}
        {c.tariff_name ? <Text style={s.muted} numberOfLines={1}>{c.tariff_name}</Text> : null}
      </View>

      <View>
        <Text style={s.section}>Rates &amp; estimated cost</Text>
        <View style={s.rateGrid} testID={`tariff-panel-${utility}`}>
          {rates.map((r) => (
            <View key={r.label} style={[s.rateCell, r.strong && s.rateCellStrong]}>
              <Text style={[s.rateLabel, r.strong && { color: colors.brandPrimary }]}>{r.label}</Text>
              <Text style={[s.rateValue, r.strong && { color: colors.brandPrimary }]}>{r.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {c.renewable_now && days > 90 ? (
        <View style={s.renew} testID={`renewable-banner-${utility}`}>
          <Text style={s.renewText}><Text style={{ fontFamily: font.bold }}>Renewable now.</Text> You can secure a new {m.label.toLowerCase()} contract up to 12 months before this one ends — locking in today&apos;s wholesale rates.</Text>
        </View>
      ) : null}

      <View>
        <Text style={s.section}>Meter &amp; contract details</Text>
        <View style={s.detailTable} testID={`meter-details-${utility}`}>
          {[
            [utility === "gas" ? "MPRN" : isElec ? "MPAN" : "Account", c.meter_point_number || c.account_number || "—"],
            ["Meter serial", c.meter_serial_number || "—"],
            ["Start date", fmt(c.start_date)],
            ["Contract end date", fmt(c.end_date)],
          ].map(([k, v], i) => (
            <View key={k} style={[s.detailRow, i > 0 && { borderTopWidth: 1, borderTopColor: dt.subtle }]}>
              <Text style={s.detailKey}>{k}</Text>
              <Text style={s.detailVal} numberOfLines={1}>{v}</Text>
            </View>
          ))}
        </View>
      </View>
    </SlideOver>
  );
}

const s = StyleSheet.create({
  loading: { height: 240, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: font.regular, fontSize: type.sm, color: dt.muted, flexShrink: 1 },
  link: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: dt.border, borderRadius: 10, paddingLeft: spacing.md, paddingRight: 6, paddingVertical: 6 },
  chipText: { fontFamily: font.semibold, fontSize: type.sm, color: dt.text, marginRight: spacing.sm },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.5 },
  section: { fontFamily: font.semibold, fontSize: type.base, color: dt.text, marginBottom: spacing.sm },
  rateGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rateCell: { flexBasis: "31%", flexGrow: 1, borderWidth: 1, borderColor: dt.border, borderRadius: 10, padding: spacing.md, gap: 4 },
  rateCellStrong: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  rateLabel: { fontFamily: font.medium, fontSize: type.kicker, letterSpacing: 0.4, textTransform: "uppercase", color: dt.muted },
  rateValue: { fontFamily: font.bold, fontSize: type.lg, color: dt.text },
  renew: { backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 10, padding: spacing.md },
  renewText: { fontFamily: font.regular, fontSize: type.sm, color: dt.text, lineHeight: 19 },
  detailTable: { borderWidth: 1, borderColor: dt.border, borderRadius: 10, overflow: "hidden" },
  detailRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, height: 44 },
  detailKey: { width: 170, fontFamily: font.medium, fontSize: type.sm, color: dt.muted },
  detailVal: { flex: 1, fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
});
