import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { colors, font, spacing, type } from "@/src/theme/theme";

const PARAS = [
  "We take the privacy of your business data seriously. We only collect the information needed to manage your utility contracts — such as your account details, sites, and the bills you upload.",
  "Your data is used to track renewals, verify bills, and find you better deals. We never sell your data. Bill images are stored securely and are only accessible to you and our verification team.",
  "You can update your notification preferences or delete your account and all associated data at any time from the Profile screen.",
];

export default function Privacy() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/profile"));

  return (
    <View style={styles.root}>
      <ScreenHeader testID="privacy-header" title="Privacy" onBack={goBack} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        {PARAS.map((p, i) => (
          <Text key={i} style={styles.para}>{p}</Text>
        ))}
        <Button
          testID="privacy-full-link"
          label="Read the full privacy policy"
          icon="open-outline"
          variant="secondary"
          onPress={() => Linking.openURL("https://pricebuddy.co.uk/privacy-policy")}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.md },
  para: { fontFamily: font.regular, fontSize: type.lg, color: colors.onSurfaceSecondary, lineHeight: 26 },
});
