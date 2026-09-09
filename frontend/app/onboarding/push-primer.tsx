import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Notifications from "expo-notifications";
import Ionicons from "@react-native-vector-icons/ionicons";

import { Button } from "@/src/components/ui";
import { useAuth } from "@/src/auth/auth-context";
import { apiRequest } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const BENEFITS = [
  { emoji: "⏰", text: "18-month advance alerts before contracts expire" },
  { emoji: "📄", text: "Instant status updates when bills are verified" },
  { emoji: "🛡️", text: "Zero spam — strictly critical contract & saving alerts" },
];

export default function PushPrimer() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleEnableNotifications = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1. Android 13+ channel requirement
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF6B4A",
        });
      }

      // 2. Request runtime permission on iOS & Android 13+
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });

      // Sync the account preference when the user allows.
      if (status === "granted") {
        apiRequest("/me/preferences", {
          method: "PUT",
          body: {
            email_notifications_enabled: user?.email_notifications_enabled ?? true,
            push_notifications_enabled: true,
          },
        })
          .then(() => refreshUser().catch(() => {}))
          .catch(() => {});
      }
    } catch (error) {
      console.error("Permission error:", error);
    } finally {
      // 3. Proceed to the main app regardless of outcome
      setSaving(false);
      router.replace("/dashboard");
    }
  };

  // Soft decline — go straight to the app without triggering the native prompt.
  const maybeLater = () => router.replace("/dashboard");

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.icon}>
          <Ionicons name="notifications" size={40} color={colors.brandPrimary} />
        </View>

        <Text testID="push-primer-title" style={styles.title}>
          Never miss a contract renewal
        </Text>
        <Text style={styles.sub}>
          Avoid expensive out-of-contract rates and get alerted the moment lower tariffs become available.
        </Text>

        {/* Simulated notification banner */}
        <View style={styles.notifCard} testID="push-primer-preview">
          <View style={styles.notifHeader}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.notifAppIcon}
              contentFit="cover"
            />
            <Text style={styles.notifMeta}>Price Buddy • 2m ago</Text>
          </View>
          <Text style={styles.notifTitle}>⚡ Contract renewal window open</Text>
          <Text style={styles.notifBody}>
            Lock in lower rates today to prevent out-of-contract price hikes.
          </Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitEmoji}>{b.emoji}</Text>
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          testID="push-primer-enable"
          label="Turn On Renewal Alerts"
          iconRight="arrow-forward"
          onPress={handleEnableNotifications}
          loading={saving}
        />
        <Button
          testID="push-primer-skip"
          label="Maybe later"
          variant="ghost"
          onPress={maybeLater}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { alignItems: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  icon: {
    width: 84,
    height: 84,
    borderRadius: radius.lg,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, textAlign: "center", letterSpacing: -0.4 },
  sub: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },

  notifCard: {
    alignSelf: "stretch",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  notifHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  notifAppIcon: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.surface },
  notifMeta: { fontFamily: font.semibold, fontSize: type.kicker, color: colors.muted, letterSpacing: 0.2 },
  notifTitle: { fontFamily: font.bold, fontSize: type.title, color: colors.heading },
  notifBody: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: 3, lineHeight: 18 },

  benefits: { alignSelf: "stretch", gap: spacing.md, marginTop: spacing.xl },
  benefit: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitEmoji: { fontSize: 18 },
  benefitText: { flex: 1, fontFamily: font.medium, fontSize: type.base, color: colors.onSurface, lineHeight: 20 },

  cta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
