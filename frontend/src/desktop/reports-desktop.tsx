/** Desktop-web Reports page: metric cards, side-by-side breakdowns and contracts table (≥1024px only). */
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { BusinessSwitcherChip } from "@/src/components/business-switcher-chip";
import { DialogButton } from "@/src/desktop/overlays";
import { dt } from "@/src/desktop/tokens";
import {
  Cell, DesktopPage, EmptyPanel, HeaderButton, Metric, Panel, TRow, Table, UtilCell, ds, gbp, spendOf, util,
} from "@/src/desktop/ui";
import { colors, font, spacing, type } from "@/src/theme/theme";

function Bars({ items, kind, total, testID }: { items: any[]; kind: "utility" | "site"; total: number; testID: string }) {
  const max = Math.max(1, ...items.map(spendOf));
  return (
    <View style={{ gap: spacing.md }} testID={testID}>
      {items.map((it, i) => {
        const v = spendOf(it);
        const m = util(it.utility || it.utility_type);
        const label = kind === "utility" ? m.label : String(it.site || it.site_name || it.property_name || it.name || "Site");
        return (
          <View key={i} style={s.barRow}>
            <Text style={s.barLabel} numberOfLines={1}>{label}</Text>
            <View style={s.track}><View style={[s.fill, { width: `${Math.max(3, (v / max) * 100)}%`, backgroundColor: kind === "utility" ? m.color : colors.brandPrimary }]} /></View>
            <Text style={s.barValue}>{gbp(v)}</Text>
            <Text style={s.barPct}>{total > 0 ? Math.round((v / total) * 100) : 0}%</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ReportsDesktop({ data, loading, error, refreshing, onRefresh }: { data: any | null; loading: boolean; error: string | null; refreshing: boolean; onRefresh: () => void }) {
  const router = useRouter();
  const total = Number(data?.total_annual_spend ?? 0);
  const byUtility: any[] = data?.by_utility ?? [];
  const bySite: any[] = data?.by_site ?? [];
  const contracts: any[] = data?.contracts ?? [];
  const isEmpty = !loading && !error && total === 0 && byUtility.length === 0;
  const avg = contracts.length ? total / contracts.length : 0;

  return (
    <DesktopPage
      testID="reports-desktop"
      title="Spend & reports"
      subtitle="Annual estimate based on your current tariffs and usage."
      refreshing={refreshing}
      onRefresh={onRefresh}
      actions={<HeaderButton label="Scan a bill" icon="scan" onPress={() => router.push("/scan")} testID="reports-scan-header" />}
    >
      <View style={{ zIndex: 5, alignSelf: "flex-start", minWidth: 240 }}><BusinessSwitcherChip variant="reports" /></View>
      {loading && !data ? (
        <View style={s.loading} testID="reports-loading"><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
      ) : error ? (
        <EmptyPanel testID="reports-error" icon="warning" title="Couldn't load your report" sub={error} action={<DialogButton label="Try again" variant="ghost" onPress={onRefresh} />} />
      ) : isEmpty ? (
        <EmptyPanel
          testID="reports-empty"
          icon="bolt"
          title="No data yet"
          sub="Once a contract is confirmed with rates, your annual spend will appear here."
          action={<DialogButton testID="reports-scan-button" label="Scan a bill to get started" onPress={() => router.push("/scan")} />}
        />
      ) : (
        <>
          <View style={ds.metrics} testID="reports-total">
            <Metric label="Estimated annual spend" value={gbp(total)} sub={`across ${contracts.length} contract${contracts.length === 1 ? "" : "s"}`} dark />
            <Metric label="Monthly average" value={gbp(total / 12)} sub="estimated" />
            <Metric label="Avg. per contract" value={gbp(avg)} sub="per year" />
            <Metric label="Sites" value={String(bySite.length || 1)} sub={`${byUtility.length} utilit${byUtility.length === 1 ? "y" : "ies"}`} />
          </View>
          <View style={ds.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Panel title="By utility"><Bars items={byUtility} kind="utility" total={total} testID="reports-by-utility" /></Panel>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Panel title="By site">
                {bySite.length > 0 ? <Bars items={bySite} kind="site" total={total} testID="reports-by-site" /> : <Text style={s.muted}>Add more sites to compare spend across locations.</Text>}
              </Panel>
            </View>
          </View>
          {contracts.length > 0 ? (
            <Panel title="Contracts" testID="reports-contracts">
              <Table
                cols={[
                  { key: "u", label: "Utility", flex: 1.2 },
                  { key: "s", label: "Supplier", flex: 1.6 },
                  { key: "site", label: "Site", flex: 2 },
                  { key: "v", label: "Annual spend", flex: 1.1, align: "right" },
                  { key: "p", label: "Share", flex: 0.8, align: "right" },
                ]}
              >
                {contracts.map((c, i) => {
                  const v = spendOf(c);
                  return (
                    <TRow key={c.id || i} testID={`reports-contract-row-${i}`}>
                      <Cell flex={1.2}><UtilCell utility={c.utility_type || c.utility} /></Cell>
                      <Cell flex={1.6} strong>{c.supplier || c.supplier_name || util(c.utility_type || c.utility).label}</Cell>
                      <Cell flex={2} muted>{c.site || c.site_name || c.property_name || "—"}</Cell>
                      <Cell flex={1.1} align="right" strong>{gbp(v)}</Cell>
                      <Cell flex={0.8} align="right" muted>{`${total > 0 ? Math.round((v / total) * 100) : 0}%`}</Cell>
                    </TRow>
                  );
                })}
              </Table>
            </Panel>
          ) : null}
        </>
      )}
    </DesktopPage>
  );
}

const s = StyleSheet.create({
  loading: { height: 240, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: font.regular, fontSize: type.sm, color: dt.muted },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  barLabel: { width: 130, fontFamily: font.medium, fontSize: type.sm, color: dt.body },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: dt.subtle, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  barValue: { width: 80, textAlign: "right", fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
  barPct: { width: 40, textAlign: "right", fontFamily: font.regular, fontSize: type.kicker, color: dt.muted },
});
