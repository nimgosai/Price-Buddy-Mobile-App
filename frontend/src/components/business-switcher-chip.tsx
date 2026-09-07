import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { AddBusinessModal } from "@/src/components/add-business-modal";
import { useToast } from "@/src/components/toast";
import { ALL_BUSINESSES, useBusiness } from "@/src/business/business-context";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type Variant = "sites" | "reports";

const VARIANT_STYLE: Record<Variant, { bg: string; border: string; iconBg: string; iconFg: string; kicker: string }> = {
  sites: {
    bg: colors.pastel.lavender,
    border: colors.pastel.lavender,
    iconBg: "#FFFFFF",
    iconFg: colors.pastel.lavenderIcon,
    kicker: colors.pastel.lavenderIcon,
  },
  reports: {
    bg: "#F5F3FF",
    border: "#EDE9FE",
    iconBg: "#1A1F36",
    iconFg: "#FFFFFF",
    kicker: "#1A1F36",
  },
};

/** Business switcher chip — only rendered when the owner has more than one business. */
export function BusinessSwitcherChip({ variant = "sites", testID }: { variant?: Variant; testID?: string }) {
  const { businesses, activeBizId, activeBusiness, switchBusiness, refreshBusinesses } = useBusiness();
  const [open, setOpen] = useState(false);
  const [addBiz, setAddBiz] = useState(false);
  const toast = useToast();
  const insets = useSafeAreaInsets();

  if (businesses.length <= 1) return null;

  const name =
    activeBizId === ALL_BUSINESSES ? `All businesses (${businesses.length})` : activeBusiness?.company_name || "—";

  const renderSheet = () => (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>Switch business</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            <Option
              testID="biz-option-all"
              label={`All businesses (${businesses.length})`}
              sub="See everything in one list"
              active={activeBizId === ALL_BUSINESSES}
              onPress={() => { switchBusiness(ALL_BUSINESSES); setOpen(false); }}
            />
            {businesses.map((b) => (
              <Option
                key={b.id}
                testID={`biz-option-${b.id}`}
                label={b.company_name}
                sub={`${b.site_count ?? 0} site${(b.site_count ?? 0) === 1 ? "" : "s"} · ${b.contract_count ?? 0} contract${(b.contract_count ?? 0) === 1 ? "" : "s"}`}
                active={activeBizId === b.id}
                onPress={() => { switchBusiness(b.id); setOpen(false); }}
              />
            ))}
            <Pressable testID="biz-add-business" onPress={() => { setOpen(false); setAddBiz(true); }} style={styles.addRow}>
              <View style={styles.addIcon}>
                <Icon name="plus" size={16} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.addLabel}>Add a business</Text>
                <Text style={styles.addSub}>For a separate legal company you manage</Text>
              </View>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const vs = VARIANT_STYLE[variant];
  const kicker = variant === "reports" ? "VIEWING REPORTS FOR" : "VIEWING SITES FOR";

  return (
    <>
      <Pressable
        testID={testID || `${variant}-business-chip`}
        onPress={() => setOpen(true)}
        style={[styles.chip, { backgroundColor: vs.bg, borderColor: vs.border }]}
      >
        <View style={[styles.chipIcon, { backgroundColor: vs.iconBg }]}>
          <Icon name="building" size={16} color={vs.iconFg} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.chipKicker, { color: vs.kicker }]}>{kicker}</Text>
          <Text style={styles.chipName} numberOfLines={1}>{name}</Text>
        </View>
        <Text style={[styles.switch, { color: vs.kicker }]}>Switch</Text>
      </Pressable>

      {renderSheet()}

      <AddBusinessModal
        visible={addBiz}
        onClose={() => setAddBiz(false)}
        onCreated={() => { setAddBiz(false); toast("Business added.", "success"); refreshBusinesses(); }}
      />
    </>
  );
}

function Option({ label, sub, active, onPress, testID }: { label: string; sub: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.option, active && styles.optionActive]}>
      <View style={[styles.optionIcon, active && { backgroundColor: colors.brandPrimary }]}>
        <Icon name="building" size={16} color={active ? "#FFFFFF" : colors.muted} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.optionLabel} numberOfLines={2}>{label}</Text>
        <Text style={styles.optionSub} numberOfLines={1}>{sub}</Text>
      </View>
      {active && <Icon name="check" size={18} color={colors.brandPrimary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  chipIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  chipKicker: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, textTransform: "uppercase" },
  chipName: { fontFamily: font.bold, fontSize: type.base, color: colors.heading, marginTop: 1 },
  switch: { fontFamily: font.semibold, fontSize: type.sm },

  backdrop: { flex: 1, backgroundColor: "rgba(20,15,40,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.lg },
  grabber: { width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, marginBottom: spacing.md, letterSpacing: -0.3 },

  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  optionActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  optionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  optionSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 1 },

  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary, marginTop: spacing.xs, marginBottom: spacing.sm },
  addIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  addLabel: { fontFamily: font.semibold, fontSize: type.title, color: colors.brandPrimary },
  addSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 1 },
});
