import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as LocalAuthentication from "expo-local-authentication";

import { Button } from "@/src/components/ui";
import { useAuth } from "@/src/auth/auth-context";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export default function WelcomeBack() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut, markUnlocked } = useAuth();
  const [failed, setFailed] = useState(false);

  const proceed = useCallback(() => {
    markUnlocked();
    router.replace("/dashboard");
  }, [markUnlocked, router]);

  const unlock = useCallback(async () => {
    setFailed(false);
    try {
      if (Platform.OS === "web") {
        proceed();
        return;
      }
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHw || !enrolled) {
        proceed();
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Utility Contract Hub",
        fallbackLabel: "Use passcode",
      });
      if (res.success) proceed();
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, [proceed]);

  useEffect(() => {
    unlock();
  }, [unlock]);

  const name = user?.full_name || user?.company_name || user?.email?.split("@")[0] || "there";

  return (
    <View style={styles.root}>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing["3xl"] }]}>
        <Image source={require("../assets/images/pricebuddy-logo.webp")} style={styles.logo} contentFit="contain" />
        <View style={styles.faceIcon}>
          <Ionicons name="finger-print" size={44} color={colors.brandPrimary} />
        </View>
        <Text testID="welcome-title" style={styles.title}>Welcome back, {name}</Text>
        <Text style={styles.sub}>Unlock to continue to your dashboard.</Text>
      </View>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          testID="welcome-unlock"
          label={failed ? "Try again" : "Unlock"}
          icon="lock-open-outline"
          onPress={unlock}
        />
        <Button
          testID="welcome-signout"
          label="Not you? Sign out"
          variant="ghost"
          onPress={async () => {
            await signOut();
            router.replace("/signin");
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  wrap: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xl },
  logo: { width: 96, height: 80, marginBottom: spacing["2xl"] },
  faceIcon: {
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
  cta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
