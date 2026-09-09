import { StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";

import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** Sticky, safe-area-aware screen header. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  testID,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            testID="header-back-button"
            onPress={onBack}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name="arrow-back" size={20} color={colors.heading} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  testID,
  children,
}: {
  icon: IoniconName;
  title: string;
  message: string;
  testID?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.empty} testID={testID}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.brandPrimary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMsg}>{message}</Text>
      {children ? <View style={styles.emptyActions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  title: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.heading,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.muted,
    marginTop: 2,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.heading,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptyMsg: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  emptyActions: { alignSelf: "stretch", marginTop: spacing.xl, gap: spacing.md },
});
