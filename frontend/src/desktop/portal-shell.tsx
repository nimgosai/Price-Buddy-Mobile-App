import { createRef } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useGlobalSearchParams, usePathname, useRouter, type Href } from "expo-router";

import { useAuth } from "@/src/auth/auth-context";
import { Icon, IconName } from "@/src/components/icon";
import { dt } from "@/src/desktop/tokens";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { greeting } from "@/src/utils/greeting";
import { SIDEBAR_W } from "@/src/utils/use-desktop";
import { useBillCapture } from "@/src/desktop/upload-bill";

/** Measured by the dashboard spotlight tour to highlight "Sites" on desktop. */
export const sidebarSitesRef = createRef<View>();

type NavKey = "home" | "sites" | "reports" | "quotes" | "support" | "profile" | "settings";
const NAV: { key: NavKey; label: string; icon: IconName; href: Href }[] = [
  { key: "home", label: "Home", icon: "home", href: "/dashboard" },
  { key: "sites", label: "Sites", icon: "building", href: "/sites" },
  { key: "reports", label: "Reports", icon: "bolt", href: "/reports" },
  { key: "quotes", label: "Quotes", icon: "document", href: "/quotes" },
  { key: "support", label: "Support", icon: "phone", href: "/support" },
  { key: "profile", label: "Profile", icon: "user", href: "/profile" },
  { key: "settings", label: "Settings", icon: "lock", href: { pathname: "/profile", params: { section: "settings" } } },
];

function activeKey(pathname: string, section?: string): NavKey | null {
  if (/^\/(dashboard|renewals|documents)(\/|$)/.test(pathname)) return "home";
  if (/^\/(sites|contracts)(\/|$)/.test(pathname)) return "sites";
  if (/^\/reports(\/|$)/.test(pathname)) return "reports";
  if (/^\/(quotes|quote)(\/|$)/.test(pathname)) return "quotes";
  if (/^\/support(\/|$)/.test(pathname)) return "support";
  if (/^\/profile(\/|$)/.test(pathname)) return section === "settings" ? "settings" : "profile";
  return null;
}

const initialsOf = (s?: string | null) =>
  (s || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function PortalSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { section } = useGlobalSearchParams<{ section?: string }>();
  const { user, signOut } = useAuth();
  const active = activeKey(pathname, typeof section === "string" ? section : undefined);

  return (
    <View style={styles.sidebar} testID="desktop-sidebar">
      <ScrollView style={styles.sideTop} contentContainerStyle={{ paddingBottom: spacing.md }} showsVerticalScrollIndicator={false}>
      <Pressable testID="sidebar-brand" onPress={() => router.navigate("/dashboard")} style={styles.brand}>
        <Image source={require("../../assets/images/pricebuddy-mark.png")} style={styles.mark} contentFit="contain" />
        <Text style={styles.brandText}>PriceBuddy</Text>
      </Pressable>

      <Text style={styles.navKicker}>Menu</Text>
      <View style={{ gap: 2 }}>
        {NAV.map((n) => {
          const on = active === n.key;
          return (
            <Pressable
              key={n.key}
              ref={n.key === "sites" ? sidebarSitesRef : undefined}
              collapsable={false}
              testID={`sidebar-${n.key}`}
              accessibilityRole="link"
              accessibilityState={{ selected: on }}
              onPress={() => router.navigate(n.href)}
              style={(s: any) => [styles.navItem, s.hovered && !on && styles.navHover, on && styles.navActive]}
            >
              {on ? <View style={styles.navBar} /> : null}
              <Icon name={n.icon} size={18} color={on ? colors.brandPrimary : dt.muted} />
              <Text style={[styles.navText, on && styles.navTextActive]}>{n.label}</Text>
            </Pressable>
          );
        })}
      </View>

      </ScrollView>

      <View style={styles.sideBottom} testID="sidebar-bottom">
      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>Need a hand?</Text>
        <Text style={styles.helpSub}>Mon–Fri · 9am – 4pm UK</Text>
        <Pressable testID="sidebar-call" onPress={() => Linking.openURL("tel:08003689822")} style={(s: any) => [styles.helpBtn, s.hovered && { backgroundColor: "#FFF" }]}>
          <Icon name="phone" size={14} color={colors.brandPrimary} />
          <Text style={styles.helpBtnText}>0800 368 9822</Text>
        </Pressable>
      </View>

      <View style={styles.userRow}>
        <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{initialsOf(user?.full_name || user?.email)}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.userName} numberOfLines={1}>{user?.full_name || user?.email?.split("@")[0]}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
        </View>
        <Pressable
          testID="sidebar-signout"
          accessibilityLabel="Sign out"
          onPress={() => { signOut(); router.replace("/signin"); }}
          style={(s: any) => [styles.iconBtn, s.hovered && styles.navHover]}
        >
          <Icon name="logout" size={16} color={dt.muted} />
        </Pressable>
      </View>
      </View>
    </View>
  );
}

