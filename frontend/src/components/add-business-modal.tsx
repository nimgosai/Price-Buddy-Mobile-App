import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, IconName } from "@/src/components/icon";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { useDesktopSheet } from "@/src/desktop/sheet";

type BizType = {
  key: string;
  label: string;
  icon: IconName;
  bg: string;
  fg: string;
};

const BIZ_TYPES: BizType[] = [
  { key: "limited_company", label: "Limited Company", icon: "building", bg: colors.pastel.blue, fg: colors.pastel.blueIcon },
  { key: "sole_trader", label: "Sole Trader", icon: "user", bg: colors.pastel.lavender, fg: colors.pastel.lavenderIcon },
  { key: "partnership", label: "Partnership", icon: "users", bg: colors.pastel.yellow, fg: colors.pastel.yellowIcon },
  { key: "charity", label: "Charity", icon: "heart", bg: colors.pastel.peach, fg: colors.pastel.peachIcon },
  { key: "other", label: "Other", icon: "clipboard", bg: colors.pastel.mint, fg: colors.pastel.mintIcon },
];

export function AddBusinessModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (biz: any) => void;
}) {
  const insets = useSafeAreaInsets();
  const dsheet = useDesktopSheet(620);
  const [businessType, setBusinessType] = useState("limited_company");
  const [companyName, setCompanyName] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [charityNumber, setCharityNumber] = useState("");
  const [postcode, setPostcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setBusinessType("limited_company");
    setCompanyName("");
    setCompanyNumber("");
    setVatNumber("");
    setCharityNumber("");
    setPostcode("");
    setError("");
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const submit = async () => {
    setError("");
    if (!companyName.trim()) {
      setError("Please enter a name for the business");
      return;
    }
    setSaving(true);
    try {
      const data = await apiRequest<any>("/businesses", {
        method: "POST",
        body: {
          business_type: businessType,
          company_name: companyName.trim(),
          company_number: companyNumber.trim(),
          trading_name: "",
          vat_number: vatNumber.trim(),
          charity_number: charityNumber.trim(),
          postcode: postcode.trim(),
        },
      });
      onCreated(data);
      reset();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={[styles.backdrop, dsheet.backdrop]} onPress={close}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.kav, dsheet.kav]}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, dsheet.sheet]}
            onPress={() => {}}
            testID="new-biz-modal"
          >
            <View style={styles.grabber} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>Add a business</Text>
              <Text style={styles.subtitle}>What type of business is it?</Text>

              <View style={styles.typeGrid}>
                {BIZ_TYPES.map((t) => {
                  const active = businessType === t.key;
                  return (
                    <Pressable
                      key={t.key}
                      testID={`new-biz-type-${t.key}`}
                      onPress={() => setBusinessType(t.key)}
                      style={[styles.typeCard, active && styles.typeCardActive]}
                    >
                      <View style={[styles.typeIcon, { backgroundColor: t.bg }]}>
                        <Icon name={t.icon} size={18} color={t.fg} />
                      </View>
                      <Text style={styles.typeLabel}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.mini}>Business name</Text>
              <TextInput
                testID="new-biz-name"
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="e.g. Bayo's Cleaning Ltd"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />

              {businessType === "limited_company" && (
                <>
                  <Text style={styles.mini}>Companies House number (optional)</Text>
                  <TextInput
                    testID="new-biz-ch"
                    value={companyNumber}
                    onChangeText={setCompanyNumber}
                    placeholder="12345678"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </>
              )}
              {(businessType === "sole_trader" || businessType === "partnership") && (
                <>
                  <Text style={styles.mini}>VAT number (optional)</Text>
                  <TextInput
                    testID="new-biz-vat"
                    value={vatNumber}
                    onChangeText={setVatNumber}
                    placeholder="GB123456789"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                    style={styles.input}
                  />
                </>
              )}
              {businessType === "charity" && (
                <>
                  <Text style={styles.mini}>Charity number (optional)</Text>
                  <TextInput
                    testID="new-biz-charity"
                    value={charityNumber}
                    onChangeText={setCharityNumber}
                    placeholder="1234567"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </>
              )}

              {!!error && (
                <Text testID="new-biz-error" style={styles.error}>
                  {error}
                </Text>
              )}

              <View style={styles.actions}>
                <Pressable onPress={close} disabled={saving} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  testID="new-biz-submit"
                  onPress={submit}
                  disabled={saving}
                  style={[styles.btn, styles.btnPrimary, { flex: 2 }, saving && { opacity: 0.6 }]}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.onBrandPrimary} />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Add business</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,15,40,0.55)", justifyContent: "flex-end" },
  kav: { width: "100%", flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: spacing.lg,
    maxHeight: "88%",
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading },
  subtitle: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2, marginBottom: spacing.lg },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  typeCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  typeCardActive: { borderWidth: 2, borderColor: colors.heading },
  typeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  typeLabel: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  mini: { fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurfaceSecondary, marginBottom: 4, marginTop: spacing.sm },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  error: { fontFamily: font.medium, fontSize: type.sm, color: colors.error, marginTop: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  btn: { flex: 1, height: 50, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  btnGhost: { backgroundColor: colors.surfaceTertiary },
  btnGhostText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurfaceSecondary },
  btnPrimary: { backgroundColor: colors.brandPrimary },
  btnPrimaryText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onBrandPrimary },
});
