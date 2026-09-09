import { forwardRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";

import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";

/* ---------------- Button ---------------- */
type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  testID?: string;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  iconRight,
  testID,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary"
      ? colors.brandPrimary
      : variant === "secondary"
        ? colors.surface
        : "transparent";
  const fg = variant === "primary" ? colors.onBrandPrimary : colors.onSurface;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "secondary" && styles.btnBordered,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
          {iconRight && <Ionicons name={iconRight} size={18} color={fg} />}
        </View>
      )}
    </Pressable>
  );
}

/* ---------------- TextField ---------------- */
type FieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  testID?: string;
  boxStyle?: ViewStyle;
};

export const TextField = forwardRef<TextInput, FieldProps>(function TextField(
  { label, error, rightIcon, onRightIconPress, testID, style, boxStyle, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.fieldBox,
          focused && styles.fieldBoxFocused,
          !!error && styles.fieldBoxError,
          boxStyle,
        ]}
      >
        <TextInput
          ref={ref}
          testID={testID}
          placeholderTextColor={colors.muted}
          style={[styles.fieldInput, style]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text testID={`${testID}-error`} style={styles.fieldError}>
          {error}
        </Text>
      )}
    </View>
  );
});

/* ---------------- Card ---------------- */
export function Card({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

/* ---------------- StatusPill ---------------- */
export function StatusPill({
  label,
  color,
  testID,
}: {
  label: string;
  color: string;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnBordered: { borderWidth: 1, borderColor: colors.border },
  btnInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  btnText: { fontFamily: font.semibold, fontSize: type.lg },

  fieldWrap: { gap: spacing.xs },
  fieldLabel: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
  },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  fieldBoxFocused: { borderColor: colors.brandPrimary },
  fieldBoxError: { borderColor: colors.error },
  fieldInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
    height: "100%",
  },
  fieldError: { fontFamily: font.regular, fontSize: type.sm, color: colors.error },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontFamily: font.semibold, fontSize: type.sm },
});
