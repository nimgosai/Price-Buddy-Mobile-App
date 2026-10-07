import { useState, useRef } from "react";
import { StyleSheet, Text, View, TextInput, Pressable, Keyboard, Platform } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
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
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // On web, browser/password-manager autofill often fills the field WITHOUT
  // firing onChangeText, so React state stays empty. Read the live DOM value
  // as a fallback so an autofilled login still works.
  const liveValue = (ref: React.RefObject<TextInput | null>) => {
    if (Platform.OS !== "web" || !ref.current) return "";
    const node = ref.current as unknown as { value?: string };
    return typeof node.value === "string" ? node.value : "";
  };

  const onSubmit = async () => {
    if (submitting) return;

    const emailVal = (email || liveValue(emailRef)).trim();
    const pwVal = password || liveValue(passwordRef);
    // Keep state in sync so the UI reflects any autofilled values.
    if (emailVal !== email) setEmail(emailVal);
    if (pwVal !== password) setPassword(pwVal);

    const next: { email?: string; password?: string } = {};
    if (!emailVal) next.email = "Enter your email";
    else if (!/^\S+@\S+\.\S+$/.test(emailVal)) next.email = "Enter a valid email";
    if (!pwVal) next.password = "Enter your password";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(emailVal, pwVal);
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
          { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing["2xl"] },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* On web, clicks on the inputs bubble up to this Pressable and
            Keyboard.dismiss() would blur the field just focused, so only
            dismiss on native (where there's an on-screen keyboard). */}
        <Pressable
          style={styles.dismiss}
          onPress={() => {
            if (Platform.OS !== "web") Keyboard.dismiss();
          }}
          accessible={false}
        >
          <View style={styles.brandRow}>
            <Image
              source={require("../assets/images/pricebuddy-logo.webp")}
              style={styles.logoImg}
              contentFit="contain"
            />
          </View>

          <Text testID="signin-title" style={styles.title}>
            Welcome back
          </Text>
          <Text style={styles.subtitle}>
            Sign in to manage your contracts.
          </Text>

          <View style={styles.form}>
            <TextField
              testID="signin-email-input"
              ref={emailRef}
              label="Email"
              boxStyle={styles.inputBox}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              error={errors.email}
              placeholder="you@business.co.uk"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <View>
              <TextField
                testID="signin-password-input"
                ref={passwordRef}
                label="Password"
                boxStyle={styles.inputBox}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                error={errors.password}
                placeholder="Your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                importantForAutofill="yes"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                rightIcon={showPassword ? "eye-off" : "eye"}
                onRightIconPress={() => setShowPassword((s) => !s)}
              />
              <Pressable
                testID="signin-forgot-link"
                onPress={() => router.push("/forgot-password")}
                hitSlop={8}
                style={styles.forgotWrap}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>

          <Button
            testID="signin-submit-button"
            label="Sign in"
            onPress={onSubmit}
            loading={submitting}
            style={styles.submitBtn}
          />

          <Pressable
            testID="signin-signup-link"
            onPress={() => router.push("/signup")}
            hitSlop={8}
            style={styles.signupWrap}
          >
            <Text style={styles.signupText}>
              New here? <Text style={styles.signupTextBold}>Create an account</Text>
            </Text>
          </Pressable>
        </Pressable>
      </KeyboardAwareScrollView>
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
  dismiss: { flex: 1 },
  inputBox: { borderRadius: 12, minHeight: 48 },
  forgotWrap: { alignSelf: "flex-end", paddingVertical: spacing.xs, marginTop: spacing.sm },
  forgotText: {
    fontFamily: font.semibold,
    fontSize: type.base,
    color: colors.brandSecondary,
  },
  submitBtn: { marginTop: spacing.xl },
  signupWrap: { alignSelf: "center", marginTop: spacing.lg, paddingVertical: spacing.sm },
  signupText: { fontFamily: font.regular, fontSize: type.base, color: colors.muted },
  signupTextBold: { fontFamily: font.semibold, color: colors.brandPrimary },
});
