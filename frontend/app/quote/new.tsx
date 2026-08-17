import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const UTILITIES = [
  { key: "electricity", label: "Electricity", icon: "flash" as const },
  { key: "gas", label: "Gas", icon: "flame" as const },
  { key: "water", label: "Water", icon: "water" as const },
  { key: "telecoms", label: "Telecoms", icon: "wifi" as const },
];

export default function QuoteNew() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{
    utility_type?: string;
    contract_id?: string;
    property_id?: string;
    supplier?: string;
  }>();

  const [utility, setUtility] = useState<string>(params.utility_type || "electricity");
  const [message, setMessage] = useState(
    params.supplier ? `I'd like a better deal than my current ${params.supplier} contract.` : "",
  );
  const [submitting, setSubmitting] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/dashboard");
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await apiRequest<{ quote_request_id: string }>("/quotes/request", {
        method: "POST",
        body: {
          utility_type: utility,
          message: message.trim(),
          contract_id: params.contract_id || null,
          property_id: params.property_id || null,
        },
      });
      router.replace(`/quote/success/${res.quote_request_id}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't submit your request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="quote-header"
        title="Get a better deal"
        subtitle="Our team will shop the market for you"
        onBack={goBack}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={90}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Which utility?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {UTILITIES.map((u) => {
            const active = utility === u.key;
            return (
              <Pressable
                key={u.key}
                testID={`quote-utility-${u.key}`}
                onPress={() => setUtility(u.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons
                  name={u.icon}
                  size={16}
                  color={active ? colors.onBrandPrimary : colors.onSurfaceSecondary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{u.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.field}>
          <Text style={styles.label}>Anything we should know? (optional)</Text>
          <TextInput
            testID="quote-message"
            value={message}
            onChangeText={setMessage}
            placeholder="e.g. renewal date, current spend, preferred contract length"
            placeholderTextColor={colors.muted}
            multiline
            style={styles.multiline}
          />
        </View>

        <View style={styles.note}>
          <Ionicons name="shield-checkmark" size={18} color={colors.success} />
          <Text style={styles.noteText}>
            No obligation. We&apos;ll only switch you if it saves you money.
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            testID="quote-submit"
            label="Request quote"
            icon="pricetag-outline"
            onPress={submit}
            loading={submitting}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  label: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  chipsRow: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  chipTextActive: { color: colors.onBrandPrimary },
  field: { marginTop: spacing.sm, gap: spacing.xs },
  multiline: {
    minHeight: 110,
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
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noteText: { flex: 1, fontFamily: font.medium, fontSize: type.base, color: "#065F46" },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
