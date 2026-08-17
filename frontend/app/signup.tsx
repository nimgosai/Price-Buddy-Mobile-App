import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, TextInput } from "react-native";
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
import { useAuth } from "@/src/auth/auth-context";
import { ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const BUSINESS_TYPES = [
  { key: "limited_company", label: "Limited company" },
  { key: "sole_trader", label: "Sole trader" },
  { key: "partnership", label: "Partnership" },
  { key: "charity", label: "Charity" },
];

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { signUp } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [businessType, setBusinessType] = useState("limited_company");
  const [companyName, setCompanyName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/signin");
  };

  const validateStep1 = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email";
    if (password.length < 8) next.password = "Use at least 8 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onNext = () => {
    if (validateStep1()) setStep(2);
  };

  const submit = async () => {
    if (submitting) return;
    if (!companyName.trim()) {
      setErrors({ companyName: "Enter your business name" });
      return;
    }
    setSubmitting(true);
    try {
      await signUp({
        email,
        password,
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        business_type: businessType,
      });
      router.replace("/onboarding/push-primer");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't create your account.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="signup-header"
        title="Create account"
        subtitle={`Step ${step} of 2`}
        onBack={goBack}
      />

      {step === 1 ? (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scroll}
          bottomOffset={90}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>Tell us who you are.</Text>
          <TextField
            testID="signup-name-input"
            label="Full name"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              if (errors.fullName) setErrors((p) => ({ ...p, fullName: "" }));
            }}
            error={errors.fullName}
            placeholder="Jane Smith"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <TextField
            testID="signup-email-input"
            ref={emailRef}
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors((p) => ({ ...p, email: "" }));
            }}
            error={errors.email}
            placeholder="you@company.co.uk"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => pwRef.current?.focus()}
          />
          <TextField
            testID="signup-password-input"
            ref={pwRef}
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors((p) => ({ ...p, password: "" }));
            }}
            error={errors.password}
            placeholder="At least 8 characters"
            secureTextEntry={!show}
            autoCapitalize="none"
            rightIcon={show ? "eye-off" : "eye"}
            onRightIconPress={() => setShow((s) => !s)}
            returnKeyType="go"
            onSubmitEditing={onNext}
          />
        </KeyboardAwareScrollView>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scroll}
          bottomOffset={90}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>About your business.</Text>
          <Text style={styles.label}>Business type</Text>
          <View style={styles.typeGrid}>
            {BUSINESS_TYPES.map((b) => {
              const active = businessType === b.key;
              return (
                <Pressable
                  key={b.key}
                  testID={`signup-type-${b.key}`}
                  onPress={() => setBusinessType(b.key)}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                >
                  {active && <Ionicons name="checkmark-circle" size={16} color={colors.brandPrimary} />}
                  <Text style={[styles.typeText, active && styles.typeTextActive]}>{b.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.field}>
            <TextField
              testID="signup-company-input"
              label="Business name"
              value={companyName}
              onChangeText={(t) => {
                setCompanyName(t);
                if (errors.companyName) setErrors((p) => ({ ...p, companyName: "" }));
              }}
              error={errors.companyName}
              placeholder="e.g. Doe Trading Ltd"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </View>
        </KeyboardAwareScrollView>
      )}

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          {step === 1 ? (
            <Button testID="signup-next" label="Continue" onPress={onNext} />
          ) : (
            <Button testID="signup-submit" label="Create account" onPress={submit} loading={submitting} />
          )}
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  lead: { fontFamily: font.regular, fontSize: type.lg, color: colors.onSurfaceSecondary },
  label: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  typeText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  typeTextActive: { color: colors.brandPrimary },
  field: { marginTop: spacing.sm },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
