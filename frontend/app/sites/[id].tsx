import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { Button, Card, StatusPill } from "@/src/components/ui";
import { ScreenHeader, EmptyState } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = dayjs(dateStr);
  if (!d.isValid()) return null;
  return d.startOf("day").diff(dayjs().startOf("day"), "day");
}
function urgencyForDays(days: number | null): string {
  if (days === null) return "normal";
  if (days < 0 || days <= 14) return "critical";
  if (days <= 30) return "high";
  if (days <= 60) return "medium";
  if (days <= 90) return "renewable";
  return "low";
}

export default function SiteDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string; name?: string; address?: string }>();

  const [contracts, setContracts] = useState<any[]>([]);
  const [meterReads, setMeterReads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [changeFor, setChangeFor] = useState<any | null>(null);
  const [changeText, setChangeText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<any>(`/properties/${params.id}/utilities`);
      const c = res?.contracts || res?.utilities || (Array.isArray(res) ? res : []) || [];
      const m = res?.meter_reads || res?.meters || res?.reads || [];
      setContracts(Array.isArray(c) ? c : []);
      setMeterReads(Array.isArray(m) ? m : []);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/sites");
  };

  const sendChange = async () => {
    if (!changeText.trim() || sending) return;
    setSending(true);
    try {
      await apiRequest("/change-requests", {
        method: "POST",
        body: {
          message: changeText.trim(),
          request_type: "update_contract",
          contract_id: changeFor?.id || changeFor?._id || null,
          property_id: params.id,
        },
      });
      toast("Sent to your account manager.", "success");
      setChangeFor(null);
      setChangeText("");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't send your request.", "error");
    } finally {
      setSending(false);
    }
  };

  const readsForContract = (c: any) => {
    const cid = c.id || c._id;
    return meterReads.filter((r) => (r.contract_id || r.contractId) === cid);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="site-detail-header"
        title={params.name || "Site"}
        subtitle={params.address || undefined}
        onBack={goBack}
      />
      {loading ? (
        <View style={styles.center} testID="site-detail-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <Card testID="site-detail-error" style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={onRefresh} />
            </Card>
          ) : contracts.length === 0 ? (
            <EmptyState
              testID="site-detail-empty"
              icon="document-text-outline"
              title="No contracts on this site"
              message="Scan a bill for this location and we'll add its contracts and meter readings here."
            >
              <Button label="Scan a bill" icon="scan-outline" onPress={() => router.push("/scan")} />
            </EmptyState>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Contracts</Text>
              {contracts.map((c: any, i: number) => {
                const end = c.end_date || c.contract_end_date || c.renewal_date;
                const days = daysUntil(end);
                const urg = c.urgency || urgencyForDays(days);
                const color = colors.urgency[urg] || colors.urgency.normal;
                const reads = readsForContract(c);
                const supplier = c.supplier_name || c.supplier || "Contract";
                return (
                  <Card key={c.id || c._id || i} testID={`site-contract-${i}`} style={styles.card}>
                    <View style={styles.cTop}>
                      <View style={[styles.utilIcon, { backgroundColor: `${color}1A` }]}>
                        <Ionicons name="flash" size={18} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.supplier} numberOfLines={1}>{supplier}</Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          {(c.utility_type || "utility").toString().replace(/_/g, " ")}
                          {c.tariff_name ? ` • ${c.tariff_name}` : ""}
                        </Text>
                      </View>
                      <StatusPill
                        label={days === null ? "Active" : days < 0 ? "Expired" : `${days}d left`}
                        color={color}
                      />
                    </View>

                    <View style={styles.rowsBox}>
                      {end ? (
                        <Row label="Renews" value={dayjs(end).format("D MMM YYYY")} />
                      ) : null}
                      {c.annual_cost ? (
                        <Row label="Annual cost" value={`£${Number(c.annual_cost).toLocaleString("en-GB")}`} />
                      ) : null}
                      {c.unit_rate ? <Row label="Unit rate" value={`${c.unit_rate} p/kWh`} /> : null}
                      {c.standing_charge ? (
                        <Row label="Standing charge" value={`${c.standing_charge} p/day`} />
                      ) : null}
                    </View>

                    {reads.length > 0 && (
                      <View style={styles.reads}>
                        <Text style={styles.readsTitle}>Meter readings</Text>
                        {reads.slice(0, 3).map((r: any, ri: number) => (
                          <View key={ri} style={styles.readRow}>
                            <Text style={styles.readDate}>
                              {dayjs(r.read_date || r.date || r.created_at).format("D MMM YYYY")}
                            </Text>
                            <Text style={styles.readVal}>
                              {r.value ?? r.reading ?? r.units ?? "—"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.actions}>
                      <Pressable
                        testID={`site-quote-${i}`}
                        onPress={() =>
                          router.push({
                            pathname: "/quote/new",
                            params: {
                              utility_type: c.utility_type || "electricity",
                              contract_id: c.id || c._id || "",
                              property_id: params.id,
                              supplier,
                            },
                          })
                        }
                        style={styles.actionBtn}
                      >
                        <Ionicons name="pricetag-outline" size={16} color={colors.onBrandPrimary} />
                        <Text style={styles.actionText}>Get a quote</Text>
                      </Pressable>
                      <Pressable
                        testID={`site-change-${i}`}
                        onPress={() => {
                          setChangeFor(c);
                          setChangeText("");
                        }}
                        style={[styles.actionBtn, styles.actionGhost]}
                      >
                        <Ionicons name="create-outline" size={16} color={colors.heading} />
                        <Text style={[styles.actionText, styles.actionGhostText]}>Request a change</Text>
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* Request a change modal */}
      <Modal
        visible={!!changeFor}
        transparent
        animationType="fade"
        onRequestClose={() => setChangeFor(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet} testID="change-request-sheet">
            <Text style={styles.sheetTitle}>Request a change</Text>
            <Text style={styles.sheetSub}>
              {changeFor?.supplier_name || changeFor?.supplier || "This contract"} — tell us what
              needs updating and we&apos;ll take care of it.
            </Text>
            <TextInput
              testID="change-request-input"
              value={changeText}
              onChangeText={setChangeText}
              placeholder="e.g. update the contact name, correct the end date…"
              placeholderTextColor={colors.muted}
              multiline
              style={styles.sheetInput}
            />
            <View style={styles.sheetActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setChangeFor(null)} style={{ flex: 1 }} />
              <Button
                testID="change-request-send"
                label="Send"
                onPress={sendChange}
                loading={sending}
                disabled={!changeText.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  errorCard: { alignItems: "center", gap: spacing.md },
  errorText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },
  sectionTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: spacing.sm },

  card: { gap: spacing.md },
  cTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  utilIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  supplier: { fontFamily: font.semibold, fontSize: type.lg, color: colors.heading },
  meta: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2, textTransform: "capitalize" },

  rowsBox: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm, padding: spacing.md, gap: spacing.sm },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontFamily: font.regular, fontSize: type.base, color: colors.muted },
  infoValue: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },

  reads: { gap: spacing.xs },
  readsTitle: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  readRow: { flexDirection: "row", justifyContent: "space-between" },
  readDate: { fontFamily: font.regular, fontSize: type.base, color: colors.onSurfaceSecondary },
  readVal: { fontFamily: font.medium, fontSize: type.base, color: colors.heading },

  actions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandPrimary,
  },
  actionGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onBrandPrimary },
  actionGhostText: { color: colors.heading },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(31,42,68,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  sheetTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading },
  sheetSub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, lineHeight: 20 },
  sheetInput: {
    minHeight: 100,
    textAlignVertical: "top",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
  },
  sheetActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
});
