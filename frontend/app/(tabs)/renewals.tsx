import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import Ionicons from "@react-native-vector-icons/ionicons";
import dayjs from "dayjs";

import { Button, Card } from "@/src/components/ui";
import { ScreenHeader, EmptyState } from "@/src/components/screen";
import { Icon, IconName } from "@/src/components/icon";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";
import { RenewalsDesktopPage } from "@/src/desktop/renewals-desktop";

const UTIL_META: Record<string, { label: string; icon: IconName; color: string }> = {
  electricity: { label: "Electricity", icon: "bolt", color: "#F59E0B" },
  gas: { label: "Gas", icon: "fire", color: "#FB923C" },
  water: { label: "Water", icon: "droplet", color: "#3B82F6" },
  broadband: { label: "Broadband", icon: "wifi", color: "#0EA5E9" },
  telecoms: { label: "Telecoms", icon: "phone", color: "#0EA5E9" },
};

// Tiered days pill — mirrors the original web app.
function daysTier(n: number) {
  if (n <= 30)
    return { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", label: n < 0 ? `${Math.abs(n)} days overdue` : `${n} days left` };
  if (n <= 60) return { color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA", label: `${n} days left` };
  return { color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", label: `${n} days left` };
}

function siteAccent(days: number) {
  if (days <= 30) return "#DC2626";
  if (days <= 60) return "#EA580C";
  return "#D97706";
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = dayjs(dateStr);
  if (!d.isValid()) return null;
  return d.startOf("day").diff(dayjs().startOf("day"), "day");
}

export default function Renewals() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const isDesktop = useIsDesktop();

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

  // Group by business → site (mirrors the original web app).
  const groups = useMemo(() => {
    const map = new Map<string, { business_name: string; sites: Map<string, any> }>();
    items.forEach((c: any) => {
      const bId = c.business_id || "__none__";
      if (!map.has(bId)) map.set(bId, { business_name: c.business_name || "", sites: new Map() });
      const g = map.get(bId)!;
      const pId = c.property_id || c.id;
      if (!g.sites.has(pId))
        g.sites.set(pId, { property_id: c.property_id, property_name: c.property_name, postcode: c.postcode, contracts: [] });
      g.sites.get(pId).contracts.push(c);
    });
    return Array.from(map.values()).map((g) => ({ ...g, sites: Array.from(g.sites.values()) }));
  }, [items]);
  const bizCount = groups.length;

  // Mirrors the original: "N contracts across M sites · K businesses"
  const subtitle = (() => {
    if (items.length === 0) return "Nothing urgent right now";
    const sites = groups.reduce((n, g) => n + g.sites.length, 0);
    return `${items.length} contract${items.length === 1 ? "" : "s"} across ${sites} site${sites === 1 ? "" : "s"}${bizCount > 1 ? ` · ${bizCount} businesses` : ""}`;
  })();

  if (isDesktop) {
    return <RenewalsDesktopPage items={items} loading={loading} error={error} refreshing={refreshing} onRefresh={onRefresh} />;
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="renewals-header"
        title="Renewals coming up"
        subtitle={subtitle}
        onBack={() => router.push("/dashboard")}
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
              title="You're all caught up"
              message="No contracts expiring within 90 days."
            >
              <Button
                testID="renewals-scan-button"
                label="Scan a bill"
                icon="scan-outline"
                onPress={() => router.push("/scan")}
              />
            </EmptyState>
          ) : (
            groups.map((g, gi) => (
              <View key={`${g.business_name}${gi}`} testID={`renewal-biz-${gi}`} style={{ gap: spacing.md }}>
                {bizCount > 1 && !!g.business_name && (
                  <View style={styles.bizHead}>
                    <Icon name="building" size={13} color={colors.muted} />
                    <Text style={styles.bizHeadText} numberOfLines={1}>{g.business_name}</Text>
                  </View>
                )}
                {g.sites.map((s: any) => {
                  const worst = Math.min(...s.contracts.map((c: any) => c.days_until_expiry ?? daysUntil(c.end_date) ?? 999));
                  return (
                    <Pressable
                      key={s.property_id}
                      testID={`renewal-site-${s.property_id}`}
                      onPress={() => s.property_id && router.push(`/sites/${s.property_id}`)}
                      style={({ pressed }) => [styles.siteCard, { borderLeftColor: siteAccent(worst) }, pressed && { opacity: 0.92 }]}
                    >
                      <View style={styles.siteHead}>
                        <View style={styles.siteIcon}>
                          <Icon name="building" size={15} color={colors.brandPrimary} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.siteName} numberOfLines={2}>{s.property_name || "Site"}</Text>
                          {bizCount > 1 && !!g.business_name && (
                            <View style={styles.siteBizChip}>
                              <Text style={styles.siteBizChipText} numberOfLines={1}>{g.business_name}</Text>
                            </View>
                          )}
                        </View>
                        {!!s.postcode && <Text style={styles.sitePostcode}>{s.postcode}</Text>}
                        <Icon name="chevronRight" size={16} color={colors.muted} />
                      </View>
                      <View style={{ gap: 10 }}>
                        {s.contracts.map((c: any, ci: number) => {
                          const days = c.days_until_expiry ?? daysUntil(c.end_date) ?? 0;
                          const tier = daysTier(days);
                          const meta = UTIL_META[c.utility_type] || { label: c.utility_type, icon: "bolt" as IconName, color: "#888" };
                          return (
                            <Pressable
                              key={c.contract_id || c.id || ci}
                              testID={`renewal-contract-${c.contract_id || c.id || ci}`}
                              onPress={() => s.property_id && router.push(`/sites/${s.property_id}`)}
                              style={({ pressed }) => [styles.contractRow, narrow && { paddingHorizontal: 10, gap: 8 }, pressed && { opacity: 0.9 }]}
                            >
                              <View style={[styles.utilIcon, { backgroundColor: `${meta.color}1F` }, narrow && { width: 32, height: 32 }]}>
                                <Icon name={meta.icon} size={narrow ? 15 : 18} color={meta.color} />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[styles.contractTitle, narrow && { fontSize: 13 }]}>{meta.label}</Text>
                                <Text style={[styles.contractSupplier, narrow && { fontSize: 12 }]}>{c.supplier_name || "Supplier TBC"}</Text>
                              </View>
                              <View style={[styles.daysPill, { backgroundColor: tier.bg, borderColor: tier.border }, narrow && { paddingHorizontal: 7 }]}>
                                <Text style={[styles.daysPillText, { color: tier.color }, narrow && { fontSize: 11 }]}>{tier.label}</Text>
                              </View>
                              <Icon name="chevronRight" size={14} color={colors.muted} />
                            </Pressable>
                          );
                        })}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))
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

  bizHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, marginTop: 4 },
  bizHeadText: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.muted, textTransform: "uppercase" },
  siteCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: 14,
    paddingLeft: 16,
    gap: 10,
  },
  siteHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  siteIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  siteName: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  siteBizChip: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.divider },
  siteBizChipText: { fontFamily: font.bold, fontSize: 10, color: colors.onSurfaceSecondary },
  sitePostcode: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted, marginTop: 7 },
  contractRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.divider, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  utilIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  contractTitle: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  contractSupplier: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  daysPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, flexShrink: 0 },
  daysPillText: { fontFamily: font.medium, fontSize: 12 },
});
