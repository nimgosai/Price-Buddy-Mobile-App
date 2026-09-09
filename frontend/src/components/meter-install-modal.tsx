import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, IconName } from "@/src/components/icon";
import { Portal } from "@/src/components/portal";
import { apiRequest } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type Opt = { key: string; label: string; icon: IconName; bg: string; fg: string };

const TYPES: Opt[] = [
  { key: "smart_meter", label: "Smart Meter", icon: "meter", bg: colors.pastel.blue, fg: colors.pastel.blueIcon },
  { key: "new_supply", label: "New Supply", icon: "bolt", bg: colors.pastel.yellow, fg: colors.pastel.yellowIcon },
  { key: "upgrade", label: "Upgrade", icon: "arrowUp", bg: colors.pastel.mint, fg: colors.pastel.mintIcon },
  { key: "other", label: "Something else", icon: "chat", bg: colors.pastel.lavender, fg: colors.pastel.lavenderIcon },
];

const FUELS: Opt[] = [
  { key: "electricity", label: "Electricity", icon: "bolt", bg: colors.pastel.yellow, fg: colors.pastel.yellowIcon },
  { key: "gas", label: "Gas", icon: "fire", bg: colors.pastel.peach, fg: colors.pastel.peachIcon },
  { key: "both", label: "Both", icon: "building", bg: colors.pastel.lavender, fg: colors.pastel.lavenderIcon },
];

const CONTACTS = [
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "either", label: "Either" },
];

