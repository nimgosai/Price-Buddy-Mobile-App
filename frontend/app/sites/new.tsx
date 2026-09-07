import { useMemo, useState } from "react";
import { StyleSheet, Text, View, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useRouter } from "expo-router";

import { Button } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { SelectField, SelectOption } from "@/src/components/select-field";
import { AddBusinessModal } from "@/src/components/add-business-modal";
import { useToast } from "@/src/components/toast";
import { useBusiness, ALL_BUSINESSES } from "@/src/business/business-context";
import { apiRequest, ApiError } from "@/src/api/client";
import { addDemoProperty, isDemoEnabled } from "@/src/demo/demo-data";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const ADD_BIZ = "__add_business__";
const UK_POSTCODE = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i;

export default function NewSite() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { businesses, activeBizId, refreshBusinesses } = useBusiness();

  const [bizId, setBizId] = useState(activeBizId && activeBizId !== ALL_BUSINESSES ? activeBizId : businesses[0]?.id || "");
  const [addBiz, setAddBiz] = useState(false);
  const [method, setMethod] = useState<"" | "manual">("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [meterType, setMeterType] = useState<"electric" | "gas">("electric");

  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const goToSites = () => router.replace("/sites");

  const bizOptions: SelectOption[] = useMemo(
    () => [
      ...businesses.map((b) => ({ value: b.id, label: b.company_name, sublabel: `${b.site_count ?? 0} site${(b.site_count ?? 0) === 1 ? "" : "s"}` })),
      { value: ADD_BIZ, label: "+ Add a new business", sublabel: "A separate legal company you manage" },
    ],
    [businesses],
  );

  const postcodeInvalid = postcode.trim().length > 0 && !UK_POSTCODE.test(postcode.trim());

  const submit = async () => {
    if (submitting) return;
    setShowErrors(true);
    setError("");
    if (!bizId) { setError("Please choose a business first."); return; }
    if (!address.trim() || !name.trim() || !UK_POSTCODE.test(postcode.trim())) {
      setError("Please complete the site name, address and a valid UK postcode.");
      return;
    }
    setSubmitting(true);
    try {
      if (isDemoEnabled()) {
        addDemoProperty({ business_id: bizId, property_name: name, address, postcode });
      } else {
        await apiRequest("/properties", {
          method: "POST",
          body: {
            business_id: bizId,
            property_name: name.trim(),
            address: address.trim(),
            postcode: postcode.trim().toUpperCase(),
            primary_meter_type: meterType,
          },
        });
      }
      await refreshBusinesses();
      toast("Site added to your account.", "success");
      goToSites();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add the site. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader testID="add-site-header" title="Onboard an existing site" subtitle="Add a branch, premises or meter" onBack={goToSites} />
      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} bottomOffset={90} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Step 1 — Business */}
        <Text style={styles.stepKicker}>STEP 1</Text>
        <Text style={styles.h2}>Select business</Text>
        <SelectField
          testID="add-site-business"
          value={bizId}
          options={bizOptions}
          onChange={(v) => { if (v === ADD_BIZ) { setAddBiz(true); } else { setBizId(v); } }}
          placeholder="Choose a business"
          sheetTitle="Select business"
          error={showErrors && !bizId}
        />

        {/* Step 2 — method */}
        <Text style={[styles.stepKicker, { marginTop: spacing.xl }]}>STEP 2</Text>
        <Text style={styles.h2}>How would you like to add the site?</Text>

        <Pressable testID="add-site-method-scan" onPress={() => router.push("/scan")} style={({ pressed }) => [styles.methodCard, pressed && { opacity: 0.9 }]}>
          <View style={[styles.methodIcon, { backgroundColor: colors.pastel.peach }]}>
            <Icon name="scan" size={22} color={colors.pastel.peachIcon} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.methodTitleRow}>
              <Text style={styles.methodTitle}>Upload / Scan Bill</Text>
              <View style={styles.recPill}><Text style={styles.recPillText}>Recommended</Text></View>
            </View>
            <Text style={styles.methodSub}>Auto-fills supplier, meter and address from your bill.</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.muted} />
        </Pressable>

        <Pressable testID="add-site-method-manual" onPress={() => setMethod("manual")} style={({ pressed }) => [styles.methodCard, method === "manual" && styles.methodCardOn, pressed && { opacity: 0.9 }]}>
          <View style={[styles.methodIcon, { backgroundColor: colors.pastel.blue }]}>
            <Icon name="mapPin" size={22} color={colors.pastel.blueIcon} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.methodTitle}>Enter Address &amp; Meter Manually</Text>
            <Text style={styles.methodSub}>Postcode lookup, site name and meter type.</Text>
          </View>
          <Icon name={method === "manual" ? "chevronDown" : "chevronRight"} size={18} color={colors.muted} />
        </Pressable>

        {method === "manual" && (
          <View style={styles.manual} testID="add-site-manual-form">
            <Field label="Site name">
              <TextInput testID="add-site-name" value={name} onChangeText={setName} placeholder="Head Office, Leicester Branch…" placeholderTextColor={colors.muted} style={[styles.input, showErrors && !name.trim() && styles.inputError]} />
            </Field>
            <Field label="Address">
              <TextInput testID="add-site-address" value={address} onChangeText={setAddress} placeholder="123 Boulevard Avenue" placeholderTextColor={colors.muted} style={[styles.input, showErrors && !address.trim() && styles.inputError]} />
            </Field>
            <Field label="Postcode">
              <TextInput testID="add-site-postcode" value={postcode} onChangeText={(t) => setPostcode(t.toUpperCase())} placeholder="SW1A 1AA" placeholderTextColor={colors.muted} autoCapitalize="characters" style={[styles.input, ((showErrors && !postcode.trim()) || postcodeInvalid) && styles.inputError]} />
              {postcodeInvalid && <Text testID="add-site-postcode-error" style={styles.fieldError}>Please enter a valid UK postcode (e.g. SW1A 1AA)</Text>}
            </Field>
            <Field label="Meter type">
              <View style={styles.segmentRow}>
                {(["electric", "gas"] as const).map((t) => {
                  const on = meterType === t;
                  const icon: IconName = t === "gas" ? "fire" : "bolt";
                  return (
                    <Pressable key={t} testID={`add-site-meter-type-${t}`} onPress={() => setMeterType(t)} style={[styles.segment, on && styles.segmentOn]}>
                      <Icon name={icon} size={16} color={on ? colors.brandPrimary : colors.muted} />
                      <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{t === "gas" ? "Gas" : "Electric"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          </View>
        )}

        {!!error && <Text testID="add-site-error" style={styles.error}>{error}</Text>}
      </KeyboardAwareScrollView>

      {method === "manual" && (
        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Button testID="add-site-submit" label="Save site" onPress={submit} loading={submitting} />
          </View>
        </KeyboardStickyView>
      )}

      <AddBusinessModal
        visible={addBiz}
        onClose={() => setAddBiz(false)}
        onCreated={(created?: any) => {
          setAddBiz(false);
          toast("Business added.", "success");
          refreshBusinesses().then(() => { if (created?.id) setBizId(created.id); }).catch(() => {});
        }}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
  stepKicker: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.brandPrimary, textTransform: "uppercase" },
  h2: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, marginTop: 2, marginBottom: spacing.md, letterSpacing: -0.3 },

  methodCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: spacing.sm },
  methodCardOn: { borderColor: colors.brandPrimary, borderWidth: 1.5 },
  methodIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  methodTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  methodTitle: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  methodSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2, lineHeight: 18 },
  recPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: "#DCFCE7" },
  recPillText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.3, color: "#047857" },

  manual: { gap: spacing.lg, marginTop: spacing.md },
  label: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, fontFamily: font.regular, fontSize: type.lg, color: colors.onSurface, backgroundColor: colors.surface },
  inputError: { borderColor: colors.error, borderWidth: 1.5 },
  fieldError: { fontFamily: font.medium, fontSize: type.sm, color: colors.error, marginTop: spacing.xs },
  segmentRow: { flexDirection: "row", gap: spacing.sm },
  segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  segmentOn: { borderWidth: 2, borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  segmentText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  segmentTextOn: { color: colors.brandPrimary },
  error: { fontFamily: font.medium, fontSize: type.base, color: colors.error, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
});
