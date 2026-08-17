import { useCallback, useEffect, useRef, useState } from "react";
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

type Resource = {
  id: string;
  title: string;
  description: string;
  category?: string;
  content?: string;
  estimated_read_time?: string;
};

export default function Support() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const [tab, setTab] = useState<"chat" | "help">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeResource, setActiveResource] = useState<Resource | null>(null);
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
    apiRequest<{ resources: Resource[] }>("/support/resources")
      .then((r) => setResources(Array.isArray(r?.resources) ? r.resources : []))
      .catch(() => {});
  }, []);

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
        subtitle={tab === "chat" ? "Chat with your PriceBuddy team" : "Bill & renewal FAQs"}
      />
      <View style={styles.segment}>
        <Pressable
          testID="support-tab-chat"
          onPress={() => setTab("chat")}
          style={[styles.segBtn, tab === "chat" && styles.segBtnActive]}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={16}
            color={tab === "chat" ? colors.onBrandPrimary : colors.onSurfaceSecondary}
          />
          <Text style={[styles.segText, tab === "chat" && styles.segTextActive]}>Chat</Text>
        </Pressable>
        <Pressable
          testID="support-tab-help"
          onPress={() => setTab("help")}
          style={[styles.segBtn, tab === "help" && styles.segBtnActive]}
        >
          <Ionicons
            name="help-buoy-outline"
            size={16}
            color={tab === "help" ? colors.onBrandPrimary : colors.onSurfaceSecondary}
          />
          <Text style={[styles.segText, tab === "help" && styles.segTextActive]}>Help centre</Text>
        </Pressable>
      </View>

      {tab === "chat" ? (
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
      ) : (
        <ScrollView
          testID="support-help-list"
          contentContainerStyle={[styles.helpList, { paddingBottom: insets.bottom + spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
        >
          {resources.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.brandPrimary} />
            </View>
          ) : (
            resources.map((r, i) => (
              <Pressable
                key={r.id || i}
                testID={`help-resource-${i}`}
                onPress={() => setActiveResource(r)}
                style={({ pressed }) => [styles.helpCard, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.helpIcon}>
                  <Ionicons name="document-text-outline" size={20} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  {r.category ? <Text style={styles.helpCat}>{r.category.toUpperCase()}</Text> : null}
                  <Text style={styles.helpTitle} numberOfLines={2}>{r.title}</Text>
                  <Text style={styles.helpDesc} numberOfLines={2}>{r.description}</Text>
                  {r.estimated_read_time ? (
                    <Text style={styles.helpMeta}>{r.estimated_read_time} read</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Resource detail */}
      <Modal
        visible={!!activeResource}
        animationType="slide"
        onRequestClose={() => setActiveResource(null)}
      >
        <View style={styles.root}>
          <ScreenHeader
            testID="help-detail-header"
            title={activeResource?.title || "Article"}
            onBack={() => setActiveResource(null)}
          />
          <ScrollView
            testID="help-detail-body"
            contentContainerStyle={[styles.detailBody, { paddingBottom: insets.bottom + spacing["2xl"] }]}
            showsVerticalScrollIndicator={false}
          >
            {(activeResource?.content || activeResource?.description || "")
              .split("\n")
              .map((line, i) => {
                const t = line.trim();
                if (!t) return <View key={i} style={{ height: spacing.sm }} />;
                if (t.startsWith("## "))
                  return <Text key={i} style={styles.mdH2}>{t.replace(/^##\s+/, "")}</Text>;
                if (t.startsWith("# "))
                  return <Text key={i} style={styles.mdH1}>{t.replace(/^#\s+/, "")}</Text>;
                const bullet = /^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t);
                const clean = t.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").replace(/\*\*/g, "");
                return (
                  <View key={i} style={styles.mdRow}>
                    {bullet ? <Text style={styles.mdBullet}>•</Text> : null}
                    <Text style={styles.mdText}>{clean}</Text>
                  </View>
                );
              })}
          </ScrollView>
        </View>
      </Modal>
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

  segment: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  segBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  segBtnActive: { backgroundColor: colors.brandPrimary },
  segText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  segTextActive: { color: colors.onBrandPrimary },

  helpList: { padding: spacing.lg, gap: spacing.md },
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  helpCat: { fontFamily: font.semibold, fontSize: 10, color: colors.brandPrimary, letterSpacing: 0.5 },
  helpTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: 2 },
  helpDesc: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginTop: 2, lineHeight: 18 },
  helpMeta: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: spacing.xs },

  detailBody: { padding: spacing.lg },
  mdH1: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, marginTop: spacing.md, marginBottom: spacing.xs },
  mdH2: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginTop: spacing.md, marginBottom: spacing.xs },
  mdRow: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  mdBullet: { fontFamily: font.bold, fontSize: type.lg, color: colors.brandPrimary, lineHeight: 22 },
  mdText: { flex: 1, fontFamily: font.regular, fontSize: type.lg, color: colors.onSurface, lineHeight: 24 },
});
