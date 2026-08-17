import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/auth/auth-context";
import { storage } from "@/src/utils/storage";
import { colors } from "@/src/theme/theme";

export const SEEN_SPLASH_KEY = "uch_seen_splash";
export const BIOMETRIC_KEY = "uch_biometric_enabled";

export default function Index() {
  const { user, ready, unlocked } = useAuth();
  const [flags, setFlags] = useState<{ splash: boolean; biometric: boolean } | null>(null);

  useEffect(() => {
    Promise.all([
      storage.getItem<boolean>(SEEN_SPLASH_KEY, false),
      storage.getItem<boolean>(BIOMETRIC_KEY, false),
    ]).then(([splash, biometric]) => setFlags({ splash: !!splash, biometric: !!biometric }));
  }, []);

  if (!ready || flags === null) {
    return (
      <View style={styles.container} testID="boot-loading">
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  if (user) {
    if (flags.biometric && !unlocked) return <Redirect href="/welcome-back" />;
    return <Redirect href="/dashboard" />;
  }
  if (!flags.splash) return <Redirect href="/splash" />;
  return <Redirect href="/landing" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
