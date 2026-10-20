/** Desktop-web two-panel layout for sign-in / sign-up (≥1024px only). */
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { Icon, IconName } from "@/src/components/icon";
import { colors, font, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";

const POINTS: { icon: IconName; title: string; sub: string }[] = [
  { icon: "bell", title: "Never miss a renewal", sub: "Every contract end date tracked, with alerts well in advance." },
  { icon: "pound", title: "Compare & lock in better rates", sub: "Scan a bill and we'll check it against today's market tariffs." },
  { icon: "document", title: "Sign documents online", sub: "Review and sign LOAs and contracts securely in minutes." },
];

export function DesktopAuthSplit({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <>{children}</>;
  return (
    <View style={s.root} testID="auth-split">
      <View style={s.brand}>
        <View style={s.glowA} />
        <View style={s.glowB} />
        <View style={s.brandRow}>
          <Image source={require("../../assets/images/pricebuddy-mark.png")} style={s.mark} contentFit="contain" />
          <Text style={s.brandName}>PriceBuddy</Text>
        </View>
        <View style={{ gap: spacing.xl, maxWidth: 480 }}>
          <Text style={s.headline}>Your business utilities, finally under control.</Text>
          <Text style={s.lead}>One portal for every site, contract and renewal — so you always pay the right price.</Text>
          <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
            {POINTS.map((p) => (
              <View key={p.title} style={s.point}>
                <View style={s.pointIcon}><Icon name={p.icon} size={16} color="#FFFFFF" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pointTitle}>{p.title}</Text>
                  <Text style={s.pointSub}>{p.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <Text style={s.foot}>Trusted by UK businesses · Mon–Fri support 9am – 4pm</Text>
      </View>
      <View style={s.formSide}>
        <View style={s.formInner}>{children}</View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: "#FFFFFF" },
  brand: { flex: 1, backgroundColor: "#1A1F36", padding: 56, justifyContent: "space-between", overflow: "hidden" },
  glowA: { position: "absolute", width: 520, height: 520, borderRadius: 260, backgroundColor: colors.brandPrimary, opacity: 0.18, top: -180, right: -160 },
  glowB: { position: "absolute", width: 380, height: 380, borderRadius: 190, backgroundColor: "#7C3AED", opacity: 0.14, bottom: -140, left: -120 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  mark: { width: 40, height: 40 },
  brandName: { fontFamily: font.bold, fontSize: 22, color: "#FFFFFF", letterSpacing: -0.4 },
  headline: { fontFamily: font.bold, fontSize: 38, lineHeight: 46, color: "#FFFFFF", letterSpacing: -1 },
  lead: { fontFamily: font.regular, fontSize: type.lg, lineHeight: 24, color: "rgba(255,255,255,0.75)" },
  point: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  pointIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  pointTitle: { fontFamily: font.semibold, fontSize: type.base, color: "#FFFFFF" },
  pointSub: { fontFamily: font.regular, fontSize: type.sm, color: "rgba(255,255,255,0.65)", marginTop: 2, lineHeight: 19 },
  foot: { fontFamily: font.regular, fontSize: type.kicker, color: "rgba(255,255,255,0.5)" },
  formSide: { width: "46%", minWidth: 480, maxWidth: 640, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  formInner: { flex: 1, width: "100%", maxWidth: 480 },
});
