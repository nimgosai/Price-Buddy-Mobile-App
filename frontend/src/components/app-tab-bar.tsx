import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Icon, IconName } from "@/src/components/icon";
import { colors, font } from "@/src/theme/theme";

type TabKey = "dashboard" | "sites" | "reports" | "support" | "profile";

const TABS: { key: TabKey; label: string; icon: IconName; route: string }[] = [
  { key: "dashboard", label: "Home", icon: "home", route: "/dashboard" },
  { key: "sites", label: "Sites", icon: "building", route: "/sites" },
  { key: "reports", label: "Reports", icon: "bolt", route: "/reports" },
  { key: "support", label: "Support", icon: "phone", route: "/support" },
  { key: "profile", label: "Profile", icon: "user", route: "/profile" },
];

/**
 * Persistent bottom tab bar mirroring the root Tabs navigator, for use on
 * root-stack detail screens (Site Detail, Contracts) so the bar stays visible
 * while browsing. `active` highlights the parent tab.
 */
export function AppTabBar({ active }: { active?: TabKey }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 0);

  return (
    <View testID="app-tab-bar" style={[styles.bar, { height: 60 + bottomInset, paddingBottom: bottomInset }]}>
      {TABS.map((t) => {
        const on = active === t.key;
        const color = on ? colors.brandPrimary : colors.muted;
        return (
          <Pressable key={t.key} testID={`app-tab-${t.key}`} onPress={() => router.push(t.route as any)} style={styles.item} hitSlop={4}>
            <Icon name={t.icon} size={24} color={color} />
            <Text style={[styles.label, { color }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  label: { fontFamily: font.medium, fontSize: 11 },
});
