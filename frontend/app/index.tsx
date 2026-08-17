import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/auth/auth-context";
import { storage } from "@/src/utils/storage";
import { colors } from "@/src/theme/theme";

export const SEEN_SPLASH_KEY = "uch_seen_splash";

export default function Index() {
  const { user, ready } = useAuth();
  const [seenSplash, setSeenSplash] = useState<boolean | null>(null);

  useEffect(() => {
    storage.getItem<boolean>(SEEN_SPLASH_KEY, false).then((v) => setSeenSplash(!!v));
  }, []);

  if (!ready || seenSplash === null) {
    return (
      <View style={styles.container} testID="boot-loading">
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  if (user) return <Redirect href="/dashboard" />;
  if (!seenSplash) return <Redirect href="/splash" />;
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
