import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

// Mirrors the original web app's `hu-cta-shimmer`: a light band that sweeps
// across the CTA on a loop. Parent must set overflow: "hidden".
export function CtaShimmer({ width = 240 }: { width?: number }) {
  const x = useRef(new Animated.Value(-60)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: width + 60, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(2400),
        Animated.timing(x, { toValue: -60, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [x, width]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.band,
        { transform: [{ translateX: x }, { rotate: "18deg" }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  band: {
    position: "absolute",
    top: -14,
    bottom: -14,
    width: 34,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
});
