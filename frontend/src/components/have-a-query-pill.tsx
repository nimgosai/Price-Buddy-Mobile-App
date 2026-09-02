import { useState } from "react";
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

import { Icon } from "@/src/components/icon";
import { apiRequest } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export function HaveAQueryPill() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const close = () => {
    if (sending) return;
    setOpen(false);
    setSuccess(false);
    setText("");
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await apiRequest("/concierge/messages", { method: "POST", body: { message: body.slice(0, 2000) } });
      setText("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Pressable
        testID="talk-to-human"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.pill, pressed && { opacity: 0.9 }]}
      >
        <Icon name="chat" size={16} color="#7C3AED" />
        <Text style={styles.pillText}>
          Have a query? Chat with our team <Text>👋</Text>
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
            <Pressable
              style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
              onPress={() => {}}
              testID="concierge-sheet"
            >
              <View style={styles.grabber} />
              {success ? (
                <View style={styles.doneWrap}>
                  <Icon name="check" size={40} color={colors.pastel.mintIcon} />
                  <Text style={styles.doneTitle}>Message sent</Text>
                  <Text style={styles.doneSub}>Our team usually replies within one business day.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.titleRow}>
                    <Icon name="chat" size={18} color={colors.heading} />
                    <Text style={styles.title}>Message us directly</Text>
                  </View>
                  <Text style={styles.sub}>
                    Ask about a bill, a renewal, or a change to your account — we&apos;ll get back to you.
                  </Text>
                  <TextInput
                    testID="concierge-input"
                    value={text}
                    onChangeText={setText}
                    placeholder="Type your message…"
                    placeholderTextColor={colors.muted}
                    multiline
                    style={styles.textarea}
                  />
                  <View style={styles.actions}>
                    <Pressable onPress={close} disabled={sending} style={[styles.btn, styles.btnGhost]}>
                      <Text style={styles.btnGhostText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      testID="concierge-send"
                      onPress={send}
                      disabled={!text.trim() || sending}
                      style={[styles.btn, styles.btnPrimary, { flex: 2 }, (!text.trim() || sending) && { opacity: 0.5 }]}
                    >
                      {sending ? (
                        <ActivityIndicator color={colors.onBrandPrimary} />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Send message</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "stretch",
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#E9E5FF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  pillText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.heading },

  backdrop: { flex: 1, backgroundColor: "rgba(20,15,40,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.lg },
  grabber: { width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  sub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 4, marginBottom: spacing.md, lineHeight: 18 },
  textarea: {
    minHeight: 110,
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
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, height: 50, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  btnGhost: { backgroundColor: colors.surfaceTertiary },
  btnGhostText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurfaceSecondary },
  btnPrimary: { backgroundColor: colors.brandPrimary },
  btnPrimaryText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onBrandPrimary },
  doneWrap: { alignItems: "center", paddingVertical: spacing.xl, gap: 6 },
  doneTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: spacing.sm },
  doneSub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted },
});
