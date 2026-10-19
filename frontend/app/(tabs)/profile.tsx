import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { useBusiness } from "@/src/business/business-context";
import { AddBusinessModal } from "@/src/components/add-business-modal";
import { apiRequest, ApiError } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { useTabScrollToTop } from "@/src/utils/use-tab-scroll-to-top";
import { DEMO_MODE_KEY, isDemoEnabled, setDemoEnabled } from "@/src/demo/demo-data";
import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, signOut, refreshUser } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const scrollRef = useTabScrollToTop();

  // Desktop sidebar "Settings" opens Profile at the settings/preferences section.
  const isDesktop = useIsDesktop();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const settingsY = useRef<number | null>(null);
  const scrollToSettings = () => {
    if (section === "settings" && settingsY.current != null) scrollRef.current?.scrollTo({ y: Math.max(0, settingsY.current - 8), animated: true });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToSettings(); }, [section]);

  const [showDelete, setShowDelete] = useState(false);
  const [addBiz, setAddBiz] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [deleteDone, setDeleteDone] = useState(false);

  // Optimistic local toggle state so switches flip instantly and independently.
  const [emailOn, setEmailOn] = useState(user?.email_notifications_enabled ?? true);
  const [pushOn, setPushOn] = useState(user?.push_notifications_enabled ?? false);
  useEffect(() => {
    setEmailOn(user?.email_notifications_enabled ?? true);
    setPushOn(user?.push_notifications_enabled ?? false);
  }, [user?.email_notifications_enabled, user?.push_notifications_enabled]);

  const initials = (user?.full_name || user?.email || "U").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const savePrefs = async (email: boolean, push: boolean) => {
    try {
      await apiRequest("/me/preferences", {
        method: "PUT",
        body: { email_notifications_enabled: email, push_notifications_enabled: push },
      });
      refreshUser().catch(() => {});
    } catch {
      // Revert optimistic change on failure.
      setEmailOn(user?.email_notifications_enabled ?? true);
      setPushOn(user?.push_notifications_enabled ?? false);
      toast("Couldn't update your preferences.", "error");
    }
  };

  const onToggleEmail = (v: boolean) => { setEmailOn(v); savePrefs(v, pushOn); };
  const onTogglePush = (v: boolean) => { setPushOn(v); savePrefs(emailOn, v); };

  const [demoOn, setDemoOn] = useState(isDemoEnabled());
  useEffect(() => {
    storage.getItem<boolean>(DEMO_MODE_KEY, false).then((v) => setDemoOn(!!v));
  }, []);
  const onToggleDemo = async (v: boolean) => {
    setDemoOn(v);
    setDemoEnabled(v);
    await storage.setItem(DEMO_MODE_KEY, v);
    await refreshBusinesses();
    toast(v ? "Demo data on — showing sample data." : "Demo data off.", "success");
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.reload();
    } else {
      router.push("/dashboard");
    }
  };

  const submitDelete = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteErr("Type DELETE to confirm.");
      return;
    }
    setDeleting(true);
    setDeleteErr("");
    try {
      await apiRequest("/change-requests", {
        method: "POST",
        body: { request_type: "account_deletion", message: "Customer requested account deletion from the mobile app." },
      });
      setDeleteDone(true);
    } catch (e) {
      setDeleteErr(e instanceof ApiError ? e.message : "Could not submit. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader testID="profile-header" title="Profile" onBack={() => router.push("/dashboard")} />
      <ScrollView
        ref={scrollRef}
        testID="profile-screen"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.userCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.userName} numberOfLines={1}>{user?.full_name || user?.email}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
            {!!user?.company_name && <Text style={styles.userCompany} numberOfLines={1}>{user.company_name}</Text>}
          </View>
        </View>

        {isDesktop ? (
          <Text
            testID="profile-settings-section"
            style={styles.settingsLabel}
            onLayout={(e) => { settingsY.current = e.nativeEvent.layout.y; scrollToSettings(); }}
          >
            Settings &amp; notifications
          </Text>
        ) : null}

        <ToggleRow
          icon="mail" bg={colors.pastel.yellow} fg={colors.pastel.yellowIcon}
          label="Email alerts"
          description="Renewal emails at 365 / 180 / 90 / 60 / 30 / 21 / 14 / 7 / 3 / 1 days before energy contracts end."
          value={emailOn}
          onChange={onToggleEmail}
          testID="profile-alerts-toggle"
        />
        <ToggleRow
          icon="bell" bg={colors.pastel.peach} fg={colors.pastel.peachIcon}
          label="Phone push notifications"
          description="Get a heads-up on your phone the moment a renewal window opens."
          value={pushOn}
          onChange={onTogglePush}
          testID="profile-push-toggle"
        />

        <LinkRow icon="building" bg={colors.pastel.blue} fg={colors.pastel.blueIcon} label="My sites" onPress={() => router.push("/sites")} testID="profile-sites" />
        <LinkRow icon="plus" bg={colors.pastel.mint} fg={colors.pastel.mintIcon} label="Add a business" onPress={() => setAddBiz(true)} testID="profile-add-business" />
        <LinkRow icon="document" bg={colors.pastel.mint} fg={colors.pastel.mintIcon} label="My quote requests" onPress={() => router.push("/quote/new")} testID="profile-quotes" />
        <LinkRow icon="scan" bg={colors.pastel.peach} fg={colors.pastel.peachIcon} label="Replay product tour" onPress={async () => { await storage.setItem("uch_tour_replay", true); router.push("/dashboard"); }} testID="profile-tour" />
        <LinkRow icon="phone" bg={colors.pastel.lavender} fg={colors.pastel.lavenderIcon} label="Contact support" onPress={() => router.push("/support")} testID="profile-contact" />

        <ToggleRow
          icon="document" bg={colors.pastel.mint} fg={colors.pastel.mintIcon}
          label="Demo data"
          description="Fill the app with sample sites, contracts and spend so you can preview every screen. Doesn't touch your real account."
          value={demoOn}
          onChange={onToggleDemo}
          testID="profile-demo-toggle"
        />

        <Pressable testID="profile-logout" onPress={() => { signOut(); router.replace("/signin"); }} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.9 }]}>
          <Icon name="logout" size={16} color={colors.onSurfaceSecondary} />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>

        <Pressable testID="profile-delete-open" onPress={() => setShowDelete(true)} style={({ pressed }) => [styles.danger, pressed && { opacity: 0.9 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>Request account deletion</Text>
            <Text style={styles.dangerSub}>Permanently remove your account. We may retain some records where required.</Text>
          </View>
          <Icon name="chevronRight" size={16} color={colors.muted} />
        </Pressable>
      </ScrollView>

      <AddBusinessModal visible={addBiz} onClose={() => setAddBiz(false)} onCreated={() => { setAddBiz(false); toast("Business added.", "success"); refreshBusinesses(); }} />

      <Modal visible={showDelete} transparent animationType="slide" onRequestClose={() => setShowDelete(false)}>
        <Pressable style={styles.backdrop} onPress={() => !deleting && setShowDelete(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}} testID="delete-account-sheet">
            <View style={styles.grabber} />
            {deleteDone ? (
              <View style={styles.doneWrap}>
                <Icon name="check" size={40} color={colors.pastel.mintIcon} />
                <Text style={styles.doneTitle}>Request received</Text>
                <Text style={styles.doneSub}>Our team will process your deletion request and confirm by email.</Text>
                <Pressable onPress={() => { setShowDelete(false); setDeleteDone(false); setConfirmText(""); }} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Close</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.mTitle}>Confirm account deletion</Text>
                <Text style={styles.mSub}>Please read carefully before continuing.</Text>
                <Text style={styles.mHead}>What gets deleted</Text>
                {["Your sign-in details and profile.", "All businesses, sites, and meters you've added.", "Contracts, bill scans, quotes, and alerts.", "Concierge message history with our team."].map((t) => (
                  <View key={t} style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>{t}</Text></View>
                ))}
                <Text style={styles.mHead}>What we may retain</Text>
                <Text style={styles.retain}>Some records are retained where UK law or our suppliers require it — typically up to 6 years. These records can no longer be linked back to your login.</Text>
                <Text style={[styles.mHead, { marginTop: spacing.md }]}>Type DELETE to confirm</Text>
                <TextInput
                  testID="profile-delete-input"
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="Type DELETE"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  style={styles.input}
                />
                {!!deleteErr && <Text testID="profile-delete-error" style={styles.err}>{deleteErr}</Text>}
                <View style={styles.mActions}>
                  <Pressable onPress={() => setShowDelete(false)} disabled={deleting} style={[styles.mBtn, styles.mGhost]}>
                    <Text style={styles.mGhostText}>Cancel</Text>
                  </Pressable>
                  <Pressable testID="profile-delete-confirm" onPress={submitDelete} disabled={deleting} style={[styles.mBtn, styles.mDanger, { flex: 2 }, deleting && { opacity: 0.6 }]}>
                    {deleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.mDangerText}>Request deletion</Text>}
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ToggleRow({ icon, bg, fg, label, description, value, onChange, disabled, testID }: {
  icon: IconName; bg: string; fg: string; label: string; description: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; testID?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: bg }]}><Icon name={icon} size={18} color={fg} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <Switch testID={testID} value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.brandPrimary, false: "#D1D5DB" }} thumbColor="#FFFFFF" />
    </View>
  );
}

