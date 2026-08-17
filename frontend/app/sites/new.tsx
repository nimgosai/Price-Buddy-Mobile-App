import { useRef, useState } from "react";
import { StyleSheet, Text, View, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, TextField } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export default function NewSite() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [errors, setErrors] = useState<{ name?: string; address?: string; postcode?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const addressRef = useRef<TextInput>(null);
  const postcodeRef = useRef<TextInput>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/sites");
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Give this site a name";
    if (!address.trim()) next.address = "Enter the address";
    if (!postcode.trim()) next.postcode = "Enter the postcode";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const message = `Please add a new site.\nName: ${name.trim()}\nAddress: ${address.trim()}\nPostcode: ${postcode.trim()}`;
      await apiRequest("/change-requests", {
        method: "POST",
        body: { message, request_type: "add_site" },
      });
      toast("Sent to your account manager — we'll add this site shortly.", "success");
      goBack();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't send your request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader testID="new-site-header" title="Add a site" onBack={goBack} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={90}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.notice} testID="new-site-notice">
          <Ionicons name="information-circle" size={20} color={colors.brandPrimary} />
          <Text style={styles.noticeText}>
            To protect your rates, your account manager sets up new sites. Send the details
            below and we&apos;ll add it for you.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            testID="new-site-name"
            label="Site name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
            }}
            error={errors.name}
            placeholder="e.g. Head Office"
            returnKeyType="next"
            onSubmitEditing={() => addressRef.current?.focus()}
          />
          <TextField
            testID="new-site-address"
            ref={addressRef}
            label="Address"
            value={address}
            onChangeText={(t) => {
              setAddress(t);
              if (errors.address) setErrors((p) => ({ ...p, address: undefined }));
            }}
            error={errors.address}
            placeholder="Street and town"
            returnKeyType="next"
            onSubmitEditing={() => postcodeRef.current?.focus()}
          />
          <TextField
            testID="new-site-postcode"
            ref={postcodeRef}
            label="Postcode"
            value={postcode}
            onChangeText={(t) => {
              setPostcode(t.toUpperCase());
              if (errors.postcode) setErrors((p) => ({ ...p, postcode: undefined }));
            }}
            error={errors.postcode}
            placeholder="e.g. SW1A 1AA"
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            testID="new-site-submit"
            label="Send request"
            icon="paper-plane-outline"
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
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noticeText: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.heading,
    lineHeight: 20,
  },
  form: { gap: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
