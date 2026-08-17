import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/src/components/ui";
import { storage } from "@/src/utils/storage";
import { SEEN_SPLASH_KEY } from "./index";
import { colors, font, spacing, type } from "@/src/theme/theme";

const SLIDES = [
  {
    icon: "scan" as const,
    title: "Snap a bill",
    body: "Take a photo of any utility bill and we read the supplier, rates and dates for you — no typing.",
  },
  {
    icon: "trending-down" as const,
    title: "Better rates",
    body: "Our team shops the market on your behalf to cut what you pay for energy, water and telecoms.",
  },
  {
    icon: "alarm" as const,
    title: "Never miss a renewal",
    body: "We track every contract and flag renewals early, so you never roll onto an expensive tariff.",
  },
];

export default function Splash() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await storage.setItem(SEEN_SPLASH_KEY, true);
    router.replace("/landing");
  };

  const onScroll = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      finish();
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="splash-skip" onPress={finish} hitSlop={10}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]} testID={`splash-slide-${i}`}>
            <View style={styles.iconWrap}>
              <Ionicons name={s.icon} size={72} color={colors.brandPrimary} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button
          testID="splash-next"
          label={index === SLIDES.length - 1 ? "Get started" : "Next"}
          onPress={next}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  top: { paddingHorizontal: spacing.xl, alignItems: "flex-end", paddingBottom: spacing.sm },
  skip: { fontFamily: font.semibold, fontSize: type.base, color: colors.muted },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing["2xl"] },
  iconWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["2xl"],
  },
  title: { fontFamily: font.bold, fontSize: type["3xl"], color: colors.heading, textAlign: "center", letterSpacing: -0.5 },
  body: {
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  bottom: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary },
  dotActive: { width: 24, backgroundColor: colors.brandPrimary },
});
