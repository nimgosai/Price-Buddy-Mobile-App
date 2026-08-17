import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { colors, font, spacing, type } from "@/src/theme/theme";

const PARAS = [
  "By using Utility Contract Hub you agree to let us manage and track the utility contracts you add or upload, and to contact you about renewals, verifications and quotes.",
  "We act as a broker on your behalf. Any quote we present is an offer for your consideration — you are under no obligation to switch supplier, and rate changes are only made with your agreement.",
  "This app is a mobile front end to your Utility Contract Hub account. Your account, contracts and data are governed by our full terms and conditions.",
];

export default function Terms() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/profile"));

  return (
    <View style={styles.root}>
      <ScreenHeader testID="terms-header" title="Terms" onBack={goBack} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        {PARAS.map((p, i) => (
          <Text key={i} style={styles.para}>{p}</Text>
        ))}
        <Button
          testID="terms-full-link"
          label="Read the full terms"
          icon="open-outline"
          variant="secondary"
          onPress={() => Linking.openURL("https://pricebuddy.co.uk/terms-and-conditions")}
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
