/**
 * Desktop-web overlays (≥1024px only): centred dialogs and right-hand slide-over drawers.
 * Mobile keeps its existing bottom sheets / full screens.
 */
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Icon, IconName } from "@/src/components/icon";
import { Portal } from "@/src/components/portal";
import { dt } from "@/src/desktop/tokens";
import { colors, font, spacing, type } from "@/src/theme/theme";

type HeadProps = {
  testID: string;
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconBg?: string;
  iconColor?: string;
  onClose: () => void;
};

function OverlayHead({ testID, title, subtitle, icon, iconBg, iconColor, onClose }: HeadProps) {
  return (
    <View style={s.head}>
      {icon ? (
        <View style={[s.headIcon, { backgroundColor: iconBg || colors.brandTertiary }]}>
          <Icon name={icon} size={18} color={iconColor || colors.brandPrimary} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      <Pressable
        testID={`${testID}-close`}
        accessibilityLabel="Close"
        onPress={onClose}
        style={(st: any) => [s.closeBtn, st.hovered && { backgroundColor: dt.hover }]}
      >
        <Icon name="close" size={18} color={dt.muted} />
      </Pressable>
    </View>
  );
}

export function DesktopDialog({
  maxWidth = 640, children, footer, ...head
}: HeadProps & { maxWidth?: number; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Portal>
      <View style={s.center}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={head.onClose} accessible={false} />
        <View style={[s.dialog, { maxWidth }]} testID={head.testID}>
          <OverlayHead {...head} />
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={s.footer}>{footer}</View> : null}
        </View>
      </View>
    </Portal>
  );
}

export function SlideOver({
  width = 560, children, footer, ...head
}: HeadProps & { width?: number; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Portal>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={head.onClose} accessible={false} />
        <View style={[s.drawer, { width }]} testID={head.testID}>
          <OverlayHead {...head} />
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body}>
            {children}
          </ScrollView>
          {footer ? <View style={s.footer}>{footer}</View> : null}
        </View>
      </View>
    </Portal>
  );
}

export function DialogButton({
  label, onPress, variant = "primary", disabled, loading, testID, icon,
}: {
  label: string; onPress?: () => void; variant?: "primary" | "ghost" | "success"; disabled?: boolean; loading?: boolean; testID?: string; icon?: IconName;
}) {
  const primary = variant !== "ghost";
  const bg = variant === "success" ? "#065F46" : colors.brandPrimary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={(st: any) => [
        s.btn,
        primary ? { backgroundColor: bg, borderColor: bg } : s.btnGhost,
        st.hovered && !disabled && (primary ? { opacity: 0.92 } : { backgroundColor: dt.hover }),
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? "#FFFFFF" : dt.text} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={15} color={primary ? "#FFFFFF" : dt.text} /> : null}
          <Text style={[s.btnText, { color: primary ? "#FFFFFF" : dt.text }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Form label used inside desktop dialogs. */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export const dialogStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.lg },
  col: { flex: 1, minWidth: 0 },
  input: {
    minHeight: 44, borderWidth: 1, borderColor: dt.border, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 10,
    fontFamily: font.regular, fontSize: type.base, color: dt.text, backgroundColor: dt.card,
  },
  textarea: { height: 120, textAlignVertical: "top" },
});

const s = StyleSheet.create({
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  backdrop: { backgroundColor: "rgba(15,23,42,0.45)" },
  dialog: {
    width: "100%", maxHeight: "90%", backgroundColor: dt.card, borderRadius: 14, borderWidth: 1, borderColor: dt.border, overflow: "hidden",
    boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
  } as object,
  drawer: {
    position: "absolute", top: 0, right: 0, bottom: 0, maxWidth: "100%", backgroundColor: dt.card, borderLeftWidth: 1, borderLeftColor: dt.border,
    boxShadow: "-12px 0 40px rgba(15,23,42,0.18)",
  } as object,
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: dt.border },
  headIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.semibold, fontSize: type.lg, color: dt.text, letterSpacing: -0.2 },
  subtitle: { fontFamily: font.regular, fontSize: type.sm, color: dt.muted, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.xl, gap: spacing.lg },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: dt.border, backgroundColor: dt.canvas },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 40, minWidth: 110, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  btnGhost: { backgroundColor: dt.card, borderColor: dt.border },
  btnText: { fontFamily: font.semibold, fontSize: type.sm },
  label: { fontFamily: font.semibold, fontSize: type.sm, color: dt.body, marginBottom: 6 },
});
