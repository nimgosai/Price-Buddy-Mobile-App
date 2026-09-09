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
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";

import { Button, Card } from "@/src/components/ui";
import { ScreenHeader, EmptyState } from "@/src/components/screen";
import { BusinessSwitcherChip } from "@/src/components/business-switcher-chip";
import { useBusiness } from "@/src/business/business-context";
import { useTabScrollToTop } from "@/src/utils/use-tab-scroll-to-top";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type Spend = {
  total_annual_spend: number;
  by_utility: any[];
  by_site: any[];
  contracts: any[];
};

const UTILITY: Record<string, { label: string; emoji: string; color: string }> = {
  electricity: { label: "Electricity", emoji: "⚡", color: "#F59E0B" },
  electric: { label: "Electricity", emoji: "⚡", color: "#F59E0B" },
  gas: { label: "Gas", emoji: "🔥", color: "#EF4444" },
  water: { label: "Water", emoji: "💧", color: "#3B82F6" },
  telecoms: { label: "Telecoms", emoji: "📞", color: "#10B981" },
  broadband: { label: "Broadband", emoji: "📡", color: "#8B5CF6" },
  other: { label: "Other", emoji: "🔌", color: "#6B7280" },
};
function utilityMeta(u?: string) {
  return UTILITY[(u || "").toLowerCase()] || UTILITY.other;
}

function gbp(n: number): string {
  return `£${Math.round(Number(n) || 0).toLocaleString("en-GB")}`;
}
function valueOf(it: any): number {
  return Number(it.annual_spend ?? it.spend ?? it.total ?? it.amount ?? it.annual_cost ?? it.total_spend ?? 0);
}

function BarGroup({ items, kind, testID }: { items: any[]; kind: "utility" | "site"; testID: string }) {
  const max = Math.max(1, ...items.map(valueOf));
  return (
    <View testID={testID} style={{ gap: spacing.md }}>
      {items.map((it, i) => {
        const v = valueOf(it);
        const pct = Math.max(0.04, v / max);
        const meta = utilityMeta(it.utility || it.utility_type);
        const label =
          kind === "utility"
            ? `${meta.emoji}  ${meta.label}`
            : (it.site || it.site_name || it.property_name || it.name || "Site").toString();
        const fill = kind === "utility" ? meta.color : colors.brandPrimary;
        return (
          <View key={i} style={styles.barRow}>
            <View style={styles.barTop}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {label}
              </Text>
              <Text style={styles.barValue}>{gbp(v)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: fill }]} />
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
  const { activeBizId, bizQuery } = useBusiness();
  const scrollRef = useTabScrollToTop();

  const [data, setData] = useState<Spend | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<Spend>(`/reports/spend${bizQuery()}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your report.");
    }
  }, [bizQuery]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load, activeBizId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const total = data?.total_annual_spend ?? 0;
  const byUtility = data?.by_utility ?? [];
  const bySite = data?.by_site ?? [];
  const contracts = data?.contracts ?? [];
  const isEmpty = !loading && !error && total === 0 && byUtility.length === 0;

  const goBack = () => router.push("/dashboard");

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="reports-header"
        title="Your spend"
        subtitle="Annual estimate based on your current tariffs and usage."
        onBack={goBack}
      />
      {loading && !data ? (
        <View style={styles.center} testID="reports-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <BusinessSwitcherChip variant="reports" />
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
              title="No data yet"
              message="Once a contract is confirmed with rates, your annual spend will appear here."
            >
              <Button testID="reports-scan-button" label="Scan a bill to get started" icon="scan-outline" onPress={() => router.push("/scan")} />
            </EmptyState>
          ) : (
            <>
              <View testID="reports-total" style={styles.totalCard}>
                <Text style={styles.totalLabel}>ESTIMATED ANNUAL SPEND</Text>
                <Text style={styles.totalValue}>{gbp(total)}</Text>
                <Text style={styles.totalSub}>
                  across {contracts.length || 0} contract{contracts.length === 1 ? "" : "s"}
                </Text>
                <Text style={styles.watermark}>£</Text>
              </View>

              {byUtility.length > 0 && (
                <Card style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>By utility</Text>
                  <BarGroup items={byUtility} kind="utility" testID="reports-by-utility" />
                </Card>
              )}

              {bySite.length > 1 && (
                <Card style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>By site</Text>
                  <BarGroup items={bySite} kind="site" testID="reports-by-site" />
                </Card>
              )}

              {contracts.length > 0 && (
                <Card style={styles.sectionCard} testID="reports-contracts">
                  <Text style={styles.sectionTitle}>Top contracts</Text>
                  <View style={{ gap: 10 }}>
                    {contracts.slice(0, 8).map((c: any, i: number) => {
                      const meta = utilityMeta(c.utility_type || c.utility);
                      return (
                        <View key={c.id || i} style={[styles.contractRow, { borderLeftColor: meta.color }]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.contractName} numberOfLines={1}>
                              {meta.emoji}  {c.supplier || c.supplier_name || meta.label}
                            </Text>
                            <Text style={styles.contractMeta} numberOfLines={1}>
                              {c.site || c.site_name || c.property_name || "—"}
                            </Text>
                          </View>
                          <Text style={styles.contractValue}>{gbp(valueOf(c))}</Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
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
  scroll: { padding: spacing.lg, gap: spacing.lg },
  errorCard: { alignItems: "center", gap: spacing.md },
  errorText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },

  totalCard: {
    backgroundColor: "#1A1F36",
    borderRadius: radius.lg,
    padding: spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  totalLabel: { fontFamily: font.bold, fontSize: type.sm, color: "rgba(255,255,255,0.95)", textTransform: "uppercase", letterSpacing: 0.6 },
  totalValue: { fontFamily: font.bold, fontSize: 38, color: "#FFFFFF", letterSpacing: -0.5, marginTop: 4 },
  totalSub: { fontFamily: font.medium, fontSize: type.sm, color: "rgba(255,255,255,0.92)", marginTop: 6 },
  watermark: { position: "absolute", right: -8, bottom: -52, fontSize: 168, lineHeight: 168, fontFamily: font.bold, color: "#FFFFFF", opacity: 0.06, pointerEvents: "none" },

  sectionCard: { gap: spacing.md },
  sectionTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, letterSpacing: -0.3 },

  barRow: { gap: spacing.xs },
  barTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  barLabel: { flex: 1, fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurface },
  barValue: { fontFamily: font.bold, fontSize: type.sm, color: colors.heading },
  barTrack: { height: 10, borderRadius: 999, backgroundColor: "#F3F4F6", overflow: "hidden" },
  barFill: { height: 10, borderRadius: 999 },

  contractRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: colors.divider,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
  },
  contractName: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  contractMeta: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  contractValue: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
});
