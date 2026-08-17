import { useRef, useState } from "react";
import { StyleSheet, Text, View, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, TextField } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, spacing, type } from "@/src/theme/theme";

export default function ResetPassword() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ token?: string; code?: string }>();

  const [token, setToken] = useState(params.token || params.code || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ token?: string; password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const pwRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/signin");
  };

  const submit = async () => {
    if (submitting) return;
    const next: typeof errors = {};
    if (!token.trim()) next.token = "Enter the code from your email";
    if (password.length < 8) next.password = "Use at least 8 characters";
    if (confirm !== password) next.confirm = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        auth: false,
        body: { token: token.trim(), new_password: password },
      });
      toast("Password updated. Please sign in.", "success");
      router.replace("/signin");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't reset your password.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader testID="reset-header" title="Reset password" onBack={goBack} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={90}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Paste the reset code from your email and choose a new password.
        </Text>
        <TextField
          testID="reset-token-input"
          label="Reset code"
          value={token}
          onChangeText={(t) => {
            setToken(t);
            if (errors.token) setErrors((p) => ({ ...p, token: undefined }));
          }}
          error={errors.token}
          placeholder="Paste your code"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
        />
        <TextField
          testID="reset-password-input"
          ref={pwRef}
          label="New password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
          }}
          error={errors.password}
          placeholder="At least 8 characters"
          secureTextEntry={!show}
          autoCapitalize="none"
          rightIcon={show ? "eye-off" : "eye"}
          onRightIconPress={() => setShow((s) => !s)}
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <TextField
          testID="reset-confirm-input"
          ref={confirmRef}
          label="Confirm password"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
          }}
          error={errors.confirm}
          placeholder="Re-enter your password"
          secureTextEntry={!show}
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button testID="reset-submit" label="Update password" onPress={submit} loading={submitting} />
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
});