export function PortalTopBar() {
  const router = useRouter();
  const bill = useBillCapture();
  const { user } = useAuth();
  const g = greeting();
  const name = user?.full_name?.trim()?.split(/\s+/)[0] || user?.email?.split("@")[0] || "there";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <View style={styles.topbar} testID="desktop-topbar">
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.greet} numberOfLines={1} testID="topbar-greeting">{g.salutation}, {name}</Text>
        <Text style={styles.date}>{today}</Text>
      </View>
      <Pressable testID="topbar-scan" onPress={() => bill.open()} style={(s: any) => [styles.btnOutline, s.hovered && styles.btnOutlineHover]}>
        <Icon name="document" size={16} color={dt.text} />
        <Text style={styles.btnOutlineText}>Upload bill</Text>
      </Pressable>
      <Pressable testID="topbar-quote" onPress={() => router.push("/quote/new")} style={(s: any) => [styles.btnPrimary, s.hovered && { backgroundColor: colors.brandPrimaryPressed }]}>
        <Icon name="plus" size={16} color="#FFFFFF" />
        <Text style={styles.btnPrimaryText}>Get a quote</Text>
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        testID="topbar-notifications"
        accessibilityLabel="Notification settings"
        onPress={() => router.navigate({ pathname: "/profile", params: { section: "settings" } })}
        style={(s: any) => [styles.iconBtnLg, s.hovered && styles.navHover]}
      >
        <Icon name="bell" size={18} color={dt.body} />
      </Pressable>
      <Pressable testID="topbar-profile" onPress={() => router.navigate("/profile")} style={(s: any) => [styles.profileBtn, s.hovered && styles.navHover]}>
        <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{initialsOf(user?.full_name || user?.email)}</Text></View>
        <Icon name="chevronDown" size={14} color={dt.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: SIDEBAR_W, flexDirection: "column", justifyContent: "space-between", backgroundColor: dt.card, borderRightWidth: 1, borderRightColor: dt.border, paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md },
  sideTop: { flex: 1, minHeight: 0, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  sideBottom: { flexShrink: 0, paddingTop: spacing.md },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.sm, height: 44, marginBottom: spacing.xl },
  mark: { width: 32, height: 32 },
  brandText: { fontFamily: font.bold, fontSize: 19, color: dt.text, letterSpacing: -0.4 },
  navKicker: { fontFamily: font.semibold, fontSize: type.kicker, letterSpacing: 0.8, textTransform: "uppercase", color: "#94A3B8", paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  navItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, height: 40, paddingHorizontal: spacing.md, borderRadius: 8, position: "relative" },
  navHover: { backgroundColor: dt.hover },
  navActive: { backgroundColor: colors.brandTertiary },
  navBar: { position: "absolute", left: -spacing.md, top: 8, bottom: 8, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.brandPrimary },
  navText: { fontFamily: font.medium, fontSize: type.base, color: dt.body },
  navTextActive: { fontFamily: font.semibold, color: colors.brandPrimary },
  helpBox: { backgroundColor: dt.canvas, borderWidth: 1, borderColor: dt.border, borderRadius: 10, padding: spacing.md, gap: 4, marginBottom: spacing.md, overflow: "hidden" },
  helpTitle: { fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
  helpSub: { fontFamily: font.regular, fontSize: type.kicker, color: dt.muted },
  helpBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, marginTop: 6, borderRadius: 8, borderWidth: 1, borderColor: dt.border, justifyContent: "center", backgroundColor: dt.card },
  helpBtnText: { fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: spacing.md, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: dt.border },
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.pastel.lavender, alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontFamily: font.bold, fontSize: type.kicker, color: colors.pastel.lavenderIcon },
  userName: { fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
  userEmail: { fontFamily: font.regular, fontSize: type.kicker, color: dt.muted },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  topbar: { height: 68, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing["2xl"], backgroundColor: dt.card, borderBottomWidth: 1, borderBottomColor: dt.border },
  greet: { fontFamily: font.semibold, fontSize: type.lg, color: dt.text, letterSpacing: -0.2 },
  date: { fontFamily: font.regular, fontSize: type.kicker, color: dt.muted, marginTop: 1 },
  btnOutline: { flexDirection: "row", alignItems: "center", gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: dt.border, backgroundColor: dt.card },
  btnOutlineHover: { backgroundColor: dt.hover },
  btnOutlineText: { fontFamily: font.semibold, fontSize: type.sm, color: dt.text },
  btnPrimary: { flexDirection: "row", alignItems: "center", gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.brandPrimary },
  btnPrimaryText: { fontFamily: font.semibold, fontSize: type.sm, color: "#FFFFFF" },
  divider: { width: 1, height: 28, backgroundColor: dt.border, marginHorizontal: 4 },
  iconBtnLg: { width: 38, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  profileBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingLeft: 4, paddingRight: 8, borderRadius: radius.pill },
});
