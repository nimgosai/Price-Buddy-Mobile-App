import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const UTILS = ["electricity", "gas", "water", "telecoms", "broadband"];
const ULABEL: Record<string, string> = {
  electricity: "Electricity", gas: "Gas", water: "Water", telecoms: "Telecoms", broadband: "Broadband",
};

const INTENTS = [
  { key: "track", icon: "📊", title: "Just track this contract", body: "Keep tabs on it and alert me 90 days before renewal." },
  { key: "quote", icon: "🔥", title: "Get me a better quote now", body: "Compare the market and have someone call me with options." },
  { key: "both", icon: "✨", title: "Both — track AND compare the market", body: "Monitor for renewal AND source competing quotes." },
];

function pick(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && `${v}` !== "") return `${v}`;
  }
  return "";
}

export default function ScanReview() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [scan, setScan] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [f, setF] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const [action, setAction] = useState("new_business");
  const [intent, setIntent] = useState("both");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formErr, setFormErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, props] = await Promise.all([
        apiRequest<any>(`/scans/${id}`),
        apiRequest<any[]>("/properties").catch(() => []),
      ]);
      const src = s?.extracted_fields || s?.fields || s?.parsed || s || {};
      const next: Record<string, string> = {
        utility_type: pick(src, ["utility_type", "utility"]) || "electricity",
        supplier_name: pick(src, ["supplier_name", "supplier"]),
        supply_address: pick(src, ["supply_address", "address"]),
        postcode: pick(src, ["postcode"]),
        mpan_or_mprn: pick(src, ["mpan_or_mprn", "mpan", "mprn"]),
        meter_serial_number: pick(src, ["meter_serial_number", "meter_serial"]),
        contract_start_date: pick(src, ["contract_start_date", "start_date"]),
        contract_end_date: pick(src, ["contract_end_date", "end_date"]),
        annual_usage_kwh: pick(src, ["annual_usage_kwh", "annual_usage"]),
        legal_entity_name: pick(src, ["legal_entity_name", "business_name"]),
        property_name: pick(src, ["property_name"]),
      };
      const pf = new Set<string>();
      Object.keys(next).forEach((k) => next[k] && pf.add(k));
      const list = Array.isArray(props) ? props : [];
      setScan(s);
      setProperties(list);
      setF(next);
      setPrefilled(pf);
      setAction(list.length > 0 ? "new_site_existing_business" : "new_business");
      if (list.length > 0 && !next.property_name) set("property_id" as any, list[0].id || list[0]._id);
      setF((p) => ({ ...p, property_id: list[0]?.id || list[0]?._id || "" }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this scan.");
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const matchType = scan?.match_result?.match_type;
  const isMatch = matchType === "mpan";
  const pagesUploaded = Number(scan?.pages_uploaded || 0);
  const matchedProp = useMemo(
    () => properties.find((x) => (x.id || x._id) === scan?.match_result?.property_id),
    [properties, scan],
  );

  const confirm = async () => {
    if (submitting) return;
    setFormErr("");
    if (!f.supplier_name?.trim()) {
      setFormErr("Supplier is required");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        action: isMatch ? "update_existing" : action,
        intent,
        property_id: action === "new_site_existing_business" ? f.property_id || null : null,
        legal_entity_name: f.legal_entity_name || null,
        supplier_name: f.supplier_name || null,
        supply_address: f.supply_address || null,
        postcode: f.postcode || null,
        mpan_or_mprn: f.mpan_or_mprn || null,
        meter_serial_number: f.meter_serial_number || null,
        account_number: f.account_number || null,
        contract_start_date: f.contract_start_date || null,
        contract_end_date: f.contract_end_date || null,
        utility_type: f.utility_type || null,
        annual_usage_kwh: f.annual_usage_kwh ? Number(f.annual_usage_kwh) : null,
        property_name: f.property_name || null,
      };
      const res = await apiRequest<any>(`/scans/${id}/confirm`, { method: "POST", body });
      router.replace({
        pathname: "/scan/success/[id]",
        params: {
          id: String(id),
          property_id: res?.property_id || "",
          status: res?.status || "",
          contract_end_date: f.contract_end_date || "",
          supplier_name: f.supplier_name || "",
          utility_type: f.utility_type || "",
        },
      });
    } catch (e) {
      setFormErr(e instanceof ApiError ? e.message : "Could not save this scan");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => router.replace("/scan");

  const Field = ({ label, k, placeholder, upper, numeric }: { label: string; k: string; placeholder?: string; upper?: boolean; numeric?: boolean }) => {
    const hi = prefilled.has(k);
    return (
      <View style={{ gap: spacing.xs }}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {hi && (
            <View style={styles.prefillTag}>
              <Icon name="check" size={9} color={colors.pastel.mintIcon} />
              <Text style={styles.prefillText}>from bill</Text>
            </View>
          )}
        </View>
        <TextInput
          testID={`review-${k}`}
          value={f[k] || ""}
          onChangeText={(t) => set(k, upper ? t.toUpperCase() : t)}
          placeholder={hi ? "" : placeholder || "Not detected"}
          placeholderTextColor={colors.muted}
          keyboardType={numeric ? "decimal-pad" : "default"}
          autoCapitalize={upper ? "characters" : "sentences"}
          style={[styles.input, hi && styles.inputPrefilled]}
        />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ScreenHeader testID="scan-review-header" title="Review scan" subtitle="We extracted everything — just confirm." onBack={goBack} />
      {loading ? (
        <View style={styles.center} testID="review-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="document" size={28} color={colors.error} />
          <Text style={styles.errText}>{error}</Text>
          <Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <>
          <KeyboardAwareScrollView contentContainerStyle={styles.scroll} bottomOffset={90} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {pagesUploaded > 1 && (
              <View style={styles.pagesBadge} testID="scan-pages-badge">
                <Icon name="document" size={12} color={colors.heading} />
                <Text style={styles.pagesText}>EXTRACTED FROM {pagesUploaded} PAGES</Text>
              </View>
            )}

            {isMatch ? (
              <View style={[styles.matchCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]} testID="match-banner-mpan">
                <Icon name="bolt" size={20} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.matchTitle, { color: "#065F46" }]}>Match found for {matchedProp?.property_name || matchedProp?.address || "your site"}</Text>
                  <Text style={styles.matchSub}>We&apos;ll update this contract with the latest usage data.</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.matchCard, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]} testID="match-banner-new">
                <Icon name="document" size={20} color={colors.heading} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchTitle}>{properties.length === 0 ? "First scan — we'll set up your business" : "Where should we file this?"}</Text>
                  <Text style={styles.matchSub}>{properties.length === 0 ? "We've auto-filled your business details below." : "Pick an existing site or create a new business below."}</Text>
                </View>
              </View>
            )}

            {!isMatch && properties.length > 0 && (
              <View style={styles.chipRow} testID="action-picker">
                <Pressable testID="action-existing-business" onPress={() => setAction("new_site_existing_business")} style={[styles.chip, action === "new_site_existing_business" && styles.chipActive]}>
                  <Text style={[styles.chipText, action === "new_site_existing_business" && styles.chipTextActive]}>Existing business</Text>
                </Pressable>
                <Pressable testID="action-new-business" onPress={() => setAction("new_business")} style={[styles.chip, action === "new_business" && styles.chipActive]}>
                  <Text style={[styles.chipText, action === "new_business" && styles.chipTextActive]}>New business</Text>
                </Pressable>
              </View>
            )}

            {!isMatch && action === "new_site_existing_business" && properties.length > 0 && (
              <View style={{ gap: spacing.xs }}>
                <Text style={styles.label}>Site</Text>
                <View style={styles.chipRow}>
                  {properties.map((p) => {
                    const pid = p.id || p._id;
                    const on = f.property_id === pid;
                    return (
                      <Pressable key={pid} testID={`review-property-${pid}`} onPress={() => set("property_id", pid)} style={[styles.chip, on && styles.chipActive]}>
                        <Text style={[styles.chipText, on && styles.chipTextActive]}>{p.property_name || p.address}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {!isMatch && action === "new_business" && <Field label="Business name" k="legal_entity_name" />}

            <View style={{ gap: spacing.xs }}>
              <Text style={styles.label}>Utility</Text>
              <View style={styles.chipRow}>
                {UTILS.map((u) => {
                  const on = f.utility_type === u;
                  return (
                    <Pressable key={u} testID={`review-util-${u}`} onPress={() => set("utility_type", u)} style={[styles.chip, on && styles.chipActive]}>
                      <Text style={[styles.chipText, on && styles.chipTextActive]}>{ULABEL[u]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Field label="Supplier" k="supplier_name" placeholder="Not detected — please add" />
            {!isMatch && (
              <>
                <Field label="Supply address" k="supply_address" />
                <Field label="Postcode" k="postcode" upper />
              </>
            )}
            <View style={styles.grid2}>
              <View style={styles.gridCell}><Field label={f.utility_type === "gas" ? "MPRN" : "MPAN"} k="mpan_or_mprn" /></View>
              <View style={styles.gridCell}><Field label="Meter serial" k="meter_serial_number" /></View>
            </View>
            <View style={styles.grid2}>
              <View style={styles.gridCell}><Field label="Start date" k="contract_start_date" placeholder="YYYY-MM-DD" /></View>
              <View style={styles.gridCell}><Field label="End date" k="contract_end_date" placeholder="YYYY-MM-DD" /></View>
            </View>

            {!!formErr && <Text testID="review-error" style={styles.formErr}>{formErr}</Text>}

            <View style={styles.intentCard} testID="scan-intent-picker">
              <Text style={styles.intentTitle}>What should we do next?</Text>
              <Text style={styles.intentSub}>Pick one — you can change your mind anytime by replying to our audit team.</Text>
              {INTENTS.map((it) => {
                const on = intent === it.key;
                return (
                  <Pressable key={it.key} testID={`scan-intent-${it.key}`} onPress={() => setIntent(it.key)} style={[styles.intentOpt, on && styles.intentOptActive]}>
                    <Text style={styles.intentEmoji}>{it.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.intentOptTitle, on && { color: colors.heading }]}>{it.title}</Text>
                      <Text style={styles.intentOptBody}>{it.body}</Text>
                    </View>
                    <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable testID="review-cancel" onPress={() => router.replace("/scan")} style={styles.cancelLink}>
              <Text style={styles.cancelText}>Cancel and re-scan</Text>
            </Pressable>
          </KeyboardAwareScrollView>

          <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
              <Pressable testID="review-submit" onPress={confirm} disabled={submitting} style={[styles.submit, submitting && { opacity: 0.6 }]}>
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Confirm &amp; save</Text>}
              </Pressable>
            </View>
          </KeyboardStickyView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  errText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },
  retry: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  retryText: { fontFamily: font.semibold, color: colors.heading },
  scroll: { padding: spacing.lg, gap: spacing.md },

  pagesBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  pagesText: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.3, color: colors.heading },

  matchCard: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  matchTitle: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  matchSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  chipText: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },
  chipTextActive: { fontFamily: font.semibold, color: colors.brandPrimary },

  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },
  prefillTag: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#ECFDF5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill },
  prefillText: { fontFamily: font.semibold, fontSize: 9, color: colors.pastel.mintIcon },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontFamily: font.regular, fontSize: type.base, color: colors.onSurface, backgroundColor: colors.surface },
  inputPrefilled: { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" },

  grid2: { flexDirection: "row", gap: spacing.sm },
  gridCell: { flex: 1 },

  formErr: { fontFamily: font.medium, fontSize: type.sm, color: colors.error },

  intentCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  intentTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  intentSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginBottom: spacing.xs },
  intentOpt: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  intentOptActive: { borderWidth: 2, borderColor: colors.heading, backgroundColor: "#F5F3FF" },
  intentEmoji: { fontSize: 22, marginTop: 2 },
  intentOptTitle: { fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurfaceSecondary },
  intentOptBody: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#D1D5DB", marginTop: 4, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.heading, backgroundColor: colors.heading },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFFFFF" },

  cancelLink: { alignItems: "center", paddingVertical: spacing.sm },
  cancelText: { fontFamily: font.medium, fontSize: type.sm, color: colors.muted, textDecorationLine: "underline" },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  submit: { height: 52, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  submitText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
});
