import { Tabs, Redirect } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/auth-context";
import { Icon, IconName } from "@/src/components/icon";
import { colors, font } from "@/src/theme/theme";
import { DESKTOP_COLUMN_WIDTH, desktopTabBarPad, useIsDesktop } from "@/src/utils/use-desktop";

function renderTabIcon(name: IconName) {
  const TabBarIcon = ({ color, size }: { color: ColorValue; size: number }) => (
    <Icon name={name} size={size} color={color as string} />
  );
  TabBarIcon.displayName = `TabIcon(${name})`;
  return TabBarIcon;
}

export default function TabsLayout() {
  const { user, ready } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = useIsDesktop();

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} />;
  if (!user) return <Redirect href="/signin" />;

  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 0);
  // Desktop web only: tabs without a wide layout render in a centred column.
  const column = isDesktop ? { sceneStyle: styles.columnScene } : {};
  const tabPad = desktopTabBarPad(width, isDesktop);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
          ...(isDesktop ? { paddingHorizontal: tabPad } : null),
        },
        tabBarLabelStyle: {
          fontFamily: font.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarIcon: renderTabIcon("home") }} />
      <Tabs.Screen name="sites" options={{ title: "Sites", tabBarIcon: renderTabIcon("building"), ...column }} />
      <Tabs.Screen name="reports" options={{ title: "Reports", tabBarIcon: renderTabIcon("bolt"), ...column }} />
      <Tabs.Screen name="support" options={{ title: "Support", tabBarIcon: renderTabIcon("phone"), ...column }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: renderTabIcon("user"), ...column }} />
      {/* Renewals is reachable from the dashboard card, not a bottom-nav tab */}
      <Tabs.Screen name="renewals" options={{ href: null, ...column }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  columnScene: {
    width: "100%",
    maxWidth: DESKTOP_COLUMN_WIDTH,
    alignSelf: "center",
    backgroundColor: colors.surfaceSecondary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E6E1DA",
  },
});
