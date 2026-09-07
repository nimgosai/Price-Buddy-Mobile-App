import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { Button, Card, StatusPill } from "@/src/components/ui";
import { ScreenHeader, EmptyState } from "@/src/components/screen";
import { AppTabBar } from "@/src/components/app-tab-bar";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

function daysUntil(d?: string): number | null {
  if (!d) return null;
  const v = dayjs(d);
  return v.isValid() ? v.startOf("day").diff(dayjs().startOf("day"), "day") : null;
}
function urg(days: number | null): string {
  if (days === null) return "normal";
  if (days < 0 || days <= 14) return "critical";
  if (days <= 30) return "high";
  if (days <= 60) return "medium";
  if (days <= 90) return "renewable";
  return "low";
}

export default function ContractsOverview() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<any>("/dashboard/overview");
      const list = res?.all_contracts || res?.contracts || [];
      setContracts(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your contracts.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/dashboard"));

  return (
    <View style={styles.root}>
      <ScreenHeader testID="contracts-header" title="All contracts" subtitle="Every contract we track for you" onBack={goBack} />
      {loading ? (
        <View style={styles.center} testID="contracts-loading"><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <Card testID="contracts-error" style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={onRefresh} />
            </Card>
          ) : contracts.length === 0 ? (
            <EmptyState testID="contracts-empty" icon="document-text-outline" title="No contracts yet" message="Scan a bill and we'll add your contracts here automatically.">
              <Button label="Scan a bill" icon="scan-outline" onPress={() => router.push("/scan")} />
            </EmptyState>
          ) : (
            contracts.map((c: any, i: number) => {
              const end = c.end_date || c.contract_end_date || c.renewal_date;
              const days = daysUntil(end);
              const u = c.urgency || urg(days);
              const color = colors.urgency[u] || colors.urgency.normal;
              return (
                <Pressable
                  key={c.id || c._id || i}
                  testID={`contract-card-${i}`}
                  onPress={() =>
                    router.push({
                      pathname: "/contracts/[id]/edit",
                      params: {
                        id: c.id || c._id || "",
                        property_id: c.property_id || "",
                        supplier: c.supplier_name || c.supplier || "",
                        utility_type: c.utility_type || "",
                        start_date: c.start_date || "",
                        end_date: end || "",
                      },
                    })
                  }
                  style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                >
                  <Card style={styles.card}>
                    <View style={styles.top}>
                      <View style={[styles.icon, { backgroundColor: `${color}1A` }]}>
                        <Ionicons name="flash" size={18} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.supplier} numberOfLines={1}>{c.supplier_name || c.supplier || "Contract"}</Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          {(c.utility_type || "utility").toString().replace(/_/g, " ")}
                          {c.property_name ? ` • ${c.property_name}` : ""}
                        </Text>
                      </View>
                      <StatusPill label={days === null ? "Active" : days < 0 ? "Expired" : `${days}d`} color={color} />
                    </View>
                    <View style={styles.bottom}>
                      <Text style={styles.date}>{end ? `Ends ${dayjs(end).format("D MMM YYYY")}` : "End date pending"}</Text>
                      {c.annual_cost ? <Text style={styles.cost}>£{Number(c.annual_cost).toLocaleString("en-GB")}/yr</Text> : null}
                    </View>
                  </Card>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
      <AppTabBar active="sites" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  errorCard: { alignItems: "center", gap: spacing.md },
  errorText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },
  card: { gap: spacing.md },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  supplier: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  meta: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2, textTransform: "capitalize" },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },
  date: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },
  cost: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
});
