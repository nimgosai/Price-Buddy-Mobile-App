import { useRef, useState } from "react";
import { StyleSheet, Text, View, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { Button, TextField } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

function fmt(d?: string): string {
  if (!d) return "";
  const v = dayjs(d);
  return v.isValid() ? v.format("DD/MM/YYYY") : d;
}

export default function ContractEdit() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{
    id: string;
    property_id?: string;
    supplier?: string;
    utility_type?: string;
    start_date?: string;
    end_date?: string;
  }>();

  const orig = {
    supplier: params.supplier || "",
    start: fmt(params.start_date),
    end: fmt(params.end_date),
  };

  const [supplier, setSupplier] = useState(orig.supplier);
  const [start, setStart] = useState(orig.start);
  const [end, setEnd] = useState(orig.end);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const startRef = useRef<TextInput>(null);
  const endRef = useRef<TextInput>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/sites");
  };

  const dirty =
    supplier.trim() !== orig.supplier ||
    start.trim() !== orig.start ||
    end.trim() !== orig.end ||
    notes.trim().length > 0;

  const submit = async () => {
    if (submitting || !dirty) return;
    setSubmitting(true);
    const lines = ["Please update this contract:"];
    if (supplier.trim() && supplier.trim() !== orig.supplier) lines.push(`Supplier → ${supplier.trim()}`);
    if (start.trim() && start.trim() !== orig.start) lines.push(`Start date → ${start.trim()}`);
    if (end.trim() && end.trim() !== orig.end) lines.push(`End date → ${end.trim()}`);
    if (notes.trim()) lines.push(`Notes: ${notes.trim()}`);
    try {
      await apiRequest("/change-requests", {
        method: "POST",
        body: {
          message: lines.join("\n"),
          request_type: "update_contract",
          contract_id: params.id || null,
          property_id: params.property_id || null,
        },
      });
      toast("Sent to your account manager — we'll update it shortly.", "success");
      goBack();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't send your request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="contract-edit-header"
        title="Request a change"
        subtitle={params.supplier || undefined}
        onBack={goBack}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={90}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.notice} testID="contract-edit-notice">
          <Ionicons name="lock-closed" size={18} color={colors.brandPrimary} />
          <Text style={styles.noticeText}>
            To protect your rates, changes are applied by your account manager. Tell us what to
            update and we&apos;ll take care of it.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            testID="contract-edit-supplier"
            label="Supplier"
            value={supplier}
            onChangeText={setSupplier}
            placeholder="e.g. British Gas"
            returnKeyType="next"
            onSubmitEditing={() => startRef.current?.focus()}
          />
          <TextField
            testID="contract-edit-start"
            ref={startRef}
            label="Start date"
            value={start}
            onChangeText={setStart}
            placeholder="DD/MM/YYYY"
            returnKeyType="next"
            onSubmitEditing={() => endRef.current?.focus()}
          />
          <TextField
            testID="contract-edit-end"
            ref={endRef}
            label="Contract end date"
            value={end}
            onChangeText={setEnd}
            placeholder="DD/MM/YYYY"
            returnKeyType="done"
          />
          <View style={styles.field}>
            <Text style={styles.label}>Anything else? (optional)</Text>
            <TextInput
              testID="contract-edit-notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any other details for your account manager"
              placeholderTextColor={colors.muted}
              multiline
              style={styles.multiline}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            testID="contract-edit-submit"
            label="Send request"
            icon="paper-plane-outline"
            onPress={submit}
            loading={submitting}
            disabled={!dirty}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noticeText: { flex: 1, fontFamily: font.medium, fontSize: type.base, color: colors.heading, lineHeight: 20 },
  form: { gap: spacing.lg },
  field: { gap: spacing.xs },
  label: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
