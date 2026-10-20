import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import dayjs from "dayjs";

import { Icon } from "@/src/components/icon";
import { ScreenHeader, EmptyState } from "@/src/components/screen";
import { Button } from "@/src/components/ui";
import { apiRequest, ApiError } from "@/src/api/client";
import { DialogButton } from "@/src/desktop/overlays";
import { downloadCsv, today, useSort } from "@/src/desktop/table-tools";
import { Cell, DesktopPage, EmptyPanel, HeaderButton, Metric, Panel, TRow, Table, ds } from "@/src/desktop/ui";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";

const SERVICE_LABEL: Record<string, string> = {
  electric: "Electricity", electricity: "Electricity", gas: "Gas", water: "Water", telecoms: "Telecoms", broadband: "Broadband",
};
const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  pending: { label: "Pending review", fg: "#92400E", bg: "#FEF3C7" },
  in_review: { label: "In progress", fg: "#1D4ED8", bg: "#DBEAFE" },
  in_progress: { label: "In progress", fg: "#1D4ED8", bg: "#DBEAFE" },
  quoted: { label: "Quote ready", fg: "#047857", bg: "#D1FAE5" },
  sent: { label: "Quote ready", fg: "#047857", bg: "#D1FAE5" },
  accepted: { label: "Accepted", fg: "#047857", bg: "#D1FAE5" },
  declined: { label: "Declined", fg: "#475569", bg: "#F1F5F9" },
  cancelled: { label: "Cancelled", fg: "#475569", bg: "#F1F5F9" },
};
const statusOf = (s?: string) =>
  STATUS[(s || "pending").toLowerCase()] || { label: (s || "Pending").replace(/_/g, " "), fg: "#475569", bg: "#F1F5F9" };
const servicesOf = (q: any) => (q.selected_services || []).map((s: string) => SERVICE_LABEL[s] || s).join(", ") || "—";
const siteOf = (q: any) => q.address?.business_name || q.address?.full_address || "—";
const fmt = (d?: string) => (d && dayjs(d).isValid() ? dayjs(d).format("D MMM YYYY") : "—");

function StatusPill({ status }: { status?: string }) {
  const s = statusOf(status);
  return <View style={[st.pill, { backgroundColor: s.bg }]}><Text style={[st.pillText, { color: s.fg }]}>{s.label}</Text></View>;
}

export default function MyQuotes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<any[]>("/quotes");
      const list = Array.isArray(res) ? res : [];
      list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      setQuotes(list);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your quote requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const { sorted, sort, onSort } = useSort(quotes, {
    d: (q) => q.created_at,
    site: siteOf,
    pc: (q) => q.address?.postcode,
    sv: servicesOf,
    st: (q) => statusOf(q.status).label,
  }, { key: "d", dir: "desc" });

  const newQuote = () => router.push("/quote/new");

  if (isDesktop) {
    const open = quotes.filter((q) => ["pending", "in_review", "in_progress"].includes((q.status || "pending").toLowerCase())).length;
    return (
      <DesktopPage
        testID="quotes-desktop"
        title="My quote requests"
        subtitle="Every quote you've requested and where it's up to."
        refreshing={refreshing}
        onRefresh={onRefresh}
        actions={
          <>
            {quotes.length > 0 ? (
              <HeaderButton testID="quotes-export" label="Export CSV" icon="document" onPress={() =>
                downloadCsv(`quote-requests-${today()}.csv`, ["Requested", "Business / site", "Postcode", "Services", "Status"],
                  sorted.map((q) => [fmt(q.created_at), siteOf(q), q.address?.postcode || "", servicesOf(q), statusOf(q.status).label]))} />
            ) : null}
            <HeaderButton testID="quotes-new" label="New quote" icon="plus" primary onPress={newQuote} />
          </>
        }
      >
        {loading ? (
          <View style={st.center}><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
        ) : error ? (
          <EmptyPanel testID="quotes-error" icon="warning" title="Couldn't load quotes" sub={error} action={<DialogButton label="Try again" variant="ghost" onPress={onRefresh} />} />
        ) : quotes.length === 0 ? (
          <EmptyPanel testID="quotes-empty" icon="document" title="No quote requests yet" sub="Request a quote and you'll be able to track its progress here." action={<DialogButton label="Get a quote" onPress={newQuote} />} />
        ) : (
          <>
            <View style={ds.metrics}>
              <Metric label="Total requests" value={String(quotes.length)} dark />
              <Metric label="Open" value={String(open)} sub="pending or in progress" />
              <Metric label="Latest request" value={fmt(quotes[0]?.created_at)} />
            </View>
            <Panel title="All requests">
              <Table
                testID="quotes-table"
                sort={sort}
                onSort={onSort}
                cols={[
                  { key: "d", label: "Requested", flex: 1.1, sortable: true },
                  { key: "site", label: "Business / site", flex: 2, sortable: true },
                  { key: "pc", label: "Postcode", flex: 0.9, sortable: true },
                  { key: "sv", label: "Services", flex: 1.8, sortable: true },
                  { key: "st", label: "Status", flex: 1.1, sortable: true },
                ]}
              >
                {sorted.map((q, i) => (
                  <TRow key={q.id || i} testID={`quote-row-${i}`}>
                    <Cell flex={1.1} muted>{fmt(q.created_at)}</Cell>
                    <Cell flex={2} strong>{siteOf(q)}</Cell>
                    <Cell flex={0.9} muted>{q.address?.postcode || "—"}</Cell>
                    <Cell flex={1.8}>{servicesOf(q)}</Cell>
                    <Cell flex={1.1}><StatusPill status={q.status} /></Cell>
                  </TRow>
                ))}
              </Table>
            </Panel>
          </>
        )}
      </DesktopPage>
    );
  }

  return (
    <View style={st.root}>
      <ScreenHeader testID="quotes-header" title="My quote requests" subtitle={`${quotes.length} request${quotes.length === 1 ? "" : "s"}`} onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} />
      {loading ? (
        <View style={st.center}><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {error ? (
            <Text style={st.error} testID="quotes-error">{error}</Text>
          ) : quotes.length === 0 ? (
            <EmptyState testID="quotes-empty" icon="document-text-outline" title="No quote requests yet" message="Request a quote and you'll be able to track its progress here.">
              <Button label="Get a quote" icon="add" onPress={newQuote} />
            </EmptyState>
          ) : (
            quotes.map((q, i) => (
              <View key={q.id || i} style={st.card} testID={`quote-card-${i}`}>
                <View style={st.cardTop}>
                  <View style={st.icon}><Icon name="document" size={18} color={colors.brandPrimary} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.title} numberOfLines={1}>{siteOf(q)}</Text>
                    <Text style={st.sub} numberOfLines={1}>{servicesOf(q)}</Text>
                  </View>
                  <StatusPill status={q.status} />
                </View>
                <Text style={st.meta}>Requested {fmt(q.created_at)}{q.address?.postcode ? ` · ${q.address.postcode}` : ""}</Text>
              </View>
            ))
          )}
          {quotes.length > 0 ? (
            <Pressable testID="quotes-new" onPress={newQuote} style={st.newBtn}>
              <Icon name="plus" size={16} color={colors.brandPrimary} />
              <Text style={st.newText}>Request another quote</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, minHeight: 200, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  error: { fontFamily: font.medium, fontSize: type.base, color: colors.error, textAlign: "center" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  sub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  meta: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontFamily: font.semibold, fontSize: type.kicker },
  newBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary, borderRadius: radius.md, paddingVertical: spacing.lg },
  newText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brandPrimary },
});
