import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { apiRequest } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const BENEFITS = [
  { icon: "alarm-outline" as const, text: "Renewal reminders before your contract ends" },
  { icon: "shield-checkmark-outline" as const, text: "Updates when your bill has been verified" },
  { icon: "pricetag-outline" as const, text: "Alerts when we find you a better deal" },
];

export default function PushPrimer() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const enable = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await apiRequest("/me/preferences", {
        method: "PUT",
        body: {
          email_notifications_enabled: user?.email_notifications_enabled ?? true,
          push_notifications_enabled: true,
        },
      });
      refreshUser().catch(() => {});
      toast("Notifications on — we'll keep you posted.", "success");
    } catch {
      // non-blocking
    } finally {
      setSaving(false);
      router.replace("/dashboard");
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing["3xl"] }]}>
        <View style={styles.icon}>
          <Ionicons name="notifications" size={44} color={colors.brandPrimary} />
        </View>
        <Text testID="push-primer-title" style={styles.title}>
          Stay in the loop
        </Text>
        <Text style={styles.sub}>
          Turn on notifications so you never miss a renewal, a verified bill, or a better deal.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon} size={18} color={colors.brandPrimary} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          testID="push-primer-enable"
          label="Enable notifications"
          icon="notifications-outline"
          onPress={enable}
          loading={saving}
        />
        <Button
          testID="push-primer-skip"
          label="Not now"
          variant="ghost"
          onPress={() => router.replace("/dashboard")}
        />
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
  sub: {
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  benefits: { alignSelf: "stretch", gap: spacing.lg, marginTop: spacing["2xl"] },
  benefit: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, fontFamily: font.medium, fontSize: type.base, color: colors.onSurface },
  cta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
