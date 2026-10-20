/** Desktop-web quote form layout: wizard on the left, live request summary on the right (≥1024px only). */
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Icon, IconName } from "@/src/components/icon";
import { dCard, dt } from "@/src/desktop/tokens";
import { font, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";

const WINDOW: Record<string, string> = {
  out_of_contract: "Out of contract",
  under_6m: "Ends within 6 months",
  "6_12m": "Ends in 6–12 months",
  over_12m: "Ends in 12+ months",
};

export type QuoteSummaryData = {
  services: { key: string; label: string; icon: IconName; color: string }[];
  contact: { name: string; email: string };
  siteName: string;
  address: { business_name?: string; full_address?: string; postcode?: string };
  meters: { _id: string; utility: string; supplier: string; contract_end_window: string; meter_point_number: string }[];
  waterSupplier: string;
  telecomsSupplier: string;
  stepLabel: string;
};

export function QuoteDesktopLayout({ summary, children }: { summary: QuoteSummaryData; children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <>{children}</>;
  return (
    <View style={s.root}>
      <View style={s.form}>{children}</View>
      <QuoteSummary {...summary} />
    </View>
  );
}

function Row({ label, value, testID }: { label: string; value?: string; testID?: string }) {
  return (
    <View style={s.row} testID={testID}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, !value && { color: "#94A3B8" }]} numberOfLines={2}>{value || "Not provided yet"}</Text>
    </View>
  );
}

function QuoteSummary(p: QuoteSummaryData) {
  const supplier = (v: string) => (v === "__idk__" ? "Not sure" : v);
  return (
    <ScrollView style={s.side} contentContainerStyle={s.sideInner} testID="quote-summary-panel">
      <View style={s.card}>
        <View style={s.head}>
          <Text style={s.title}>Your request</Text>
          <Text style={s.step}>{p.stepLabel}</Text>
        </View>

        <Text style={s.kicker}>Services</Text>
        {p.services.length ? (
          <View style={s.chips} testID="quote-summary-services">
            {p.services.map((sv) => (
              <View key={sv.key} style={[s.chip, { backgroundColor: `${sv.color}1A` }]}>
                <Icon name={sv.icon} size={13} color={sv.color} />
                <Text style={s.chipText}>{sv.label}</Text>
              </View>
            ))}
          </View>
        ) : <Text style={s.empty}>Choose at least one service</Text>}

        <Text style={s.kicker}>Site</Text>
        <Row label="Business / site" value={p.address.business_name || (p.siteName !== "this site" ? p.siteName : "")} testID="quote-summary-site" />
        <Row label="Address" value={[p.address.full_address, p.address.postcode].filter(Boolean).join(", ")} />

        {p.meters.length ? (
          <>
            <Text style={s.kicker}>Meters</Text>
            {p.meters.map((m) => (
              <View key={m._id} style={s.meter}>
                <Icon name={m.utility === "gas" ? "fire" : "bolt"} size={14} color={m.utility === "gas" ? "#F97316" : "#F59E0B"} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.rowValue} numberOfLines={1}>{m.utility === "gas" ? "Gas" : "Electricity"} · {m.supplier ? supplier(m.supplier) : "Supplier TBC"}</Text>
                  <Text style={s.rowLabel} numberOfLines={1}>
                    {[WINDOW[m.contract_end_window], m.meter_point_number && `${m.utility === "gas" ? "MPRN" : "MPAN"} ${m.meter_point_number}`].filter(Boolean).join(" · ") || "Details to add"}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : null}

        {p.waterSupplier ? <Row label="Water supplier" value={supplier(p.waterSupplier)} /> : null}
        {p.telecomsSupplier ? <Row label="Telecoms supplier" value={supplier(p.telecomsSupplier)} /> : null}

        <Text style={s.kicker}>Contact</Text>
        <Row label="Name" value={p.contact.name} />
        <Row label="Email" value={p.contact.email} />
      </View>

      <View style={s.note}>
        <Icon name="shield" size={16} color="#047857" />
        <Text style={s.noteText}>No obligation. Our team compares the market and replies within 1 business day.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: dt.canvas, gap: spacing.xl, paddingHorizontal: spacing["2xl"], paddingTop: spacing.xl, paddingBottom: spacing.xl, width: "100%", maxWidth: 1240, alignSelf: "center" },
  form: { flex: 1, maxWidth: 720, minWidth: 0, ...dCard, overflow: "hidden" },
  side: { width: 360, flexGrow: 0 },
  sideInner: { gap: spacing.lg, paddingBottom: spacing["2xl"] },
  card: { ...dCard, padding: spacing.xl, gap: spacing.sm },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  title: { fontFamily: font.semibold, fontSize: type.lg, color: dt.text },
  step: { fontFamily: font.medium, fontSize: type.kicker, color: dt.muted },
  kicker: { fontFamily: font.semibold, fontSize: type.kicker, letterSpacing: 0.6, textTransform: "uppercase", color: dt.muted, marginTop: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontFamily: font.semibold, fontSize: type.kicker, color: dt.text },
  empty: { fontFamily: font.regular, fontSize: type.sm, color: "#94A3B8" },
  row: { gap: 2, paddingVertical: 4 },
  rowLabel: { fontFamily: font.regular, fontSize: type.kicker, color: dt.muted },
  rowValue: { fontFamily: font.medium, fontSize: type.sm, color: dt.text },
  meter: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: dt.border, borderRadius: 8, padding: spacing.sm },
  note: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 10, padding: spacing.md },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: type.sm, color: "#065F46", lineHeight: 19 },
});

