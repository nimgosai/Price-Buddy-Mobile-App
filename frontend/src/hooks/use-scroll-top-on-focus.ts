import { useCallback, useRef } from "react";
import { ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * Returns a ScrollView ref that scrolls back to the top when the screen loses
 * focus, so a tab always reopens at the top instead of where it was left.
 */
export function useScrollTopOnFocus() {
  const ref = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      return () => ref.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );
  return ref;
}
