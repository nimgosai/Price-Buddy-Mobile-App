import { useState, useRef } from "react";
import { StyleSheet, Text, View, TextInput, Pressable } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useRouter } from "expo-router";

import { Button, TextField } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { ApiError } from "@/src/api/client";
import { colors, font, spacing, type } from "@/src/theme/theme";

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Enter your email";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email";
    if (!password) next.password = "Enter your password";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Unable to sign in. Please try again.";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing["2xl"] },
        ]}
        bottomOffset={90}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <Image
            source={require("../assets/images/pricebuddy-logo.webp")}
            style={styles.logoImg}
            contentFit="contain"
          />
        </View>

        <Text testID="signin-title" style={styles.title}>
          Sign in
        </Text>
        <Text style={styles.subtitle}>
          Manage your utility contracts, renewals and bills.
        </Text>

        <View style={styles.form}>
          <TextField
            testID="signin-email-input"
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
            error={errors.email}
            placeholder="you@company.co.uk"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextField
            testID="signin-password-input"
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
            }}
            error={errors.password}
            placeholder="Your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            rightIcon={showPassword ? "eye-off" : "eye"}
            onRightIconPress={() => setShowPassword((s) => !s)}
          />

          <Pressable
            testID="signin-forgot-link"
            onPress={() =>
              toast("Password reset is available on the web for now.", "info")
            }
            hitSlop={8}
            style={styles.forgotWrap}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            testID="signin-submit-button"
            label="Sign in"
            onPress={onSubmit}
            loading={submitting}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing["3xl"] },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["2xl"],
  },
  logoImg: { width: 120, height: 100 },
  title: {
    fontFamily: font.bold,
    fontSize: type["3xl"],
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  form: { marginTop: spacing["2xl"], gap: spacing.lg },
  forgotWrap: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  forgotText: {
    fontFamily: font.semibold,
    fontSize: type.base,
    color: colors.brandSecondary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
