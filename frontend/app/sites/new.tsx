import { useRef, useState } from "react";
import { StyleSheet, Text, View, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useRouter } from "expo-router";

import { Button } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export default function NewSite() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [supplier, setSupplier] = useState("");
  const [endDate, setEndDate] = useState("");
  const [meterType, setMeterType] = useState<"" | "electric" | "gas">("");
  const [meterNumber, setMeterNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const addressRef = useRef<TextInput>(null);
  const postcodeRef = useRef<TextInput>(null);

  const goToSites = () => router.replace("/sites");

  const submit = async () => {
    if (submitting) return;
    setError("");
    if (!address.trim() || !postcode.trim()) {
      setError("Address and postcode are required");
      return;
    }
    setSubmitting(true);
    try {
      const lines = [
        "Please add a new site.",
        name.trim() ? `Site name: ${name.trim()}` : null,
        `Address: ${address.trim()}`,
        `Postcode: ${postcode.trim().toUpperCase()}`,
        supplier.trim() ? `Existing supplier: ${supplier.trim()}` : null,
        endDate.trim() ? `Current contract end date: ${endDate.trim()}` : null,
        meterType ? `Meter type: ${meterType === "gas" ? "Gas (MPRN)" : "Electric (MPAN)"}` : null,
        meterNumber.trim() ? `Meter number: ${meterNumber.trim()}` : null,
        notes.trim() ? `Notes: ${notes.trim()}` : null,
      ].filter(Boolean);
      await apiRequest("/change-requests", {
        method: "POST",
        body: { request_type: "site_add", message: lines.join("\n") },
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View style={styles.root}>
        <ScreenHeader testID="add-site-success-header" title="Request received" onBack={goToSites} />
        <View style={styles.successWrap} testID="add-site-success">
          <View style={styles.successIcon}>
            <Icon name="check" size={28} color={colors.pastel.mintIcon} />
          </View>
          <Text style={styles.successTitle}>We&apos;re on it</Text>
          <Text style={styles.successSub}>
            Your account manager will add this site to your account and confirm by email. You&apos;ll
            see it appear in Your sites as soon as it&apos;s verified.
          </Text>
          <Button
            testID="add-site-back-to-sites"
            label="Back to Your sites"
            onPress={goToSites}
            style={{ alignSelf: "stretch", marginTop: spacing.lg }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="add-site-header"
        title="Add a site"
        subtitle="Where is this business located?"
        onBack={goToSites}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={90}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.notice} testID="add-site-notice">
          <View style={styles.noticeIcon}>
            <Icon name="document" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.noticeText}>
            Your account manager will create this site for you and confirm by email — usually within
            one business hour.
          </Text>
        </View>

        <View style={styles.form}>
          <Field label="Site name (optional)">
            <TextInput
              testID="add-site-name"
              value={name}
              onChangeText={setName}
              placeholder="Head Office, Leicester Branch…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => addressRef.current?.focus()}
            />
          </Field>
          <Field label="Address">
            <TextInput
              testID="add-site-address"
              ref={addressRef}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Boulevard Avenue"
              placeholderTextColor={colors.muted}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => postcodeRef.current?.focus()}
            />
          </Field>
          <Field label="Postcode">
            <TextInput
              testID="add-site-postcode"
              ref={postcodeRef}
              value={postcode}
              onChangeText={(t) => setPostcode(t.toUpperCase())}
              placeholder="SW1A 1AA"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={styles.input}
            />
          </Field>
          <Field label="Existing supplier (optional)">
            <TextInput
              testID="add-site-supplier"
              value={supplier}
              onChangeText={setSupplier}
              placeholder="e.g. British Gas, EDF, Octopus"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label="Current contract end date (optional)">
            <TextInput
              testID="add-site-end-date"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="e.g. Mar 2026"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label="Meter type (optional)">
            <View style={styles.segmentRow}>
              {(["electric", "gas"] as const).map((t) => {
                const on = meterType === t;
                return (
                  <Pressable
                    key={t}
                    testID={`add-site-meter-type-${t}`}
                    onPress={() => setMeterType(on ? "" : t)}
                    style={[styles.segment, on && styles.segmentOn]}
                  >
                    <Icon name={t === "gas" ? "fire" : "bolt"} size={16} color={on ? colors.brandPrimary : colors.muted} />
                    <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                      {t === "gas" ? "Gas" : "Electric"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <Field label="Meter number (optional)">
            <TextInput
              testID="add-site-meter"
              value={meterNumber}
              onChangeText={setMeterNumber}
              placeholder={meterType === "gas" ? "MPRN (gas)" : meterType === "electric" ? "MPAN (electric)" : "MPAN (electric) or MPRN (gas)"}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label="Anything we should know? (optional)">
            <TextInput
              testID="add-site-notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Existing supplier, current contract end date, half-hourly meter…"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, styles.textarea]}
            />
          </Field>

          {!!error && (
            <Text testID="add-site-error" style={styles.error}>
              {error}
            </Text>
          )}
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            testID="add-site-submit"
            label="Submit to my account manager"
            onPress={submit}
            loading={submitting}
          />
        </View>
      </KeyboardStickyView>
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
  scroll: { padding: spacing.lg, gap: spacing.lg },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.heading,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeText: { flex: 1, fontFamily: font.regular, fontSize: type.base, color: colors.onSurfaceSecondary, lineHeight: 20 },
  form: { gap: spacing.lg },
  label: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  segmentRow: { flexDirection: "row", gap: spacing.sm },
  segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  segmentOn: { borderWidth: 2, borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  segmentText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  segmentTextOn: { color: colors.brandPrimary },
  error: { fontFamily: font.medium, fontSize: type.base, color: colors.error },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  successWrap: { padding: spacing.lg, alignItems: "center" },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.pastel.mint,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  successTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading },
  successSub: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
