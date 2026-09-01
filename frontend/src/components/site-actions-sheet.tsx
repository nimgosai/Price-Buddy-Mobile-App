import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Icon, IconName } from "@/src/components/icon";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type Action = {
  key: string;
  title: string;
  desc: string;
  icon: IconName;
  bg: string;
  fg: string;
  to: string;
};

const ACTIONS: Action[] = [
  {
    key: "scan",
    title: "Scan a bill",
    desc: "Snap a photo or upload a PDF — we'll handle the rest.",
    icon: "scan",
    bg: colors.pastel.lavender,
    fg: colors.pastel.lavenderIcon,
    to: "/scan",
  },
  {
    key: "quote",
    title: "Get a quote",
    desc: "Market check for a new acquisition or potential switch.",
    icon: "document",
    bg: colors.pastel.mint,
    fg: colors.pastel.mintIcon,
    to: "/quote/new",
  },
  {
    key: "manual",
    title: "Add site manually",
    desc: "No bill? Tell us the address and we'll set it up for you.",
    icon: "building",
    bg: colors.pastel.peach,
    fg: colors.pastel.peachIcon,
    to: "/sites/new",
  },
];

export function SiteActionsSheet({
  visible,
  onClose,
  eyebrow = "Quick actions",
  title = "What would you like to do?",
  cancelLabel = "Cancel",
}: {
  visible: boolean;
  onClose: () => void;
  eyebrow?: string;
  title?: string;
  cancelLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const go = (to: string) => {
    onClose();
    router.push(to as any);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="site-actions-backdrop">
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          onPress={() => {}}
          testID="site-actions-sheet"
        >
          <View style={styles.grabber} />
          <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
          <Text style={styles.title}>{title}</Text>
          <View style={{ gap: spacing.sm }}>
            {ACTIONS.map((a) => (
              <Pressable
                key={a.key}
                testID={`site-actions-${a.key}`}
                onPress={() => go(a.to)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
              >
                <View style={[styles.rowIcon, { backgroundColor: a.bg }]}>
                  <Icon name={a.icon} size={20} color={a.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle}>{a.title}</Text>
                  <Text style={styles.rowDesc}>{a.desc}</Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
          <Pressable testID="site-actions-cancel" onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,15,40,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: spacing.lg,
  },
  grabber: { width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  eyebrow: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.muted, marginBottom: 6 },
  title: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  rowDesc: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: 2, lineHeight: 18 },
  cancel: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.md },
  cancelText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
});
