/** Desktop-web Sites page: toolbar + data table (≥1024px only). */
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BusinessSwitcherChip } from "@/src/components/business-switcher-chip";
import { Icon } from "@/src/components/icon";
import { DialogButton } from "@/src/desktop/overlays";
import { dCard, dt } from "@/src/desktop/tokens";
import { Cell, DesktopPage, EmptyPanel, HeaderButton, TRow, Table } from "@/src/desktop/ui";
import { colors, font, spacing, type } from "@/src/theme/theme";

type Props = {
  sites: any[];
  filtered: any[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  query: string;
  setQuery: (q: string) => void;
  showBusiness: boolean;
  bizName: (s: any) => string;
  openSite: (s: any) => void;
  onAdd: () => void;
};

export function SitesDesktop(p: Props) {
  return (
    <DesktopPage
      testID="sites-desktop"
      title="Sites"
      subtitle={`${p.sites.length} ${p.sites.length === 1 ? "site" : "sites"} across your portfolio`}
      refreshing={p.refreshing}
      onRefresh={p.onRefresh}
      actions={<HeaderButton testID="sites-add-new" label="Add site" icon="plus" primary onPress={p.onAdd} />}
    >
      <View style={s.toolbar}>
        <View style={{ minWidth: 220 }}><BusinessSwitcherChip variant="sites" /></View>
        <View style={{ flex: 1 }} />
        <View style={s.search}>
          <Icon name="search" size={15} color={dt.muted} />
          <TextInput
            testID="sites-search"
            value={p.query}
            onChangeText={p.setQuery}
            placeholder="Search sites, postcodes or meter numbers…"
            placeholderTextColor={dt.muted}
            style={s.searchInput}
          />
          {p.query.length > 0 ? (
            <Pressable testID="sites-search-clear" onPress={() => p.setQuery("")} hitSlop={8}>
              <Icon name="close" size={14} color={dt.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {p.loading && p.sites.length === 0 ? (
        <View style={s.loading} testID="sites-loading"><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
      ) : p.error ? (
        <EmptyPanel testID="sites-error" icon="warning" title="Couldn't load your sites" sub={p.error} action={<DialogButton label="Try again" variant="ghost" onPress={p.onRefresh} />} />
      ) : p.sites.length === 0 ? (
        <EmptyPanel
          testID="sites-empty"
          icon="building"
          title="No sites yet"
          sub="Add your first site for this business — scan a bill, get a quote, or enter details manually."
          action={<DialogButton testID="sites-add-first" label="Add your first site" onPress={p.onAdd} />}
        />
      ) : p.filtered.length === 0 ? (
        <EmptyPanel
          testID="sites-no-match"
          icon="search"
          title={`No sites found for “${p.query.trim()}”`}
          sub="Check your spelling or add this as a new location."
          action={<DialogButton testID="sites-no-match-add" label="Add this site" onPress={p.onAdd} />}
        />
      ) : (
        <View style={s.card}>
          <Table
            testID="sites-table"
            cols={[
              { key: "n", label: "Site", flex: 2 },
              { key: "a", label: "Address", flex: 2.6 },
              { key: "p", label: "Postcode", flex: 1 },
              ...(p.showBusiness ? [{ key: "b", label: "Business", flex: 1.6 }] : []),
              { key: "m", label: "Meter / MPAN", flex: 1.6 },
              { key: "x", label: "", flex: 0.4, align: "right" as const },
            ]}
          >
            {p.filtered.map((site) => (
              <TRow key={site.id || site._id} testID={`site-card-${site.id || site._id}`} onPress={() => p.openSite(site)}>
                <Cell flex={2}>
                  <View style={s.nameCell}>
                    <View style={s.pin}><Icon name="mapPin" size={14} color={colors.brandPrimary} /></View>
                    <Text style={s.name} numberOfLines={1}>{site.property_name || site.address || "Site"}</Text>
                  </View>
                </Cell>
                <Cell flex={2.6} muted>{site.address || "Address on file"}</Cell>
                <Cell flex={1} muted>{site.postcode || "—"}</Cell>
                {p.showBusiness ? <Cell flex={1.6} muted>{p.bizName(site)}</Cell> : null}
                <Cell flex={1.6} muted>{site.meter_point_number || site.mpan || site.mprn || "—"}</Cell>
                <Cell flex={0.4} align="right"><Icon name="chevronRight" size={16} color="#94A3B8" /></Cell>
              </TRow>
            ))}
          </Table>
        </View>
      )}
    </DesktopPage>
  );
}

const s = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", gap: spacing.md, zIndex: 5 },
  search: { ...dCard, flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 40, width: 360, paddingHorizontal: spacing.md, borderRadius: 8 },
  searchInput: { flex: 1, minWidth: 0, height: "100%", fontFamily: font.regular, fontSize: type.sm, color: dt.text },
  loading: { height: 240, alignItems: "center", justifyContent: "center" },
  card: { ...dCard, overflow: "hidden" },
  nameCell: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  pin: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  name: { flexShrink: 1, fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
});
