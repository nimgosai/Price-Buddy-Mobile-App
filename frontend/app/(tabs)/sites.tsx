import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { SiteActionsSheet } from "@/src/components/site-actions-sheet";
import { BusinessSwitcherChip } from "@/src/components/business-switcher-chip";
import { useBusiness } from "@/src/business/business-context";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export default function Sites() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeBizId, bizQuery } = useBusiness();

  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<any[]>(`/properties${bizQuery()}`);
      setSites(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your sites.");
    }
  }, [bizQuery]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load, activeBizId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  const filtered = useMemo(() => {
    const sorted = [...sites].sort((a, b) =>
      (a.property_name || a.address || "").toLowerCase().localeCompare(
        (b.property_name || b.address || "").toLowerCase(),
      ),
    );
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((s) =>
      `${s.property_name || ""} ${s.address || ""} ${s.postcode || ""}`.toLowerCase().includes(q),
    );
  }, [sites, query]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="sites-header"
        title="Your sites"
        subtitle={`${sites.length} ${sites.length === 1 ? "site" : "sites"}`}
        onBack={() => router.push("/dashboard")}
      />
      {loading ? (
        <View style={styles.center} testID="sites-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <BusinessSwitcherChip variant="sites" />
          {error ? (
            <Card testID="sites-error" style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={onRefresh} />
            </Card>
          ) : sites.length === 0 ? (
            <View style={styles.emptyCard} testID="sites-empty">
              <View style={styles.emptyIcon}>
                <Icon name="building" size={28} color={colors.brandPrimary} />
              </View>
              <Text style={styles.emptyTitle}>No sites yet</Text>
              <Text style={styles.emptySub}>
                Add your first site for this business — scan a bill, get a quote, or enter details
                manually.
              </Text>
              <Button
                testID="sites-add-first"
                label="Add your first site"
                icon="add"
                onPress={() => setSheet(true)}
                style={{ marginTop: spacing.lg, alignSelf: "stretch" }}
              />
            </View>
          ) : (
            <>
              {sites.length > 5 && (
                <View style={styles.searchWrap}>
                  <Icon name="search" size={16} color={colors.muted} />
                  <TextInput
                    testID="sites-search"
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search sites by name or postcode"
                    placeholderTextColor={colors.muted}
                    style={styles.searchInput}
                  />
                </View>
              )}

              {filtered.length === 0 ? (
                <Card testID="sites-no-match" style={styles.noMatch}>
                  <Text style={styles.noMatchText}>No sites match “{query}”.</Text>
                </Card>
              ) : (
                filtered.map((s: any) => (
                  <Pressable
                    key={s.id || s._id}
                    testID={`site-card-${s.id || s._id}`}
                    onPress={() =>
                      router.push({
                        pathname: "/sites/[id]",
                        params: {
                          id: s.id || s._id,
                          name: s.property_name || s.name || s.site_name || "Site",
                          address: [s.address, s.postcode].filter(Boolean).join(", "),
                        },
                      })
                    }
                    style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                  >
                    <Card style={styles.card}>
                      <View style={styles.siteIcon}>
                        <Icon name="building" size={20} color={colors.brandPrimary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.name} numberOfLines={2}>
                          {s.property_name || s.address || "Site"}
                        </Text>
                        <Text style={styles.addr} numberOfLines={2}>
                          {[s.address, s.postcode].filter(Boolean).join(", ") || "Address on file"}
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={colors.muted} />
                    </Card>
                  </Pressable>
                ))
              )}

              <Pressable
                testID="sites-add-new"
                onPress={() => setSheet(true)}
                style={({ pressed }) => [styles.addNew, pressed && { opacity: 0.9 }]}
              >
                <Icon name="plus" size={18} color={colors.brandPrimary} />
                <Text style={styles.addNewText}>Add a new site</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}

      <SiteActionsSheet visible={sheet} onClose={() => setSheet(false)} />
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

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing["2xl"],
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, letterSpacing: -0.3 },
  emptySub: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: type.lg, color: colors.onSurface, height: "100%" },

  noMatch: { alignItems: "center", paddingVertical: spacing.lg },
  noMatchText: { fontFamily: font.regular, fontSize: type.base, color: colors.muted },

  card: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  siteIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  addr: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },

  addNew: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  addNewText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brandPrimary },
});
