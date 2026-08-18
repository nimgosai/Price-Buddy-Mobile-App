import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card } from "@/src/components/ui";
import { ScreenHeader, EmptyState } from "@/src/components/screen";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, spacing, type } from "@/src/theme/theme";

type Spend = {
  total_annual_spend: number;
  by_utility: any[];
  by_site: any[];
  contracts: any[];
};

const BAR_COLORS = ["#F25028", "#1F2A44", "#10B981", "#F59E0B", "#6B7280", "#F97316"];

function gbp(n: number): string {
  return `£${Math.round(Number(n) || 0).toLocaleString("en-GB")}`;
}

function labelOf(it: any): string {
  return (it.utility_type || it.name || it.site_name || it.property_name || it.label || "—")
    .toString()
    .replace(/_/g, " ");
}
function valueOf(it: any): number {
  return Number(it.spend ?? it.total ?? it.amount ?? it.annual_cost ?? it.total_spend ?? 0);
}

function monthLabel(raw: any): string {
  const s = `${raw ?? ""}`;
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) {
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return names[Math.max(0, Math.min(11, parseInt(m[2], 10) - 1))];
  }
  return s.slice(0, 3);
}
function normalizeMonthly(d: any): { label: string; value: number }[] {
  const arr = d?.by_month || d?.monthly || d?.spend_by_month || d?.monthly_spend || [];
  if (!Array.isArray(arr)) return [];
  return arr.map((it: any) => ({
    label: monthLabel(it.month ?? it.label ?? it.period ?? it.name),
    value: Number(it.spend ?? it.total ?? it.amount ?? it.value ?? 0),
  }));
}

function MonthlyTrend({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={styles.trendRow} testID="reports-monthly-trend">
      {items.map((it, i) => {
        const h = Math.max(4, Math.round((it.value / max) * 96));
        return (
          <View key={i} style={styles.trendCol}>
            <View style={[styles.trendBar, { height: h }]} />
            <Text style={styles.trendLabel}>{it.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function BarGroup({ items, testID }: { items: any[]; testID: string }) {
  const max = Math.max(1, ...items.map(valueOf));
  return (
    <View testID={testID} style={{ gap: spacing.md }}>
      {items.map((it, i) => {
        const v = valueOf(it);
        const pct = Math.max(0.04, v / max);
        return (
          <View key={i} style={styles.barRow}>
            <View style={styles.barTop}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {labelOf(it)}
              </Text>
              <Text style={styles.barValue}>{gbp(v)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function Reports() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [data, setData] = useState<Spend | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<Spend>("/reports/spend");
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your report.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const total = data?.total_annual_spend ?? 0;
  const byUtility = data?.by_utility ?? [];
  const bySite = data?.by_site ?? [];
  const monthly = normalizeMonthly(data);
  const isEmpty = !loading && !error && total === 0 && byUtility.length === 0;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/dashboard");
  };

  return (
    <View style={styles.root}>
      <ScreenHeader testID="reports-header" title="Reports" subtitle="Your annual utility spend" onBack={goBack} />
      {loading ? (
        <View style={styles.center} testID="reports-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <Card testID="reports-error" style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={onRefresh} />
            </Card>
          ) : isEmpty ? (
            <EmptyState
              testID="reports-empty"
              icon="bar-chart-outline"
              title="No spend to show yet"
              message="Once your contracts are on file, we'll break down your annual utility spend here."
            >
              <Button testID="reports-scan-button" label="Scan a bill" icon="scan-outline" onPress={() => router.push("/scan")} />
            </EmptyState>
          ) : (
            <>
              <Card testID="reports-total" style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total annual spend</Text>
                <Text style={styles.totalValue}>{gbp(total)}</Text>
                <Text style={styles.totalSub}>
                  Across {bySite.length || data?.contracts?.length || 0} site
                  {(bySite.length || data?.contracts?.length || 0) === 1 ? "" : "s"}
                </Text>
              </Card>

              {monthly.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Monthly spend</Text>
                  <Card>
                    <MonthlyTrend items={monthly} />
                  </Card>
                </>
              )}

              {byUtility.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>By utility</Text>
                  <Card>
                    <BarGroup items={byUtility} testID="reports-by-utility" />
                  </Card>
                </>
              )}

              {bySite.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>By site</Text>
                  <Card>
                    <BarGroup items={bySite} testID="reports-by-site" />
                  </Card>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  errorCard: { alignItems: "center", gap: spacing.md },
  errorText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },

  totalCard: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  totalLabel: { fontFamily: font.medium, fontSize: type.base, color: "rgba(255,255,255,0.85)" },
  totalValue: { fontFamily: font.bold, fontSize: 40, color: colors.onBrandPrimary, letterSpacing: -1, marginTop: spacing.xs },
  totalSub: { fontFamily: font.regular, fontSize: type.base, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  sectionTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: spacing.sm },

  barRow: { gap: spacing.xs },
  barTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  barLabel: { flex: 1, fontFamily: font.medium, fontSize: type.base, color: colors.onSurface, textTransform: "capitalize" },
  barValue: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  barTrack: { height: 10, borderRadius: 999, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 999 },

  trendRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 128 },
  trendCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: spacing.xs },
  trendBar: { width: 10, borderRadius: 999, backgroundColor: colors.brandPrimary },
  trendLabel: { fontFamily: font.regular, fontSize: 10, color: colors.muted },
});
