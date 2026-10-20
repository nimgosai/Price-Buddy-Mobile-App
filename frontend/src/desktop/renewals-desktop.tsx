/** Desktop-web renewals: data table, page and right-hand slide-over drawer (≥1024px only). */
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import dayjs from "dayjs";

import { Icon } from "@/src/components/icon";
import { DialogButton, SlideOver } from "@/src/desktop/overlays";
import { dt } from "@/src/desktop/tokens";
import {
  Cell, DesktopPage, EmptyPanel, HeaderButton, Metric, StatusPill, TRow, Table, UtilCell, ds, util,
} from "@/src/desktop/ui";
import { colors, font, spacing, type } from "@/src/theme/theme";
import { useBillCapture } from "@/src/desktop/upload-bill";

const endOf = (c: any) => c.end_date || c.contract_end_date || c.renewal_date;
export function daysLeft(c: any): number {
  if (typeof c.days_until_expiry === "number") return c.days_until_expiry;
  const e = endOf(c);
  return e && dayjs(e).isValid() ? dayjs(e).startOf("day").diff(dayjs().startOf("day"), "day") : 0;
}
const fmtDate = (d?: string) => (d && dayjs(d).isValid() ? dayjs(d).format("D MMM YYYY") : "—");

export function RenewalsTable({ items, testID = "renewals-table" }: { items: any[]; testID?: string }) {
  const router = useRouter();
  return (
    <Table
      testID={testID}
      cols={[
        { key: "u", label: "Utility", flex: 1.2 },
        { key: "s", label: "Supplier", flex: 1.4 },
        { key: "site", label: "Site", flex: 2 },
        { key: "b", label: "Business", flex: 1.5 },
        { key: "e", label: "Ends", flex: 1.1 },
        { key: "st", label: "Status", flex: 1.1 },
        { key: "a", label: "", flex: 1, align: "right" },
      ]}
    >
      {items.map((c, i) => (
        <TRow key={c.contract_id || c.id || i} testID={`renewal-row-${i}`} onPress={() => c.property_id && router.push(`/sites/${c.property_id}`)}>
          <Cell flex={1.2}><UtilCell utility={c.utility_type} /></Cell>
          <Cell flex={1.4} strong>{c.supplier_name || "Supplier TBC"}</Cell>
          <Cell flex={2} muted>{`${c.property_name || "Site"}${c.postcode ? ` · ${c.postcode}` : ""}`}</Cell>
          <Cell flex={1.5} muted>{c.business_name || "—"}</Cell>
          <Cell flex={1.1} muted>{fmtDate(endOf(c))}</Cell>
          <Cell flex={1.1}><StatusPill days={daysLeft(c)} /></Cell>
          <Cell flex={1} align="right">
            <Pressable
              testID={`renewal-quote-${i}`}
              onPress={() => router.push({ pathname: "/quote/new", params: { propertyId: String(c.property_id || ""), utility: c.utility_type || "", contractId: c.contract_id || c.id || "", incumbent: c.supplier_name || "" } })}
              style={(st: any) => [s.quoteBtn, st.hovered && { backgroundColor: colors.brandTertiary }]}
            >
              <Text style={s.quoteText}>Get quote</Text>
            </Pressable>
          </Cell>
        </TRow>
      ))}
    </Table>
  );
}

function Summary({ items }: { items: any[] }) {
  const urgent = items.filter((c) => daysLeft(c) <= 30).length;
  const sites = new Set(items.map((c) => c.property_id)).size;
  return (
    <View style={ds.metrics}>
      <Metric testID="renewals-metric-total" label="Contracts ending ≤ 90 days" value={String(items.length)} dark />
      <Metric label="Urgent (≤ 30 days)" value={String(urgent)} />
      <Metric label="Sites affected" value={String(sites)} />
      <Metric label="Earliest end date" value={items[0] ? fmtDate(endOf(items[0])) : "—"} />
    </View>
  );
}

