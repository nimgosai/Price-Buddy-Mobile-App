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
import { Ionicons } from "@expo/vector-icons";

import { Button, Card } from "@/src/components/ui";
import { ScreenHeader, EmptyState } from "@/src/components/screen";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";

export default function Sites() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<any[]>("/properties");
      setSites(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your sites.");
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

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="sites-header"
        title="Your sites"
        subtitle="Business locations we track for you"
      />
      {loading ? (
        <View style={styles.center} testID="sites-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <Card testID="sites-error" style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={onRefresh} />
            </Card>
          ) : sites.length === 0 ? (
            <EmptyState
              testID="sites-empty"
              icon="business-outline"
              title="No sites yet"
              message="Add your first business location and we'll help you track its utility contracts and renewals."
            >
              <Button
                testID="sites-empty-add"
                label="Add a site"
                icon="add"
                onPress={() => router.push("/sites/new")}
              />
            </EmptyState>
          ) : (
            sites.map((s: any, i: number) => (
              <Card key={s.id || s._id || i} testID={`site-card-${i}`} style={styles.card}>
                <View style={styles.siteIcon}>
                  <Ionicons name="location" size={20} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {s.name || s.site_name || "Site"}
                  </Text>
                  <Text style={styles.addr} numberOfLines={2}>
                    {[s.address, s.postcode].filter(Boolean).join(", ") || "Address on file"}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      {/* Floating add button */}
      <Pressable
        testID="sites-add-fab"
        onPress={() => router.push("/sites/new")}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing.md },
          pressed && { backgroundColor: colors.brandPrimaryPressed },
        ]}
      >
        <Ionicons name="add" size={22} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Add site</Text>
      </Pressable>
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
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  siteIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: font.semibold, fontSize: type.lg, color: colors.heading },
  addr: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  fabText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onBrandPrimary },
});
