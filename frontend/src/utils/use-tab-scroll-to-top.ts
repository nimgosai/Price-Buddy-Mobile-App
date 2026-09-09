import { useCallback, useRef } from "react";
import { ScrollView } from "react-native";
import { useScrollToTop, useFocusEffect } from "expo-router";

/**
 * Keeps a tab's ScrollView anchored to the top:
 *  - Re-tapping the already-active tab smoothly scrolls back to the top
 *    (via React Navigation's useScrollToTop).
 *  - Switching to another tab and back resets the scroll to the top instantly
 *    (no flash/jitter) when the screen regains focus.
 *
 * Usage: const scrollRef = useTabScrollToTop(); <ScrollView ref={scrollRef} ... />
 */
export function useTabScrollToTop() {
  const ref = useRef<ScrollView>(null);

  // Smooth scroll-to-top when the active tab icon is tapped again.
  useScrollToTop(ref);

  // Jump to the top whenever the tab gains focus (tab switch / back).
  useFocusEffect(
    useCallback(() => {
      ref.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  return ref;
}