export function RenewalsDesktopPage({ items, loading, error, refreshing, onRefresh }: { items: any[]; loading: boolean; error: string | null; refreshing: boolean; onRefresh: () => void }) {
  const bill = useBillCapture();
  return (
    <DesktopPage
      testID="renewals-desktop"
      title="Renewals coming up"
      subtitle="Contracts ending in the next 90 days, soonest first."
      refreshing={refreshing}
      onRefresh={onRefresh}
      actions={<HeaderButton label="Upload a bill" icon="document" onPress={() => bill.open()} testID="renewals-scan-button" />}
    >
      {loading ? (
        <View style={s.loading}><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
      ) : error ? (
        <EmptyPanel testID="renewals-error" icon="warning" title="Couldn't load renewals" sub={error} action={<DialogButton label="Try again" variant="ghost" onPress={onRefresh} />} />
      ) : items.length === 0 ? (
        <EmptyPanel testID="renewals-empty" icon="check" title="You're all caught up" sub="No contracts expiring within 90 days. We'll alert you well ahead of every renewal." />
      ) : (
        <>
          <Summary items={items} />
          <RenewalsTable items={items} />
        </>
      )}
    </DesktopPage>
  );
}

/** Slide-over used from the desktop dashboard instead of navigating to the full-screen list. */
export function RenewalsDrawer({ items, onClose }: { items: any[]; onClose: () => void }) {
  const router = useRouter();
  const go = (fn: () => void) => { onClose(); fn(); };
  return (
    <SlideOver
      testID="renewals-drawer"
      title="Renewals coming up"
      subtitle={`${items.length} contract${items.length === 1 ? "" : "s"} ending in the next 90 days`}
      icon="warning"
      iconBg="#FEF2F2"
      iconColor="#B91C1C"
      onClose={onClose}
      footer={<DialogButton testID="renewals-drawer-open-page" label="Open full renewals page" variant="ghost" onPress={() => go(() => router.push("/renewals"))} />}
    >
      {items.length === 0 ? (
        <Text style={s.muted}>No contracts expiring within 90 days.</Text>
      ) : (
        items.map((c, i) => {
          const m = util(c.utility_type);
          return (
            <View key={c.contract_id || c.id || i} style={s.item} testID={`renewals-drawer-item-${i}`}>
              <View style={s.itemTop}>
                <View style={[s.itemIcon, { backgroundColor: `${m.color}1F` }]}><Icon name={m.icon} size={16} color={m.color} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.itemTitle} numberOfLines={1}>{m.label} · {c.supplier_name || "Supplier TBC"}</Text>
                  <Text style={s.muted} numberOfLines={1}>{c.property_name || "Site"}{c.postcode ? ` · ${c.postcode}` : ""}</Text>
                </View>
                <StatusPill days={daysLeft(c)} />
              </View>
              <View style={s.itemMeta}>
                <Text style={s.muted}>Ends {fmtDate(endOf(c))}</Text>
                <View style={{ flex: 1 }} />
                <DialogButton label="View site" variant="ghost" onPress={() => go(() => c.property_id && router.push(`/sites/${c.property_id}`))} testID={`renewals-drawer-site-${i}`} />
                <DialogButton
                  label="Get quote"
                  onPress={() => go(() => router.push({ pathname: "/quote/new", params: { propertyId: String(c.property_id || ""), utility: c.utility_type || "", contractId: c.contract_id || c.id || "", incumbent: c.supplier_name || "" } }))}
                  testID={`renewals-drawer-quote-${i}`}
                />
              </View>
            </View>
          );
        })
      )}
    </SlideOver>
  );
}

const s = StyleSheet.create({
  loading: { height: 240, alignItems: "center", justifyContent: "center" },
  quoteBtn: { height: 30, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  quoteText: { fontFamily: font.semibold, fontSize: type.kicker, color: colors.brandPrimary },
  muted: { fontFamily: font.regular, fontSize: type.sm, color: dt.muted },
  item: { borderWidth: 1, borderColor: dt.border, borderRadius: 10, padding: spacing.lg, gap: spacing.md },
  itemTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  itemIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontFamily: font.semibold, fontSize: type.base, color: dt.text },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
