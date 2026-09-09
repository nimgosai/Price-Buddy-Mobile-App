import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";

import { Button, TextField } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export default function ConfirmDevice() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { completeSession } = useAuth();
  const params = useLocalSearchParams<{ token?: string; code?: string }>();

  const [token, setToken] = useState(params.token || params.code || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const autoTried = useRef(false);

  const confirm = async (value: string) => {
    if (submitting) return;
    if (!value.trim()) {
      setError("Enter the code from your email");
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiRequest<{ token: string }>("/auth/confirm-device", {
        method: "POST",
        auth: false,
        body: { token: value.trim() },
      });
      if (data?.token) {
        await completeSession(data.token);
        router.replace("/dashboard");
      } else {
        toast("Device confirmed. Please sign in.", "success");
        router.replace("/signin");
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't confirm this device.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // If a token arrives via deep link, confirm automatically once.
  useEffect(() => {
    const t = params.token || params.code;
    if (t && !autoTried.current) {
      autoTried.current = true;
      confirm(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token, params.code]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/signin"));

  return (
    <View style={styles.root}>
      <ScreenHeader testID="confirm-device-header" title="Confirm this device" onBack={goBack} />
      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} bottomOffset={90} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <Ionicons name="phone-portrait-outline" size={40} color={colors.brandPrimary} />
        </View>
        <Text style={styles.lead}>
          For your security, we sent a confirmation link to your email. Open it on this device, or
          paste the code below to finish signing in.
        </Text>
        <TextField
          testID="confirm-device-input"
          label="Confirmation code"
          value={token}
          onChangeText={(t) => {
            setToken(t);
            if (error) setError(null);
          }}
          error={error}
          placeholder="Paste your code"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => confirm(token)}
        />
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button testID="confirm-device-submit" label="Confirm device" onPress={() => confirm(token)} loading={submitting} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: spacing.md,
  },
  lead: { fontFamily: font.regular, fontSize: type.lg, color: colors.onSurfaceSecondary, lineHeight: 24, textAlign: "center" },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
