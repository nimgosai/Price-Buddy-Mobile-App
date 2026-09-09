import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Global error boundary. Catches unexpected render/runtime errors anywhere in
 * the tree and shows a friendly recovery screen instead of a white screen or a
 * raw stack trace leaking to the user.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Kept minimal; production builds strip console.* via babel.
    if (__DEV__) console.error("Unhandled error caught by ErrorBoundary:", error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          We hit an unexpected problem. Please try again — your data is safe.
        </Text>
        <Pressable
          testID="error-boundary-retry"
          onPress={this.reset}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  title: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, textAlign: "center" },
  body: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  btn: {
    marginTop: spacing.xl,
    height: 50,
    paddingHorizontal: spacing["2xl"],
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onBrandPrimary },
});
