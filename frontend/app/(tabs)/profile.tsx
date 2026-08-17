import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();

  const [email, setEmail] = useState(!!user?.email_notifications_enabled);
  const [push, setPush] = useState(!!user?.push_notifications_enabled);
  const [alertsOptOut, setAlertsOptOut] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await apiRequest<{ alerts_opt_out: boolean }>("/me/alerts");
      setAlertsOptOut(!!res?.alerts_opt_out);
    } catch {
      // ignore
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    setEmail(!!user?.email_notifications_enabled);
    setPush(!!user?.push_notifications_enabled);
  }, [user]);

  const savePrefs = async (nextEmail: boolean, nextPush: boolean, key: string) => {
    setSavingKey(key);
    const prevEmail = email;
    const prevPush = push;
    setEmail(nextEmail);
    setPush(nextPush);
    try {
      await apiRequest("/me/preferences", {
        method: "PUT",
        body: { email_notifications_enabled: nextEmail, push_notifications_enabled: nextPush },
      });
      refreshUser().catch(() => {});
    } catch (e) {
      setEmail(prevEmail);
      setPush(prevPush);
      toast(e instanceof ApiError ? e.message : "Couldn't save your preference.", "error");
    } finally {
      setSavingKey(null);
    }
  };

  const saveAlerts = async (nextOptOut: boolean) => {
    setSavingKey("alerts");
    const prev = alertsOptOut;
    setAlertsOptOut(nextOptOut);
    try {
      await apiRequest("/me/alerts", { method: "PUT", body: { alerts_opt_out: nextOptOut } });
    } catch (e) {
      setAlertsOptOut(prev);
      toast(e instanceof ApiError ? e.message : "Couldn't save your preference.", "error");
    } finally {
      setSavingKey(null);
    }
  };

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiRequest("/me", { method: "DELETE" });
      setConfirmOpen(false);
      toast("Your account has been deleted.", "success");
      await signOut();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't delete your account.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const displayName = user?.full_name || user?.company_name || "Your account";
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  return (
    <View style={styles.root}>
      <ScreenHeader testID="profile-header" title="Profile" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Card testID="profile-account" style={styles.account}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.emailText} numberOfLines={1}>{user?.email}</Text>
          </View>
        </Card>

        {/* Quick links */}
        <Text style={styles.sectionTitle}>Insights</Text>
        <Card style={styles.settingsCard}>
          <Pressable testID="profile-reports-link" onPress={() => router.push("/reports")} style={styles.linkRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="bar-chart-outline" size={20} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Spend reports</Text>
              <Text style={styles.rowSub}>Your annual utility spend</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable testID="profile-news-link" onPress={() => router.push("/news")} style={styles.linkRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="newspaper-outline" size={20} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Industry news</Text>
              <Text style={styles.rowSub}>Latest UK energy updates</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </Card>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.settingsCard}>
          <Row
            testID="toggle-email"
            icon="mail-outline"
            title="Email notifications"
            subtitle="Updates about your bills and account"
            value={email}
            disabled={savingKey === "email"}
            onValueChange={(v) => savePrefs(v, push, "email")}
          />
          <View style={styles.rowDivider} />
          <Row
            testID="toggle-push"
            icon="notifications-outline"
            title="Push notifications"
            subtitle="Alerts on your device"
            value={push}
            disabled={savingKey === "push"}
            onValueChange={(v) => savePrefs(email, v, "push")}
          />
          <View style={styles.rowDivider} />
          <Row
            testID="toggle-alerts"
            icon="alarm-outline"
            title="Renewal reminders"
            subtitle="Emails when a contract is due to renew"
            value={!alertsOptOut}
            disabled={loadingAlerts || savingKey === "alerts"}
            onValueChange={(v) => saveAlerts(!v)}
          />
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            testID="profile-signout-button"
            label="Sign out"
            variant="secondary"
            icon="log-out-outline"
            onPress={signOut}
          />
          <Pressable
            testID="profile-delete-button"
            onPress={() => setConfirmOpen(true)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteText}>Delete my account</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Delete confirmation */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="delete-confirm-sheet">
            <View style={styles.modalIcon}>
              <Ionicons name="warning" size={28} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalText}>
              This permanently removes your account and all your data. This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Button
                testID="delete-cancel"
                label="Cancel"
                variant="secondary"
                onPress={() => setConfirmOpen(false)}
                style={{ flex: 1 }}
              />
              <Pressable
                testID="delete-confirm"
                onPress={deleteAccount}
                disabled={deleting}
                style={[styles.confirmDelete, deleting && { opacity: 0.6 }]}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceTertiary, true: colors.brandPrimary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.md },

  account: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.onBrandPrimary },
  name: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  emailText: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2 },

  sectionTitle: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.heading,
    marginTop: spacing.sm,
  },
  settingsCard: { padding: 0, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontFamily: font.semibold, fontSize: type.lg, color: colors.heading },
  rowSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: colors.divider, marginLeft: spacing.lg + 40 + spacing.md },

  actions: { marginTop: spacing.lg, gap: spacing.lg },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  deleteText: { fontFamily: font.semibold, fontSize: type.base, color: colors.error },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(31,42,68,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: "#FEECEC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, textAlign: "center" },
  modalText: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl, alignSelf: "stretch" },
  confirmDelete: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
});
