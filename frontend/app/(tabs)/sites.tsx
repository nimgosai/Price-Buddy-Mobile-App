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
import Ionicons from "@react-native-vector-icons/ionicons";

import { Button, Card } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { SiteActionsSheet } from "@/src/components/site-actions-sheet";
import { BusinessSwitcherChip } from "@/src/components/business-switcher-chip";
import { ALL_BUSINESSES, useBusiness } from "@/src/business/business-context";
import { useTabScrollToTop } from "@/src/utils/use-tab-scroll-to-top";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";
import { SitesDesktop } from "@/src/desktop/sites-desktop";

export default function Sites() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeBizId, bizQuery, businesses } = useBusiness();
  const scrollRef = useTabScrollToTop();
  const isDesktop = useIsDesktop();

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
      `${s.property_name || ""} ${s.address || ""} ${s.postcode || ""} ${s.meter_point_number || ""} ${s.mpan || ""} ${s.mprn || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [sites, query]);

  const isAll = activeBizId === ALL_BUSINESSES;

  // Group sites by parent business (only in "All businesses" mode), preserving business order.
  const groups = useMemo(() => {
    if (!isAll) return [];
    const map = new Map<string, { id: string; name: string; sites: any[] }>();
    const order: string[] = [];
    businesses.forEach((b) => {
      map.set(b.id, { id: b.id, name: b.company_name, sites: [] });
      order.push(b.id);
    });
    filtered.forEach((s) => {
      const bid = s.business_id || "__ungrouped__";
      if (!map.has(bid)) {
        map.set(bid, { id: bid, name: s.business_name || "Other sites", sites: [] });
        order.push(bid);
      }
      map.get(bid)!.sites.push(s);
    });
    return order.map((id) => map.get(id)!).filter((g) => g.sites.length > 0);
  }, [isAll, businesses, filtered]);

  const openSite = useCallback(
    (s: any) =>
      router.push({
        pathname: "/sites/[id]",
        params: {
          id: s.id || s._id,
          name: s.property_name || s.name || s.site_name || "Site",
          address: [s.address, s.postcode].filter(Boolean).join(", "),
        },
      }),
    [router],
  );

  if (isDesktop) {
    return (
      <View style={styles.root}>
        <SitesDesktop
          sites={sites}
          filtered={filtered}
          loading={loading}
          error={error}
          refreshing={refreshing}
          onRefresh={onRefresh}
          query={query}
          setQuery={setQuery}
          showBusiness={isAll && businesses.length > 1}
          bizName={(s) => s.business_name || businesses.find((b) => b.id === s.business_id)?.company_name || "—"}
          openSite={openSite}
          onAdd={() => setSheet(true)}
        />
        <SiteActionsSheet visible={sheet} onClose={() => setSheet(false)} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="sites-header"
        title="Your sites"
        subtitle={`${sites.length} ${sites.length === 1 ? "site" : "sites"}`}
        onBack={() => router.push("/dashboard")}
      />
      {loading && sites.length === 0 ? (
        <View style={styles.center} testID="sites-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
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
              <View style={styles.searchWrap}>
                <Icon name="search" size={16} color={colors.muted} />
                <TextInput
                  testID="sites-search"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search sites or postcodes..."
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <Pressable testID="sites-search-clear" onPress={() => setQuery("")} hitSlop={10} style={styles.searchClear}>
                    <Icon name="close" size={14} color={colors.muted} />
                  </Pressable>
                )}
              </View>

              {filtered.length === 0 ? (
                <View testID="sites-no-match" style={styles.noMatch}>
                  <View style={styles.noMatchIcon}>
                    <Icon name="search" size={24} color={colors.muted} />
                  </View>
                  <Text style={styles.noMatchTitle}>No sites found for “{query.trim()}”</Text>
                  <Text style={styles.noMatchSub}>Check your spelling or add this as a new location.</Text>
                  <Button
                    testID="sites-no-match-add"
                    label="Add this site"
                    icon="add"
                    onPress={() => setSheet(true)}
                    style={{ marginTop: spacing.lg, alignSelf: "stretch" }}
                  />
                </View>
              ) : isAll ? (
                groups.map((g) => (
                  <View key={g.id} testID={`site-group-${g.id}`} style={styles.group}>
                    <View style={styles.groupHead}>
                      <View style={styles.groupIcon}>
                        <Icon name="building" size={15} color={colors.brandPrimary} />
                      </View>
                      <Text style={styles.groupName} numberOfLines={1}>{g.name}</Text>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                          {g.sites.length} {g.sites.length === 1 ? "site" : "sites"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.groupCard}>
                      {g.sites.map((s: any, i: number) => (
                        <Pressable
                          key={s.id || s._id}
                          testID={`site-card-${s.id || s._id}`}
                          onPress={() => openSite(s)}
                          style={({ pressed }) => [styles.groupRow, i > 0 && styles.groupRowDivider, pressed && { opacity: 0.6 }]}
                        >
                          <View style={styles.pinIcon}>
                            <Icon name="mapPin" size={16} color={colors.brandPrimary} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.rowName} numberOfLines={1}>
                              {s.property_name || s.address || "Site"}
                            </Text>
                            <Text style={styles.rowAddr} numberOfLines={1}>
                              {[s.address, s.postcode].filter(Boolean).join(", ") || "Address on file"}
                            </Text>
                          </View>
                          <Icon name="chevronRight" size={18} color={colors.muted} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))
              ) : (
                filtered.map((s: any) => (
                  <Pressable
                    key={s.id || s._id}
                    testID={`site-card-${s.id || s._id}`}
                    onPress={() => openSite(s)}
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
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, minWidth: 0, fontFamily: font.regular, fontSize: type.lg, color: colors.onSurface, height: "100%" },
  searchClear: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },

  noMatch: { alignItems: "center", paddingVertical: spacing["2xl"], paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18 },
  noMatchIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  noMatchTitle: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading, textAlign: "center" },
  noMatchSub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, textAlign: "center", marginTop: spacing.xs, lineHeight: 20 },

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

  group: { marginBottom: 18 },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, paddingHorizontal: 2 },
  groupIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.heading, letterSpacing: -0.2 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  countBadgeText: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  groupRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: spacing.md, paddingVertical: 14 },
  groupRowDivider: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  pinIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: { fontFamily: font.semibold, fontSize: 14, color: colors.heading },
  rowAddr: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },

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