export function MeterInstallModal({
  visible,
  onClose,
  businessId,
}: {
  visible: boolean;
  onClose: () => void;
  businessId?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const [installType, setInstallType] = useState("smart_meter");
  const [fuel, setFuel] = useState("electricity");
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("phone");
  const [bestTime, setBestTime] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFuel = ["smart_meter", "new_supply", "upgrade"].includes(installType);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const reset = () => {
    setInstallType("smart_meter");
    setFuel("electricity");
    setNotes("");
    setContact("phone");
    setBestTime("");
    setDone(false);
  };

  const close = () => {
    if (sending) return;
    reset();
    onClose();
  };

  const submit = async () => {
    setSending(true);
    try {
      await apiRequest("/meter-installs", {
        method: "POST",
        body: {
          business_id: businessId || null,
          install_type: installType,
          fuel: showFuel ? fuel : null,
          notes: notes.trim() || null,
          preferred_contact: contact,
          best_time: bestTime.trim() || null,
        },
      });
      setDone(true);
      timer.current = setTimeout(() => {
        reset();
        onClose();
      }, 1800);
    } catch {
      // ignore; keep sheet open
    } finally {
      setSending(false);
    }
  };

  return visible ? (
    <Portal>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={styles.backdrop} onPress={close}>
          <KeyboardAvoidingView behavior="padding" style={styles.kav}>
            <Pressable
              style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
              onPress={() => {}}
              testID="meter-install-modal"
            >
            <View style={styles.grabber} />
            {done ? (
              <View style={styles.doneWrap}>
                <View style={styles.doneIcon}>
                  <Icon name="check" size={36} color={colors.pastel.mintIcon} />
                </View>
                <Text style={styles.doneTitle}>Request sent</Text>
                <Text style={styles.doneSub}>Our team will be in touch soon.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                  <View style={[styles.headerIcon, { backgroundColor: colors.pastel.blue }]}>
                    <Icon name="meter" size={22} color={colors.pastel.blueIcon} />
                  </View>
                  <View>
                    <Text style={styles.title}>Meter installation</Text>
                    <Text style={styles.subtitle}>What do you need?</Text>
                  </View>
                </View>

                <View style={styles.typeGrid}>
                  {TYPES.map((t) => {
                    const active = installType === t.key;
                    return (
                      <Pressable
                        key={t.key}
                        testID={`mi-type-${t.key}`}
                        onPress={() => setInstallType(t.key)}
                        style={[styles.typeCard, active && styles.cardActive]}
                      >
                        <View style={[styles.typeIcon, { backgroundColor: t.bg }]}>
                          <Icon name={t.icon} size={18} color={t.fg} />
                        </View>
                        <Text style={styles.typeLabel}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {showFuel && (
                  <>
                    <Text style={styles.mini}>Fuel</Text>
                    <View style={styles.fuelRow}>
                      {FUELS.map((f) => {
                        const active = fuel === f.key;
                        return (
                          <Pressable
                            key={f.key}
                            testID={`mi-fuel-${f.key}`}
                            onPress={() => setFuel(f.key)}
                            style={[styles.fuelCard, active && styles.cardActive]}
                          >
                            <View style={[styles.fuelIcon, { backgroundColor: f.bg }]}>
                              <Icon name={f.icon} size={16} color={f.fg} />
                            </View>
                            <Text style={styles.fuelLabel}>{f.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}

                <Text style={styles.mini}>Notes (optional)</Text>
                <TextInput
                  testID="mi-notes"
                  key={visible ? "mi-notes-open" : "mi-notes-closed"}
                  defaultValue=""
                  onChangeText={setNotes}
                  placeholder="e.g. our smart meter has been faulty for 2 months"
                  placeholderTextColor={colors.muted}
                  multiline
                  style={[styles.input, styles.textarea]}
                />

                <Text style={styles.mini}>Best contact</Text>
                <View style={styles.contactRow}>
                  {CONTACTS.map((c) => {
                    const active = contact === c.key;
                    return (
                      <Pressable
                        key={c.key}
                        testID={`mi-contact-${c.key}`}
                        onPress={() => setContact(c.key)}
                        style={[styles.contactBtn, active && styles.contactBtnActive]}
                      >
                        <Text style={[styles.contactText, active && styles.contactTextActive]}>{c.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.mini}>Best time (optional)</Text>
                <TextInput
                  testID="mi-time"
                  value={bestTime}
                  onChangeText={setBestTime}
                  placeholder="e.g. mornings, after 5pm"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />

                <View style={styles.actions}>
                  <Pressable onPress={close} disabled={sending} style={[styles.btn, styles.btnGhost]}>
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    testID="mi-submit"
                    onPress={submit}
                    disabled={sending}
                    style={[styles.btn, styles.btnPrimary, { flex: 2 }, sending && { opacity: 0.6 }]}
                  >
                    {sending ? (
                      <ActivityIndicator color={colors.onBrandPrimary} />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Send request</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </View>
    </Portal>
  ) : null;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,15,40,0.55)", justifyContent: "flex-end" },
  kav: { width: "100%", flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: spacing.lg,
    maxHeight: "88%",
  },
  grabber: { width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  subtitle: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  typeCard: { width: "48%", borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
  cardActive: { borderWidth: 2, borderColor: colors.heading },
  typeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  typeLabel: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  mini: { fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurfaceSecondary, marginBottom: 6, marginTop: spacing.sm },
  fuelRow: { flexDirection: "row", gap: spacing.sm },
  fuelCard: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingVertical: spacing.md, alignItems: "center", gap: spacing.xs },
  fuelIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fuelLabel: { fontFamily: font.semibold, fontSize: type.sm, color: colors.heading },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  textarea: { height: 96, textAlignVertical: "top" },
  contactRow: { flexDirection: "row", gap: spacing.sm },
  contactBtn: { flex: 1, height: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  contactBtnActive: { borderWidth: 2, borderColor: colors.heading },
  contactText: { fontFamily: font.medium, fontSize: type.base, color: colors.onSurfaceSecondary },
  contactTextActive: { fontFamily: font.semibold, color: colors.heading },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  btn: { flex: 1, height: 50, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  btnGhost: { backgroundColor: colors.surfaceTertiary },
  btnGhostText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurfaceSecondary },
  btnPrimary: { backgroundColor: colors.brandPrimary },
  btnPrimaryText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onBrandPrimary },
  doneWrap: { alignItems: "center", paddingVertical: spacing.xl },
  doneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.pastel.mint, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, marginTop: spacing.md },
  doneSub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 4 },
});
