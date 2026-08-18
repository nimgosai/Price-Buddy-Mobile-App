import { Tabs, Redirect } from "expo-router";
import { Platform } from "react-native";

import { useAuth } from "@/src/auth/auth-context";
import { Icon, IconName } from "@/src/components/icon";
import { colors, font } from "@/src/theme/theme";

export default function TabsLayout() {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Redirect href="/signin" />;

  const tabIcon =
    (name: IconName) =>
    ({ color, size }: { color: string; size: number }) =>
      <Icon name={name} size={size} color={color} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: font.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="sites" options={{ title: "Sites", tabBarIcon: tabIcon("building") }} />
      <Tabs.Screen name="reports" options={{ title: "Reports", tabBarIcon: tabIcon("bolt") }} />
      <Tabs.Screen name="support" options={{ title: "Support", tabBarIcon: tabIcon("phone") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("user") }} />
      {/* Renewals is reachable from the dashboard card, not a bottom-nav tab */}
      <Tabs.Screen name="renewals" options={{ href: null }} />
    </Tabs>
  );
}
