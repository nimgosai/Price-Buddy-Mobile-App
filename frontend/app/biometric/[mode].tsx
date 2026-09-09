import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as LocalAuthentication from "expo-local-authentication";

import { Button } from "@/src/components/ui";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

// Lightweight biometric prompt route. mode: "unlock" | "enable".
export default function Biometric() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");

  const run = useCallback(async () => {
    setStatus("idle");
    try {
      if (Platform.OS === "web") {
        setStatus("ok");
        return;
      }
      const ok = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      if (!ok) {
        setStatus("ok");
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: "Verify it's you" });
      setStatus(res.success ? "ok" : "fail");
    } catch {
      setStatus("fail");
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const done = () => (router.canGoBack() ? router.back() : router.replace("/dashboard"));

  return (
    <View style={styles.root}>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing["3xl"] }]}>
        <View style={styles.icon}>
          <Ionicons name={status === "ok" ? "checkmark" : "finger-print"} size={44} color={status === "ok" ? colors.success : colors.brandPrimary} />
        </View>
        <Text testID="biometric-title" style={styles.title}>
          {mode === "enable" ? "Enable quick unlock" : "Verify it's you"}
        </Text>
        <Text style={styles.sub}>
          {status === "fail" ? "That didn't work — try again." : "Use Face ID or your fingerprint to continue."}
        </Text>
      </View>
      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.lg }]}>
        {status === "ok" ? (
          <Button testID="biometric-continue" label="Continue" onPress={done} />
        ) : (
          <Button testID="biometric-retry" label="Try again" icon="finger-print" onPress={run} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  wrap: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xl },
  icon: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, textAlign: "center" },
  sub: { fontFamily: font.regular, fontSize: type.lg, color: colors.muted, textAlign: "center", marginTop: spacing.sm },
  cta: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
});
