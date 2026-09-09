import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";

import { Button, Card } from "@/src/components/ui";
import { ScreenHeader, EmptyState } from "@/src/components/screen";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, spacing, type } from "@/src/theme/theme";

type NewsItem = {
  title: string;
  summary: string;
  link: string;
  published?: string;
  source?: string;
  category?: string;
};

export default function News() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<{ news: NewsItem[] }>("/news", { auth: false });
      setItems(Array.isArray(res?.news) ? res.news : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load the news.");
    }
  }, []);

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
    else router.replace("/dashboard");
  };

  return (
    <View style={styles.root}>
      <ScreenHeader testID="news-header" title="Industry news" subtitle="UK energy updates" onBack={goBack} />
      {loading ? (
        <View style={styles.center} testID="news-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <Card testID="news-error" style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={onRefresh} />
            </Card>
          ) : items.length === 0 ? (
            <EmptyState testID="news-empty" icon="newspaper-outline" title="No news right now" message="Check back soon for the latest UK energy updates." />
          ) : (
            items.map((n, i) => (
              <Pressable
                key={i}
                testID={`news-card-${i}`}
                onPress={() => n.link && Linking.openURL(n.link)}
                style={({ pressed }) => [pressed && { opacity: 0.9 }]}
              >
                <Card style={styles.card}>
                  {n.category ? <Text style={styles.cat}>{n.category.toUpperCase()}</Text> : null}
                  <Text style={styles.title} numberOfLines={3}>{n.title}</Text>
                  {n.summary ? <Text style={styles.summary} numberOfLines={3}>{n.summary}</Text> : null}
                  <View style={styles.metaRow}>
                    <Text style={styles.source}>{n.source || "News"}</Text>
                    <View style={styles.readRow}>
                      <Text style={styles.readMore}>Read</Text>
                      <Ionicons name="open-outline" size={14} color={colors.brandPrimary} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  errorCard: { alignItems: "center", gap: spacing.md },
  errorText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },
  card: { gap: spacing.xs },
  cat: { fontFamily: font.bold, fontSize: 10, color: colors.brandPrimary, letterSpacing: 0.5 },
  title: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, lineHeight: 22 },
  summary: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2, lineHeight: 20 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  source: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },
  readRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  readMore: { fontFamily: font.semibold, fontSize: type.base, color: colors.brandPrimary },
});
