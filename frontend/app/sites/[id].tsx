import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { Button } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { RequestChangeModal } from "@/src/components/request-change-modal";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type UMeta = { label: string; icon: IconName; color: string };
const UTIL_ORDER = ["electricity", "gas", "water", "broadband", "telecoms"] as const;
const UTIL_META: Record<string, UMeta> = {
  electricity: { label: "Electricity", icon: "bolt", color: "#F59E0B" },
  gas: { label: "Gas", icon: "fire", color: "#EA580C" },
  water: { label: "Water", icon: "droplet", color: "#2563EB" },
  broadband: { label: "Broadband", icon: "wifi", color: "#7C3AED" },
  telecoms: { label: "Telecoms", icon: "phone", color: "#059669" },
};

function fmt(d?: string) {
  if (!d) return "—";
  const x = dayjs(d);
  return x.isValid() ? x.format("D MMM YYYY") : "—";
}

export default function SiteDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string; address?: string }>();

  const [property, setProperty] = useState<any>(null);
  const [utilities, setUtilities] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rcContract, setRcContract] = useState<any>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<any>(`/properties/${params.id}/utilities`);
      setProperty(res?.property || null);
      setUtilities(res?.utilities || {});
      const init: Record<string, boolean> = {};
      UTIL_ORDER.forEach((u) => (init[u] = true));
      setExpanded(init);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this site.");
    }
  }, [params.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/dashboard");
  };

  const title = property?.property_name || property?.address || params.name || "Site";
  const subtitle =
    property?.address
      ? `${property.address}${property.postcode ? `, ${property.postcode}` : ""}`
      : params.address || undefined;

  // Which utilities to show: those with a contract, else all
  const present = UTIL_ORDER.filter((u) => utilities[u]);
  const shown = present.length > 0 ? present : UTIL_ORDER;

  return (
    <View style={styles.root}>
      <ScreenHeader testID="site-detail-header" title={title} subtitle={subtitle} onBack={goBack} />
      {loading ? (
        <View style={styles.center} testID="site-detail-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorCard} testID="site-detail-error">
              <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={load} />
            </View>
          ) : (
            <>
              {shown.map((u) => {
                const meta = UTIL_META[u];
                const c = utilities[u];
                const open = expanded[u];
                const days = c?.days_until_expiry;
                return (
                  <View key={u} style={styles.card} testID={`utility-section-${u}`}>
                    <Pressable
                      testID={`utility-toggle-${u}`}
                      onPress={() => setExpanded((p) => ({ ...p, [u]: !p[u] }))}
                      style={styles.cardHead}
                    >
                      <View style={[styles.uIcon, { backgroundColor: `${meta.color}22` }]}>
                        <Icon name={meta.icon} size={18} color={meta.color} />
                      </View>
                      <Text style={styles.uLabel}>{meta.label}</Text>
                      <Icon
                        name={open ? "chevronDown" : "chevronRight"}
                        size={18}
                        color={colors.muted}
                      />
                    </Pressable>

                    {open && (
                      <View style={styles.cardBody}>
                        {c ? (
                          <>
                            <View style={styles.supRow}>
                              <View>
                                <Text style={styles.mini}>Supplier</Text>
                                <Text style={styles.supVal}>{c.supplier_name || "—"}</Text>
                              </View>
                              <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.mini}>{days < 0 ? "Expired" : "Ends"}</Text>
                                <Text
                                  style={[
                                    styles.supVal,
                                    { color: days < 60 ? colors.error : colors.heading },
                                  ]}
                                >
                                  {days < 0 ? `${Math.abs(days)} days ago` : `in ${days} days`}
                                </Text>
                              </View>
                            </View>

                            {c.renewable_now && days > 90 && (
                              <View style={styles.renewBanner} testID={`renewable-banner-${u}`}>
                                <Text style={{ fontSize: 16 }}>🔓</Text>
                                <Text style={styles.renewText}>
                                  <Text style={styles.renewStrong}>Renewable now.</Text> UK businesses
                                  can secure a new {meta.label.toLowerCase()} contract up to 12 months
                                  before this one ends — locking in today&apos;s wholesale rates.
                                </Text>
                              </View>
                            )}

                            <View style={styles.grid}>
                              <Detail
                                label={u === "gas" ? "MPRN" : u === "electricity" ? "MPAN" : "Account"}
                                value={c.meter_point_number || c.account_number || "—"}
                              />
                              <Detail label="Meter serial" value={c.meter_serial_number || "—"} />
                              <Detail label="Start date" value={fmt(c.start_date)} />
                              <Detail label="End date" value={fmt(c.end_date)} />
                            </View>

                            <View style={styles.btnRow}>
                              <Pressable
                                testID={`utility-get-quote-${u}`}
                                onPress={() =>
                                  router.push({
                                    pathname: "/quote/new",
                                    params: {
                                      utility_type: u,
                                      contract_id: c.id || c._id || "",
                                      property_id: params.id,
                                      supplier: c.supplier_name || "",
                                    },
                                  })
                                }
                                style={[styles.actBtn, styles.actPrimary]}
                              >
                                <Text style={styles.actPrimaryText}>
                                  {c.renewable_now && days > 90 ? "Lock in new rate" : "Get Quote"}
                                </Text>
                              </Pressable>
                              <Pressable
                                testID={`utility-request-change-${u}`}
                                onPress={() => setRcContract({ ...c, property_id: c.property_id || params.id })}
                                style={[styles.actBtn, styles.actGhost]}
                              >
                                <Icon name="lock" size={15} color={colors.heading} />
                                <Text style={styles.actGhostText}>Request change</Text>
                              </Pressable>
                            </View>
                          </>
                        ) : (
                          <View style={styles.emptyU}>
                            <Text style={styles.emptyUText}>
                              No {meta.label.toLowerCase()} contract on file
                            </Text>
                            <Pressable
                              testID={`utility-add-${u}`}
                              onPress={() => router.push("/scan")}
                              style={styles.scanUBtn}
                            >
                              <Icon name="plus" size={16} color={colors.onBrandPrimary} />
                              <Text style={styles.scanUText}>Scan your {meta.label.toLowerCase()} bill</Text>
                            </Pressable>
                            <Text style={styles.emptyUHint}>Once reviewed, we&apos;ll add it to your account.</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              <Button
                testID="site-scan-bill"
                label="Scan new bill"
                icon="scan-outline"
                onPress={() => router.push("/scan")}
                style={{ marginTop: spacing.md, alignSelf: "stretch" }}
              />
            </>
          )}
        </ScrollView>
      )}

      <RequestChangeModal
        visible={!!rcContract}
        contract={rcContract}
        onClose={() => setRcContract(null)}
      />
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.mini}>{label}</Text>
      <Text style={styles.detailVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  errorCard: { alignItems: "center", gap: spacing.md, padding: spacing.lg },
  errorText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  uIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  uLabel: { flex: 1, fontFamily: font.semibold, fontSize: type.lg, color: colors.heading },
  cardBody: { marginTop: spacing.lg, gap: spacing.md },

  supRow: { flexDirection: "row", justifyContent: "space-between" },
  mini: { fontFamily: font.semibold, fontSize: type.sm, color: colors.muted },
  supVal: { fontFamily: font.bold, fontSize: type.base, color: colors.heading, marginTop: 2 },

  renewBanner: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  renewText: { flex: 1, fontFamily: font.regular, fontSize: type.sm, color: colors.heading, lineHeight: 18 },
  renewStrong: { fontFamily: font.bold },

  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md },
  detail: { width: "50%" },
  detailVal: { fontFamily: font.bold, fontSize: type.base, color: colors.heading, marginTop: 2 },

  btnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  actBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, borderRadius: radius.sm },
  actPrimary: { backgroundColor: colors.brandPrimary },
  actPrimaryText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onBrandPrimary },
  actGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actGhostText: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },

  emptyU: { alignItems: "center", paddingVertical: spacing.sm, gap: spacing.sm },
  emptyUText: { fontFamily: font.regular, fontSize: type.base, color: colors.muted },
  scanUBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  scanUText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onBrandPrimary },
  emptyUHint: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
});
