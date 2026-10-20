import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@react-native-vector-icons/ionicons";

import { Button, Card } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { useDesktopSheet } from "@/src/desktop/sheet";

export default function ClientOnboarding() {
  const insets = useSafeAreaInsets();
  const dsheet = useDesktopSheet();
  const router = useRouter();
  const toast = useToast();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const [callbackOpen, setCallbackOpen] = useState(false);
  const [cbName, setCbName] = useState("");
  const [cbPhone, setCbPhone] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<any>(`/onboarding/${token}`, { auth: false });
      setMeta(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "This invitation link is invalid or has expired.");
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const uploadBill = async () => {
    if (busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast("Photo access is needed to upload a bill.", "info");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    try {
      const a = result.assets[0];
      const form = new FormData();
      form.append("file", { uri: a.uri, name: a.fileName || "bill.jpg", type: a.mimeType || "image/jpeg" } as any);
      await apiRequest(`/onboarding/${token}/upload-bill`, { method: "POST", auth: false, body: form, timeoutMs: 120000 });
      setDone("Thanks! Your bill has been received. Your accountant's team will take it from here.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Upload failed. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const sendCallback = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiRequest(`/onboarding/${token}/request-callback`, {
        method: "POST",
        auth: false,
        body: { name: cbName.trim(), phone: cbPhone.trim() },
      });
      setCallbackOpen(false);
      setDone("Thanks! We'll call you back shortly to get you set up.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't send your request.", "error");
    } finally {
      setBusy(false);
    }
  };

  const accountant = meta?.accountant_name || meta?.accountant || meta?.firm_name || "your accountant";
  const forwardEmail = meta?.forward_email || "bills@pricebuddy.co.uk";

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <Image source={require("../../assets/images/pricebuddy-logo.webp")} style={styles.logo} contentFit="contain" />

        {loading ? (
          <View style={styles.center} testID="onboarding-loading">
            <ActivityIndicator size="large" color={colors.brandPrimary} />
          </View>
        ) : error ? (
          <Card testID="onboarding-error" style={styles.errorCard}>
            <Ionicons name="link-outline" size={28} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : done ? (
          <View style={styles.doneWrap} testID="onboarding-done">
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>All done</Text>
            <Text style={styles.sub}>{done}</Text>
            <Button label="Close" variant="secondary" onPress={() => router.replace("/landing")} style={{ alignSelf: "stretch", marginTop: spacing.xl }} />
          </View>
        ) : (
          <>
            <Text testID="onboarding-title" style={styles.title}>Get started with {accountant}</Text>
            <Text style={styles.sub}>Choose the easiest way to share your utility bills. It only takes a minute.</Text>

            <Pressable testID="onboarding-upload" onPress={uploadBill} disabled={busy} style={styles.option}>
              <View style={styles.optIcon}><Ionicons name="cloud-upload-outline" size={24} color={colors.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optTitle}>Upload a bill</Text>
                <Text style={styles.optBody}>Pick a photo or PDF of a recent utility bill</Text>
              </View>
              {busy ? <ActivityIndicator color={colors.brandPrimary} /> : <Ionicons name="chevron-forward" size={20} color={colors.muted} />}
            </Pressable>

            <View testID="onboarding-forward" style={styles.option}>
              <View style={styles.optIcon}><Ionicons name="mail-outline" size={24} color={colors.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optTitle}>Forward by email</Text>
                <Text style={styles.optBody}>Send your bills to {forwardEmail}</Text>
              </View>
            </View>

            <Pressable testID="onboarding-callback" onPress={() => setCallbackOpen(true)} style={styles.option}>
              <View style={styles.optIcon}><Ionicons name="call-outline" size={24} color={colors.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optTitle}>Request a callback</Text>
                <Text style={styles.optBody}>We&apos;ll phone you to set everything up</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal visible={callbackOpen} transparent animationType="fade" onRequestClose={() => setCallbackOpen(false)}>
        <View style={[styles.backdrop, dsheet.backdrop]}>
          <View style={[styles.sheet, dsheet.sheet]} testID="callback-sheet">
            <Text style={styles.sheetTitle}>Request a callback</Text>
            <TextInput testID="callback-name" value={cbName} onChangeText={setCbName} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput testID="callback-phone" value={cbPhone} onChangeText={setCbPhone} placeholder="Phone number" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
            <View style={styles.sheetActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setCallbackOpen(false)} style={{ flex: 1 }} />
              <Button testID="callback-send" label="Request call" onPress={sendCallback} loading={busy} disabled={!cbName.trim() || !cbPhone.trim()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  logo: { width: 88, height: 72, alignSelf: "center", marginBottom: spacing.md },
  center: { paddingVertical: spacing["3xl"], alignItems: "center" },
  errorCard: { alignItems: "center", gap: spacing.md },
  errorText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary, textAlign: "center" },
  title: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, textAlign: "center" },
  sub: { fontFamily: font.regular, fontSize: type.lg, color: colors.muted, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.md, lineHeight: 24 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  optIcon: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  optTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  optBody: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2 },
  doneWrap: { alignItems: "center", paddingTop: spacing.xl },
  doneIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.success, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  backdrop: { flex: 1, backgroundColor: "rgba(31,42,68,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  sheetTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading },
  input: { height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontFamily: font.regular, fontSize: type.lg, color: colors.onSurface, backgroundColor: colors.surface },
  sheetActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
});
