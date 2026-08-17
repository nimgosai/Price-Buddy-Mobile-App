import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type Msg = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
};

export default function Support() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<Msg[]>("/concierge/messages");
      setMessages(Array.isArray(res) ? res : []);
      apiRequest("/concierge/messages/mark-read", { method: "POST" }).catch(() => {});
    } catch {
      // keep silent; show empty prompt
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      sender: "customer",
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      await apiRequest("/concierge/messages", { method: "POST", body: { message: body } });
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't send your message.", "error");
      setText(body);
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="support-header"
        title="Support"
        subtitle="Chat with your PriceBuddy team"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="translate-with-padding"
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center} testID="support-loading">
            <ActivityIndicator size="large" color={colors.brandPrimary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            testID="support-thread"
            contentContainerStyle={styles.thread}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.intro} testID="support-empty">
                <View style={styles.introIcon}>
                  <Ionicons name="chatbubbles" size={30} color={colors.brandPrimary} />
                </View>
                <Text style={styles.introTitle}>We&apos;re here to help</Text>
                <Text style={styles.introText}>
                  Ask about a bill, a renewal, or a change to your account. Our team usually
                  replies within one business day.
                </Text>
              </View>
            ) : (
              messages.map((m, i) => {
                const mine = m.sender === "customer";
                return (
                  <View
                    key={m.id}
                    testID={`support-message-${i}`}
                    style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
                  >
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                        {m.body}
                      </Text>
                      <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                        {dayjs(m.created_at).format("HH:mm")}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            testID="support-input"
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={colors.muted}
            multiline
          />
          <Pressable
            testID="support-send"
            onPress={send}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.onBrandPrimary} />
            ) : (
              <Ionicons name="arrow-up" size={22} color={colors.onBrandPrimary} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  thread: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },

  intro: { alignItems: "center", paddingVertical: spacing["2xl"], paddingHorizontal: spacing.lg },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  introTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading },
  introText: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  bubbleRow: { flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.brandPrimary, borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  bubbleText: { fontFamily: font.regular, fontSize: type.lg, color: colors.onSurface, lineHeight: 22 },
  bubbleTextMine: { color: colors.onBrandPrimary },
  bubbleTime: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 4, alignSelf: "flex-end" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.8)" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
