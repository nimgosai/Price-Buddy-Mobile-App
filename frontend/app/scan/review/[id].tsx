import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, TextField, Card } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const FIELD_DEFS: { keys: string[]; label: string; numeric?: boolean }[] = [
  { keys: ["supplier_name", "supplier"], label: "Supplier" },
  { keys: ["utility_type", "utility"], label: "Utility type" },
  { keys: ["tariff_name", "tariff"], label: "Tariff name" },
  { keys: ["tariff_type"], label: "Tariff type" },
  { keys: ["account_number"], label: "Account number" },
  { keys: ["mpan"], label: "MPAN" },
  { keys: ["mprn"], label: "MPRN" },
  { keys: ["meter_number", "meter_serial"], label: "Meter number" },
  { keys: ["start_date", "contract_start_date"], label: "Start date" },
  { keys: ["end_date", "contract_end_date", "renewal_date"], label: "Contract end date" },
  { keys: ["unit_rate"], label: "Unit rate (p/kWh)", numeric: true },
  { keys: ["standing_charge"], label: "Standing charge (p/day)", numeric: true },
  { keys: ["annual_cost", "annual_spend"], label: "Annual cost (£)", numeric: true },
];

export default function ScanReview() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<any>(`/scans/${id}`);
      const src =
        res?.fields ||
        res?.extracted_fields ||
        res?.detected_fields ||
        res?.parsed_fields ||
        res?.data ||
        res ||
        {};
      const next: Record<string, string> = {};
      FIELD_DEFS.forEach((def) => {
        for (const k of def.keys) {
          const v = src[k];
          if (v !== undefined && v !== null && `${v}` !== "") {
            next[def.keys[0]] = `${v}`;
            break;
          }
        }
      });
      setValues(next);
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

  const shownFields = useMemo(
    () => FIELD_DEFS.filter((d) => values[d.keys[0]] !== undefined),
    [values],
  );

  const confirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiRequest(`/scans/${id}/confirm`, {
        method: "POST",
        body: { fields: values, confirmed_fields: values },
      });
      toast("Thanks — we'll verify your bill within a day.", "success");
      router.replace("/dashboard");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't confirm the details.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/dashboard");
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="review-header"
        title="Check the details"
        subtitle="Confirm what we read from your bill"
        onBack={goBack}
      />
      {loading ? (
        <View style={styles.center} testID="review-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Card testID="review-error" style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Try again" variant="secondary" onPress={load} />
          </Card>
        </View>
      ) : (
        <>
          <KeyboardAwareScrollView
            contentContainerStyle={styles.scroll}
            bottomOffset={90}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.banner} testID="review-banner">
              <Ionicons name="sparkles" size={18} color={colors.brandPrimary} />
              <Text style={styles.bannerText}>
                We&apos;ve pre-filled these from your bill. Fix anything that looks off, then
                confirm.
              </Text>
            </View>

            {shownFields.length === 0 ? (
              <Card testID="review-nofields" style={styles.noFields}>
                <Ionicons name="document-text-outline" size={28} color={colors.muted} />
                <Text style={styles.noFieldsText}>
                  We couldn&apos;t read clear details this time. Confirm to send the bill to our
                  team — we&apos;ll verify it manually.
                </Text>
              </Card>
            ) : (
              <View style={styles.form}>
                {shownFields.map((def) => {
                  const key = def.keys[0];
                  return (
                    <TextField
                      key={key}
                      testID={`review-field-${key}`}
                      label={def.label}
                      value={values[key]}
                      onChangeText={(t) => setValues((p) => ({ ...p, [key]: t }))}
                      keyboardType={def.numeric ? "decimal-pad" : "default"}
                      autoCapitalize="none"
                    />
                  );
                })}
              </View>
            )}
          </KeyboardAwareScrollView>

          <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
              <Button
                testID="review-confirm-button"
                label="Confirm details"
                icon="checkmark-circle-outline"
                onPress={confirm}
                loading={submitting}
              />
            </View>
          </KeyboardStickyView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  errorCard: { alignItems: "center", gap: spacing.md, alignSelf: "stretch" },
  errorText: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
  },
  banner: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  bannerText: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.heading,
    lineHeight: 20,
  },
  form: { gap: spacing.lg },
  noFields: { alignItems: "center", gap: spacing.md },
  noFieldsText: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