function LinkRow({ icon, bg, fg, label, onPress, testID }: { icon: IconName; bg: string; fg: string; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}>
      <View style={[styles.rowIcon, { backgroundColor: bg }]}><Icon name={icon} size={18} color={fg} /></View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Icon name="chevronRight" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  settingsLabel: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted, marginTop: spacing.sm, marginLeft: 4 },
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: 10 },
  userCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, ...shadow.card },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.pastel.lavender, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.bold, fontSize: type.xl, color: colors.pastel.lavenderIcon },
  userName: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  userEmail: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  userCompany: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: 4 },

  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, ...shadow.card },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  rowDesc: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2, lineHeight: 16 },

  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.md },
  logoutText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  danger: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  dangerTitle: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  dangerSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },

  backdrop: { flex: 1, backgroundColor: "rgba(20,15,40,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.lg, maxHeight: "88%" },
  grabber: { width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  mTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading },
  mSub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2, marginBottom: spacing.md },
  mHead: { fontFamily: font.bold, fontSize: type.sm, color: colors.heading, marginTop: spacing.sm, marginBottom: 6 },
  bullet: { flexDirection: "row", gap: 8, marginBottom: 4 },
  bulletDot: { fontFamily: font.bold, color: colors.brandPrimary },
  bulletText: { flex: 1, fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, lineHeight: 18 },
  retain: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, lineHeight: 18 },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontFamily: font.semibold, fontSize: type.lg, letterSpacing: 1, color: colors.onSurface, backgroundColor: colors.surface, marginTop: 6 },
  err: { fontFamily: font.medium, fontSize: type.sm, color: colors.error, marginTop: spacing.sm },
  mActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  mBtn: { flex: 1, height: 50, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  mGhost: { backgroundColor: colors.surfaceTertiary },
  mGhostText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurfaceSecondary },
  mDanger: { backgroundColor: "#DC2626" },
  mDangerText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
  doneWrap: { alignItems: "center", paddingVertical: spacing.lg, gap: 6 },
  doneTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: spacing.sm },
  doneSub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, textAlign: "center" },
  doneBtn: { marginTop: spacing.lg, alignSelf: "stretch", height: 50, borderRadius: radius.sm, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
});
