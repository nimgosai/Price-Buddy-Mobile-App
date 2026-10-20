import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { useDesktopSheet } from "@/src/desktop/sheet";

export type SelectOption = { value: string; label: string; sublabel?: string };

// Native tap-to-open dropdown: a field that opens a bottom-sheet list of options.
export function SelectField({
  value,
  options,
  onChange,
  placeholder = "Select…",
  sheetTitle,
  emptyText,
  error,
  testID,
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  sheetTitle?: string;
  emptyText?: string;
  error?: boolean;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const dsheet = useDesktopSheet(480);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable testID={testID} onPress={() => setOpen(true)} style={({ pressed }) => [styles.field, error && styles.fieldError, pressed && { opacity: 0.85 }]}>
        <Text style={[styles.fieldText, !current && styles.fieldPlaceholder]} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Icon name="chevronDown" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, dsheet.backdrop]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }, dsheet.sheet]} onPress={() => {}}>
            <View style={styles.grabber} />
            {sheetTitle ? <Text style={styles.sheetTitle}>{sheetTitle}</Text> : null}
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {options.length === 0 && emptyText ? (
                <Text style={styles.emptyText}>{emptyText}</Text>
              ) : null}
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    testID={testID ? `${testID}-opt-${o.value}` : undefined}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.opt, on && styles.optOn, pressed && { opacity: 0.85 }]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.optLabel, on && { color: colors.brandPrimary }]} numberOfLines={1}>{o.label}</Text>
                      {o.sublabel ? <Text style={styles.optSub} numberOfLines={1}>{o.sublabel}</Text> : null}
                    </View>
                    {on ? <Icon name="check" size={18} color={colors.brandPrimary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fieldText: { flex: 1, fontFamily: font.regular, fontSize: type.lg, color: colors.onSurface },
  fieldError: { borderColor: colors.error, borderWidth: 1.5 },
  fieldPlaceholder: { color: colors.muted },

  backdrop: { flex: 1, backgroundColor: "rgba(20,15,40,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.sm },
  sheetTitle: { fontFamily: font.bold, fontSize: type.title, color: colors.heading, marginBottom: spacing.sm },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  optOn: { backgroundColor: colors.brandTertiary, borderRadius: radius.sm },
  optLabel: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  optSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 1 },
  emptyText: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, paddingVertical: spacing.lg, textAlign: "center" },
});
