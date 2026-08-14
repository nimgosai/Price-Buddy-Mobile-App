import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/auth/auth-context";
import { colors } from "@/src/theme/theme";

export default function Index() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={styles.container} testID="boot-loading">
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  return <Redirect href={user ? "/dashboard" : "/signin"} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
