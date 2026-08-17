import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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

export default function ForgotPassword() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/signin");
  };

  const submit = async () => {
    if (submitting) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        auth: false,
        body: { email: email.trim().toLowerCase() },
      });
      setSent(true);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.root}>
        <ScreenHeader testID="forgot-header" title="Check your email" onBack={goBack} />
        <View style={styles.confirmWrap} testID="forgot-sent">
          <View style={styles.confirmIcon}>
            <Ionicons name="mail-open-outline" size={40} color={colors.brandPrimary} />
          </View>
          <Text style={styles.confirmTitle}>Reset link on its way</Text>
          <Text style={styles.confirmSub}>
            If {email.trim()} is registered, we&apos;ve sent a link to reset your password. Check
            your inbox and spam folder.
          </Text>
          <View style={styles.confirmActions}>
            <Button
              testID="forgot-have-code"
              label="I have a reset code"
              onPress={() => router.replace("/reset-password")}
            />
            <Button
              testID="forgot-back-signin"
              label="Back to sign in"
              variant="secondary"
              onPress={() => router.replace("/signin")}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader testID="forgot-header" title="Forgot password" onBack={goBack} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={90}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Enter the email you use for Utility Contract Hub and we&apos;ll send you a link to reset
          your password.
        </Text>
        <TextField
          testID="forgot-email-input"
          label="Email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (error) setError(null);
          }}
          error={error}
          placeholder="you@company.co.uk"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button testID="forgot-submit" label="Send reset link" onPress={submit} loading={submitting} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  lead: { fontFamily: font.regular, fontSize: type.lg, color: colors.onSurfaceSecondary, lineHeight: 24 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  confirmWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  confirmIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  confirmTitle: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, textAlign: "center" },
  confirmSub: {
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  confirmActions: { alignSelf: "stretch", gap: spacing.md, marginTop: spacing["2xl"] },
});
