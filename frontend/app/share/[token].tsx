import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { Button, Card, StatusPill } from "@/src/components/ui";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

function fmtDate(d?: string) {
  if (!d) return null;
  const v = dayjs(d);
  return v.isValid() ? v.format("D MMM YYYY") : d;
}

export default function ShareView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<any>(`/share/${token}`, { auth: false });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "This share link is invalid or has expired.");
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const c = data?.contract || data?.resource || data?.data || data || {};
  const end = c.end_date || c.contract_end_date || c.renewal_date;
  const rows: { label: string; value: string }[] = [];
  if (c.utility_type) rows.push({ label: "Utility", value: `${c.utility_type}`.replace(/_/g, " ") });
  if (c.property_name || c.site_name) rows.push({ label: "Site", value: c.property_name || c.site_name });
  if (fmtDate(c.start_date)) rows.push({ label: "Starts", value: fmtDate(c.start_date)! });
  if (fmtDate(end)) rows.push({ label: "Ends", value: fmtDate(end)! });
  if (c.annual_cost) rows.push({ label: "Annual cost", value: `£${Number(c.annual_cost).toLocaleString("en-GB")}` });

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <Image source={require("../../assets/images/pricebuddy-logo.webp")} style={styles.logo} contentFit="contain" />
        <Text style={styles.kicker}>Shared with you</Text>

        {loading ? (
          <View style={styles.center} testID="share-loading">
            <ActivityIndicator size="large" color={colors.brandPrimary} />
          </View>
        ) : error ? (
          <Card testID="share-error" style={styles.errorCard}>
            <Ionicons name="link-outline" size={28} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : (
          <Card testID="share-card" style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.utilIcon}>
                <Ionicons name="document-text-outline" size={22} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supplier} numberOfLines={2}>
                  {c.supplier_name || c.supplier || "Contract summary"}
                </Text>
                {c.tariff_name ? <Text style={styles.tariff}>{c.tariff_name}</Text> : null}
              </View>
              {end ? <StatusPill label={`Ends ${dayjs(end).format("MMM YY")}`} color={colors.brandSecondary} /> : null}
            </View>
            {rows.length > 0 && (
              <View style={styles.rows}>
                {rows.map((r, i) => (
                  <View key={i} style={styles.row}>
                    <Text style={styles.rowLabel}>{r.label}</Text>
                    <Text style={styles.rowValue}>{r.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        <View style={styles.cta}>
          <Text style={styles.ctaLead}>Manage your own utility contracts with PriceBuddy.</Text>
          <Button testID="share-create-account" label="Create free account" onPress={() => router.replace("/signup")} />
          <Button testID="share-signin" label="Sign in" variant="secondary" onPress={() => router.replace("/signin")} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md, alignItems: "stretch" },
  logo: { width: 88, height: 72, alignSelf: "center" },
  kicker: {
    fontFamily: font.semibold,
    fontSize: type.sm,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  center: { paddingVertical: spacing["3xl"], alignItems: "center" },
  errorCard: { alignItems: "center", gap: spacing.md },
  errorText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },
  card: { gap: spacing.lg },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  utilIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  supplier: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading },
  tariff: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2 },
  rows: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.lg },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, textTransform: "capitalize" },
  rowValue: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading, textTransform: "capitalize" },
  cta: { marginTop: spacing.xl, gap: spacing.md },
  ctaLead: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },
});
