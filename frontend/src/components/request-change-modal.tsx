import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Icon } from "@/src/components/icon";
import { apiRequest } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const TYPES = [
  { key: "rate_correction", label: "Unit rate / standing charge looks wrong" },
  { key: "renewal", label: "Renewal / end-date question" },
  { key: "site_edit", label: "Site address or meter detail" },
  { key: "general", label: "Something else" },
];

export function RequestChangeModal({
  visible,
  onClose,
  contract,
}: {
  visible: boolean;
  onClose: () => void;
  contract: any;
}) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState("rate_correction");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const close = () => {
    if (sending) return;
    setType("rate_correction");
    setMessage("");
    setDone(false);
    onClose();
  };

  const submit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await apiRequest("/change-requests", {
        method: "POST",
        body: {
          contract_id: contract?.id || contract?._id,
          property_id: contract?.property_id,
          request_type: type,
          message: message.trim(),
        },
      });
      setDone(true);
      timer.current = setTimeout(close, 1800);
    } catch {
      // keep open
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
            onPress={() => {}}
            testID="rc-modal"
          >
            <View style={styles.grabber} />
            {done ? (
              <View style={styles.doneWrap}>
                <Icon name="check" size={44} color={colors.pastel.mintIcon} />
                <Text style={styles.doneTitle}>Submitted for review</Text>
                <Text style={styles.doneSub}>We&apos;ll be in touch within 24 hours.</Text>
              </View>
            ) : (
              <>
                <View style={styles.titleRow}>
                  <Icon name="lock" size={18} color={colors.heading} />
                  <Text style={styles.title}>Request a change</Text>
                </View>
                <Text style={styles.sub}>
                  Tariff details are managed by our team to protect your renewal cycle. Tell us what
                  you&apos;d like updated and we&apos;ll handle it.
                </Text>

                <Text style={styles.mini}>What needs changing?</Text>
                <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
                  {TYPES.map((t) => {
                    const active = type === t.key;
                    return (
                      <Pressable
                        key={t.key}
                        testID={`rc-type-${t.key}`}
                        onPress={() => setType(t.key)}
                        style={[styles.opt, active && styles.optActive]}
                      >
                        <Ionicons
                          name={active ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={active ? colors.brandPrimary : colors.muted}
                        />
                        <Text style={styles.optText}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.mini}>Details</Text>
                <TextInput
                  testID="rc-message"
                  value={message}
                  onChangeText={setMessage}
                  placeholder="e.g. The day rate on my bill is 32.4p but the app shows 28.1p"
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.textarea}
                />

                <View style={styles.actions}>
                  <Pressable onPress={close} disabled={sending} style={[styles.btn, styles.btnGhost]}>
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    testID="rc-submit"
                    onPress={submit}
                    disabled={!message.trim() || sending}
                    style={[styles.btn, styles.btnPrimary, { flex: 2 }, (!message.trim() || sending) && { opacity: 0.5 }]}
                  >
                    {sending ? (
                      <ActivityIndicator color={colors.onBrandPrimary} />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Submit for review</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,15,40,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.lg },
  grabber: { width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  sub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 4, marginBottom: spacing.md, lineHeight: 18 },
  mini: { fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurfaceSecondary, marginBottom: 6 },
  opt: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  optActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  optText: { flex: 1, fontFamily: font.medium, fontSize: type.base, color: colors.heading },
  textarea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  btn: { flex: 1, height: 50, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  btnGhost: { backgroundColor: colors.surfaceTertiary },
  btnGhostText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurfaceSecondary },
  btnPrimary: { backgroundColor: colors.brandPrimary },
  btnPrimaryText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onBrandPrimary },
  doneWrap: { alignItems: "center", paddingVertical: spacing.xl, gap: 6 },
  doneTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: spacing.sm },
  doneSub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted },
});
