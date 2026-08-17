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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { Button, Card, StatusPill } from "@/src/components/ui";
import { ScreenHeader, EmptyState } from "@/src/components/screen";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const URGENCY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  renewable: "Renewable",
  low: "Low",
  normal: "Normal",
};

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = dayjs(dateStr);
  if (!d.isValid()) return null;
  return d.startOf("day").diff(dayjs().startOf("day"), "day");
}

function urgencyForDays(days: number | null): string {
  if (days === null) return "normal";
  if (days < 0) return "critical";
  if (days <= 14) return "critical";
  if (days <= 30) return "high";
  if (days <= 60) return "medium";
  if (days <= 90) return "renewable";
  return "low";
}

export default function Renewals() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<{ items: any[] }>("/renewals/urgent");
      const list = Array.isArray(res?.items) ? res.items : [];
      list.sort((a, b) => {
        const da = daysUntil(a.end_date || a.contract_end_date || a.renewal_date) ?? 9999;
        const db = daysUntil(b.end_date || b.contract_end_date || b.renewal_date) ?? 9999;
        return da - db;
      });
      setItems(list);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your renewals.");
    }
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
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="renewals-header"
        title="Renewals"
        subtitle="Contracts in the 90-day action window"
      />
      {loading ? (
        <View style={styles.center} testID="renewals-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <Card testID="renewals-error" style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={onRefresh} />
            </Card>
          ) : items.length === 0 ? (
            <EmptyState
              testID="renewals-empty"
              icon="checkmark-done-circle-outline"
              title="Nothing due soon"
              message="You have no contracts inside the 90-day renewal window. We'll flag them here the moment one gets close."
            >
              <Button
                testID="renewals-scan-button"
                label="Scan a bill"
                icon="scan-outline"
                onPress={() => router.push("/scan")}
              />
            </EmptyState>
          ) : (
            items.map((c: any, i: number) => {
              const end = c.end_date || c.contract_end_date || c.renewal_date;
              const days = daysUntil(end);
              const urg = c.urgency || urgencyForDays(days);
              const color = colors.urgency[urg] || colors.urgency.normal;
              return (
                <Card key={c.id || c._id || i} testID={`renewals-card-${i}`} style={styles.card}>
                  <View style={styles.top}>
                    <View style={[styles.utilIcon, { backgroundColor: `${color}1A` }]}>
                      <Ionicons name="flash" size={18} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.supplier} numberOfLines={1}>
                        {c.supplier_name || c.supplier || "Contract"}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {(c.utility_type || "utility").toString().replace(/_/g, " ")}
                        {c.property_name ? ` • ${c.property_name}` : ""}
                      </Text>
                    </View>
                    <StatusPill
                      label={
                        days === null
                          ? URGENCY_LABEL[urg] || "Normal"
                          : days < 0
                            ? "Expired"
                            : `${days}d left`
                      }
                      color={color}
                    />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.bottom}>
                    <Text style={styles.date}>
                      {end ? `Ends ${dayjs(end).format("D MMM YYYY")}` : "End date pending"}
                    </Text>
                    {c.annual_cost ? (
                      <Text style={styles.cost}>
                        £{Number(c.annual_cost).toLocaleString("en-GB")}/yr
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    testID={`renewals-quote-${i}`}
                    onPress={() =>
                      router.push({
                        pathname: "/quote/new",
                        params: {
                          utility_type: c.utility_type || "electricity",
                          contract_id: c.id || c._id || "",
                          property_id: c.property_id || "",
                          supplier: c.supplier_name || c.supplier || "",
                        },
                      })
                    }
                    style={({ pressed }) => [styles.quoteBtn, pressed && { opacity: 0.9 }]}
                  >
                    <Ionicons name="pricetag-outline" size={16} color={colors.onBrandPrimary} />
                    <Text style={styles.quoteText}>Get a better deal</Text>
                  </Pressable>
                </Card>
              );
            })
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
  errorText: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
  },
  card: { gap: spacing.md },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  utilIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  supplier: { fontFamily: font.semibold, fontSize: type.lg, color: colors.heading },
  meta: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.muted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  divider: { height: 1, backgroundColor: colors.divider },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary },
  cost: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  quoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandPrimary,
  },
  quoteText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onBrandPrimary },
});
