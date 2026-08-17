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
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { Button, Card, StatusPill } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";

const EMPTY_IMG =
  "https://images.unsplash.com/photo-1683921055230-c3ba01e70131?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMG1vZGVybiUyMG9mZmljZSUyMGRlc2slMjBmbGF0bGF5fGVufDB8fHx8MTc4NjcwMzUzMnww&ixlib=rb-4.1.0&q=85";

type Overview = {
  properties: any[];
  total_contracts: number;
  urgency_summary: Record<string, number>;
  expiring_contracts: any[];
  all_contracts: any[];
};

const URGENCY_ORDER = ["critical", "high", "medium", "renewable", "low", "normal"];
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
  if (days <= 14) return "critical";
  if (days <= 30) return "high";
  if (days <= 60) return "medium";
  if (days <= 90) return "renewable";
  return "low";
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ov, rn, au] = await Promise.all([
        apiRequest<Overview>("/dashboard/overview"),
        apiRequest<{ items: any[] }>("/renewals/urgent"),
        apiRequest<any[]>("/my/audits-in-progress"),
      ]);
      setOverview(ov);
      setRenewals(Array.isArray(rn?.items) ? rn.items : []);
      setAudits(Array.isArray(au) ? au : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your dashboard.");
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

  const requestCall = async (scanId: string) => {
    if (!scanId || callingId) return;
    setCallingId(scanId);
    try {
      await apiRequest(`/scans/${scanId}/request-call`, { method: "POST" });
      toast("We'll call you back shortly.", "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't request a call.", "error");
    } finally {
      setCallingId(null);
    }
  };

  const greetingName =
    user?.full_name || user?.company_name || user?.email?.split("@")[0] || "there";

  const totalContracts = overview?.total_contracts ?? 0;
  const isEmpty = !loading && !error && totalContracts === 0;
  const renewalList = renewals.length > 0 ? renewals : overview?.expiring_contracts ?? [];

  return (
    <View style={styles.root}>
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../assets/images/pricebuddy-logo.webp")}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerKicker}>Welcome back</Text>
            <Text testID="dashboard-greeting" style={styles.headerTitle} numberOfLines={1}>
              Hi, {greetingName}
            </Text>
          </View>
        </View>
        <Pressable
          testID="dashboard-scan-icon"
          onPress={() => router.push("/scan")}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name="scan-outline" size={22} color={colors.brandPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center} testID="dashboard-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          testID="dashboard-scroll"
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + spacing["2xl"] },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <Card testID="dashboard-error" style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={onRefresh} />
            </Card>
          ) : (
            <>
              {audits.map((a, i) => {
                const scanId = a?.id || a?.scan_id || a?._id || "";
                return (
                  <View key={scanId || i} testID={`audit-banner-${i}`} style={styles.auditBanner}>
                    <View style={styles.auditIconWrap}>
                      <Ionicons name="time-outline" size={20} color={colors.warning} />
                    </View>
                    <View style={styles.auditBody}>
                      <Text style={styles.auditTitle}>Audit in progress</Text>
                      <Text style={styles.auditText}>
                        Our team is verifying your bill. We&apos;ll confirm within a day.
                      </Text>
                      <Pressable
                        testID={`audit-request-call-${i}`}
                        onPress={() => requestCall(scanId)}
                        disabled={callingId === scanId}
                        style={styles.auditCta}
                      >
                        {callingId === scanId ? (
                          <ActivityIndicator size="small" color={colors.brandPrimary} />
                        ) : (
                          <>
                            <Ionicons name="call-outline" size={16} color={colors.brandPrimary} />
                            <Text style={styles.auditCtaText}>Request a call now</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {isEmpty ? (
                <View style={styles.emptyWrap} testID="dashboard-empty">
                  <Image
                    source={{ uri: EMPTY_IMG }}
                    style={styles.emptyImg}
                    contentFit="cover"
                    transition={200}
                  />
                  <Text style={styles.emptyTitle}>No contracts uploaded yet</Text>
                  <Text style={styles.emptySub}>
                    Snap a photo of a utility bill and we&apos;ll extract the details and
                    track your renewals automatically.
                  </Text>
                  <Button
                    testID="empty-scan-button"
                    label="Scan a bill"
                    icon="scan-outline"
                    onPress={() => router.push("/scan")}
                    style={{ alignSelf: "stretch", marginTop: spacing.lg }}
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Utility health</Text>
                  <Card testID="utility-health-card">
                    <View style={styles.healthTop}>
                      <View>
                        <Text style={styles.healthCount}>{totalContracts}</Text>
                        <Text style={styles.healthLabel}>
                          {totalContracts === 1 ? "contract" : "contracts"} tracked
                        </Text>
                      </View>
                      <View style={styles.healthProps}>
                        <Ionicons name="business-outline" size={16} color={colors.muted} />
                        <Text style={styles.healthPropsText}>
                          {overview?.properties?.length ?? 0} site
                          {(overview?.properties?.length ?? 0) === 1 ? "" : "s"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.urgencyGrid}>
                      {URGENCY_ORDER.filter(
                        (k) => (overview?.urgency_summary?.[k] ?? 0) > 0,
                      ).map((k) => (
                        <View key={k} style={styles.urgencyStat} testID={`urgency-${k}`}>
                          <View style={[styles.urgencyDot, { backgroundColor: colors.urgency[k] }]} />
                          <Text style={styles.urgencyNum}>{overview?.urgency_summary?.[k]}</Text>
                          <Text style={styles.urgencyName}>{URGENCY_LABEL[k]}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>

                  {renewalList.length > 0 && (
                    <>
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>Upcoming renewals</Text>
                        <Pressable testID="dashboard-see-renewals" onPress={() => router.push("/renewals")}>
                          <Text style={styles.sectionLink}>See all</Text>
                        </Pressable>
                      </View>
                      {renewalList.slice(0, 4).map((c: any, i: number) => {
                        const end = c.end_date || c.contract_end_date || c.renewal_date;
                        const days = daysUntil(end);
                        const urg = c.urgency || urgencyForDays(days);
                        const color = colors.urgency[urg] || colors.urgency.normal;
                        return (
                          <Card key={c.id || c._id || i} testID={`renewal-card-${i}`} style={styles.renewalCard}>
                            <View style={styles.renewalTop}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.renewalSupplier} numberOfLines={1}>
                                  {c.supplier_name || c.supplier || "Contract"}
                                </Text>
                                <Text style={styles.renewalMeta} numberOfLines={1}>
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
                            {end && (
                              <Text style={styles.renewalDate}>Ends {dayjs(end).format("D MMM YYYY")}</Text>
                            )}
                          </Card>
                        );
                      })}
                    </>
                  )}

                  <Pressable
                    testID="dashboard-scan-tile"
                    onPress={() => router.push("/scan")}
                    style={({ pressed }) => [styles.scanTile, pressed && { opacity: 0.9 }]}
                  >
                    <View style={styles.scanTileIcon}>
                      <Ionicons name="scan-outline" size={24} color={colors.onBrandPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scanTileTitle}>Scan a bill</Text>
                      <Text style={styles.scanTileSub}>Snap a utility bill to add or update a contract</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.onBrandPrimary} />
                  </Pressable>

                  <Pressable
                    testID="dashboard-reports-tile"
                    onPress={() => router.push("/reports")}
                    style={({ pressed }) => [styles.reportsTile, pressed && { opacity: 0.9 }]}
                  >
                    <View style={styles.reportsIcon}>
                      <Ionicons name="bar-chart-outline" size={22} color={colors.brandPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportsTitle}>View spend report</Text>
                      <Text style={styles.reportsSub}>Your annual utility spend across all sites</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </Pressable>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  logo: { width: 40, height: 40 },
  headerKicker: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.muted,
  },
  headerTitle: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.heading,
    letterSpacing: -0.4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandTertiary,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md },

  errorCard: { alignItems: "center", gap: spacing.md },
  errorText: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
  },

  auditBanner: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FCD9A8",
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  auditIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "#FDEBCF",
    alignItems: "center",
    justifyContent: "center",
  },
  auditBody: { flex: 1, gap: spacing.xs },
  auditTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  auditText: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
  },
  auditCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  auditCtaText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brandPrimary },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.heading,
    marginTop: spacing.sm,
  },
  sectionLink: {
    fontFamily: font.semibold,
    fontSize: type.base,
    color: colors.brandPrimary,
    marginTop: spacing.sm,
  },

  healthTop: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  healthCount: { fontFamily: font.bold, fontSize: 40, color: colors.heading, letterSpacing: -1 },
  healthLabel: { fontFamily: font.medium, fontSize: type.base, color: colors.muted },
  healthProps: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  healthPropsText: { fontFamily: font.medium, fontSize: type.base, color: colors.muted },
  urgencyGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  urgencyStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },
  urgencyNum: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  urgencyName: { fontFamily: font.medium, fontSize: type.base, color: colors.muted },

  renewalCard: { gap: spacing.sm },
  renewalTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  renewalSupplier: { fontFamily: font.semibold, fontSize: type.lg, color: colors.heading },
  renewalMeta: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.muted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  renewalDate: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary },

  scanTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  scanTileIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanTileTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.onBrandPrimary },
  scanTileSub: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

  reportsTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  reportsIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  reportsTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  reportsSub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2 },

  emptyWrap: { alignItems: "center", paddingVertical: spacing["2xl"], paddingHorizontal: spacing.sm },
  emptyImg: { width: "100%", height: 180, borderRadius: radius.md, marginBottom: spacing.xl },
  emptyTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, textAlign: "center" },
  emptySub: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
