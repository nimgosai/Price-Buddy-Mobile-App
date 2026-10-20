import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import dayjs from "dayjs";

import { Button } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { RequestChangeModal } from "@/src/components/request-change-modal";
import { AppTabBar } from "@/src/components/app-tab-bar";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";
import { SiteDetailDesktop } from "@/src/desktop/site-detail-desktop";

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
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string; address?: string }>();
  const isDesktop = useIsDesktop();

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

  // Prefer the values passed from the list so the header shows the correct
  // name/address immediately and never swaps when the fetch resolves.
  const title = params.name || property?.property_name || property?.address || "Site";
  const subtitle =
    params.address ||
    (property?.address ? `${property.address}${property.postcode ? `, ${property.postcode}` : ""}` : undefined);

  // Which utilities to show: those with a contract, else all
  const present = UTIL_ORDER.filter((u) => utilities[u]);
  const shown = present.length > 0 ? present : UTIL_ORDER;

  if (isDesktop) {
    return (
      <View style={styles.root}>
        <SiteDetailDesktop
          siteId={String(params.id)}
          title={title}
          subtitle={subtitle}
          property={property}
          utilities={utilities}
          order={UTIL_ORDER}
          loading={loading}
          error={error}
          reload={load}
          onBack={() => router.navigate("/sites")}
          onRequestChange={(c) => setRcContract({ ...c, property_id: c.property_id || params.id })}
        />
        <RequestChangeModal visible={!!rcContract} contract={rcContract} onClose={() => setRcContract(null)} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader testID="site-detail-header" title={title} subtitle={subtitle} onBack={goBack} />
      {loading ? (
        <View style={styles.center} testID="site-detail-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 24 }]}
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
                      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.uLabel}>{meta.label}</Text>
                        {property?.business_name ? (
                          <View style={[styles.bizPill, { backgroundColor: `${meta.color}1A` }]}>
                            <Text style={[styles.bizPillText, { color: meta.color }]} numberOfLines={1}>{property.business_name}</Text>
                          </View>
                        ) : null}
                      </View>
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
                            <View style={styles.supBanner}>
                              <Text style={styles.supBannerText}>
                                {c.supplier_name || "Supplier TBC"} · {meta.label}
                              </Text>
                              <View style={[styles.endsBadge, days < 60 ? styles.endsBadgeUrgent : styles.endsBadgeOk]}>
                                <Text style={[styles.endsBadgeText, { color: days < 60 ? "#991B1B" : "#065F46" }]}>
                                  {days < 0 ? `Ended ${Math.abs(days)} days ago` : `Ends in ${days} days`}
                                </Text>
                              </View>
                            </View>

                            <ExpiryGauge days={days ?? 0} />

                            <TariffPanel contract={c} utility={u} meta={meta} />

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

                            <View style={styles.tariff} testID={`meter-details-${u}`}>
                              <Text style={styles.tariffTitle}>Meter details</Text>
                              <View style={styles.grid}>
                                <View style={[styles.detail, { width: "100%" }]}>
                                  <Text style={styles.mini}>{u === "gas" ? "MPRN" : u === "electricity" ? "MPAN" : "ACCOUNT"}</Text>
                                  <Text style={styles.detailVal}>{c.meter_point_number || c.account_number || "—"}</Text>
                                </View>
                                <Detail label="METER SERIAL" value={c.meter_serial_number || "—"} />
                                <Detail label="START DATE" value={fmt(c.start_date)} />
                                <Detail label="CONTRACT END DATE" value={fmt(c.end_date)} />
                              </View>
                            </View>

                            <View style={styles.btnRow}>
                              <Pressable
                                testID={`utility-get-quote-${u}`}
                                onPress={() =>
                                  router.push({
                                    pathname: "/quote/new",
                                    params: {
                                      propertyId: String(params.id),
                                      utility: u,
                                      contractId: c.id || c._id || "",
                                      incumbent: c.supplier_name || "",
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
                                <Text style={styles.actGhostText}>Request Callback</Text>
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
      <AppTabBar active="sites" />
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

// ——— 12-segment expiry gauge with urgent pill (mirrors the original web app) ———
const GAUGE_SEGMENTS = 12;
function gaugeTier(days: number) {
  if (days <= 0) return { color: "#991B1B", label: "Out of contract" };
  if (days <= 30) return { color: "#DC2626", label: "Renew now" };
  if (days <= 60) return { color: "#EA580C", label: "Action soon" };
  if (days <= 90) return { color: "#D97706", label: "Plan ahead" };
  if (days <= 180) return { color: "#7C3AED", label: "Tracking" };
  return { color: "#059669", label: "Locked in" };
}

function ExpiryGauge({ days }: { days: number }) {
  const tier = gaugeTier(days);
  const filled = days <= 0 ? 0 : Math.max(1, Math.min(GAUGE_SEGMENTS, Math.floor((days / 365) * GAUGE_SEGMENTS) + 1));
  const urgent = days <= 30;
  return (
    <View>
      {urgent && (
        <View style={styles.urgentPill} testID="expiry-urgent-pill">
          <View style={styles.urgentDot} />
          <Text style={styles.urgentPillText}>
            {tier.label.toUpperCase()} · {days < 0 ? `${Math.abs(days)} DAYS OVERDUE` : `${days} DAYS LEFT`}
          </Text>
        </View>
      )}
      <View style={styles.gauge} testID="expiry-gauge">
        {Array.from({ length: GAUGE_SEGMENTS }).map((_, i) => (
          <View key={i} style={[styles.gaugeSeg, { backgroundColor: i < filled ? tier.color : colors.border }]} />
        ))}
      </View>
    </View>
  );
}

// ——— "Your tariff & rates" panel (mirrors the original web app) ———
function TariffPanel({ contract: c, utility, meta }: { contract: any; utility: string; meta: UMeta }) {
  const dayRate = c.unit_rate_day;
  const night = c.unit_rate_night;
  const eveWknd = c.unit_rate_eve_weekend;
  const standing = c.standing_charge;
  const kva = c.kva_charge;
  const capacity = c.availability_capacity;
  const usage = c.annual_usage;
  const unit = c.usage_unit || "kWh";
  const tariffName = c.tariff_name;
  const tariffType = c.tariff_type;
  const isElec = utility === "electricity";
  const hasRates = dayRate != null || standing != null || usage != null || night != null || eveWknd != null || kva != null || capacity != null;
  if (!hasRates && !tariffName) return null;

  let est: number | null = null;
  if (dayRate != null && usage != null) {
    est = (Number(dayRate) * Number(usage)) / 100 + (standing != null ? (365 * Number(standing)) / 100 : 0) + (kva != null ? (365 * Number(kva)) / 100 : 0);
  }
  const fixed = (tariffType || "").toLowerCase() === "fixed";

  return (
    <View style={styles.tariff} testID={`tariff-panel-${utility}`}>
      <View style={styles.tariffHead}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View style={[styles.tariffIcon, { backgroundColor: `${meta.color}1F` }]}>
            <Icon name="document" size={15} color={meta.color} />
          </View>
          <Text style={styles.tariffTitle}>Rates &amp; estimated cost</Text>
        </View>
        {tariffType ? (
          <View style={[styles.tariffBadge, { backgroundColor: fixed ? "#D1FAE5" : "#FEF3C7" }]}>
            <Text style={[styles.tariffBadgeText, { color: fixed ? "#059669" : "#B45309" }]}>{String(tariffType).toUpperCase()}</Text>
          </View>
        ) : null}
      </View>
      {tariffName ? <Text style={styles.tariffName}>{tariffName}</Text> : null}
      <View style={styles.tariffGrid}>
        <TariffCell label={isElec ? "DAY RATE" : "UNIT RATE"} value={dayRate != null ? `${Number(dayRate).toFixed(2)}p / ${unit}` : "—"} />
        <TariffCell label="STANDING CHARGE" value={standing != null ? `${Number(standing).toFixed(2)}p / day` : "—"} />
        {isElec && night != null ? <TariffCell label="NIGHT RATE" value={`${Number(night).toFixed(2)}p / ${unit}`} /> : null}
        {isElec && eveWknd != null ? <TariffCell label="EVE / WKND RATE" value={`${Number(eveWknd).toFixed(2)}p / ${unit}`} /> : null}
        {isElec && kva != null ? <TariffCell label="KVA CHARGE" value={`${Number(kva).toFixed(2)}p / day`} /> : null}
        {isElec && capacity != null ? <TariffCell label="AVAILABILITY CAPACITY" value={`${Number(capacity).toLocaleString()} kVA`} /> : null}
        <TariffCell label="ANNUAL USAGE" value={usage != null ? `${Number(usage).toLocaleString()} ${unit}` : "—"} />
        <TariffCell label="EST. ANNUAL COST" value={est != null ? `£${est.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} highlight />
      </View>
      {!hasRates && (
        <Text style={styles.tariffEmpty}>Your rates haven&apos;t been logged yet — they&apos;ll appear here once confirmed.</Text>
      )}
    </View>
  );
}

function TariffCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.mini}>{label}</Text>
      <Text style={[styles.detailVal, highlight && { color: colors.brandPrimary }]}>{value}</Text>
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
  uLabel: { fontFamily: font.semibold, fontSize: type.lg, color: colors.heading },
  bizPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, flexShrink: 1 },
  bizPillText: { fontFamily: font.bold, fontSize: type.kicker },
  cardBody: { marginTop: spacing.lg, gap: spacing.md },

  urgentPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 12,
    backgroundColor: "#FECACA",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: radius.pill,
  },
  urgentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626" },
  urgentPillText: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.5, color: "#991B1B" },
  gauge: { flexDirection: "row", gap: 4 },
  gaugeSeg: { flex: 1, height: 6, borderRadius: 3 },

  tariff: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.divider, borderRadius: 18, padding: spacing.lg, gap: 10 },
  tariffHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  tariffIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tariffTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  tariffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  tariffBadgeText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.5 },
  tariffName: { fontFamily: font.semibold, fontSize: type.sm, color: colors.heading },
  tariffGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md },
  tariffEmpty: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },

  supBanner: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "space-between" },
  supBannerText: { flex: 1, fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  endsBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, flexShrink: 0 },
  endsBadgeUrgent: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  endsBadgeOk: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  endsBadgeText: { fontFamily: font.semibold, fontSize: 12 },
  mini: { fontFamily: font.semibold, fontSize: type.sm, color: colors.muted },

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
  actBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: radius.sm },
  actPrimary: { backgroundColor: "#065F46" },
  actPrimaryText: { fontFamily: font.bold, fontSize: type.base, color: "#FFFFFF" },
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
