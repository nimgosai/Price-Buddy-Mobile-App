import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Icon } from "@/src/components/icon";
import { DocumentPageCanvas } from "@/src/features/documents/DocumentPageCanvas";
import { documentSigningService as svc } from "@/src/features/documents/service";
import type { ViewOnlyDocument } from "@/src/features/documents/types";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

export default function ViewOnlyDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [doc, setDoc] = useState<ViewOnlyDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null); setDoc(null);
    try {
      setDoc(await svc.getViewDocument(String(id)));
    } catch (e: any) {
      setError(e?.message || "Couldn't open this document.");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const screenW = Dimensions.get("window").width;
  const pageW = Math.min(screenW - spacing.lg * 2, 520);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="view-back" onPress={() => router.back()} hitSlop={10} style={{ width: 24 }}>
          <Icon name="arrowLeft" size={24} color={colors.heading} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{doc?.title ?? "Document"}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>View only · no signature required</Text>
        </View>
        <View style={styles.viewBadge}><Icon name="eye" size={14} color="#475569" /><Text style={styles.viewBadgeText}>View only</Text></View>
      </View>

      {svc.isMock ? <View style={styles.demoBanner}><Text style={styles.demoText}>Demo document — sample content only</Text></View> : null}

      {!doc && !error ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.msgTitle}>Couldn&apos;t open document</Text>
          <Text style={styles.msgSub}>{error}</Text>
          <Pressable testID="view-retry" onPress={load} style={styles.primaryBtn}><Text style={styles.primaryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ alignItems: "center", padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
          {doc!.note ? (
            <View style={styles.noteBox}>
              <Icon name="eye" size={16} color="#475569" />
              <Text style={styles.noteText}>{doc!.note}</Text>
            </View>
          ) : null}
          {doc!.pages.map((pg) => (
            <View key={pg.page}>
              <Text style={styles.pageLabel}>Page {pg.page} of {doc!.pageCount}</Text>
              <DocumentPageCanvas pageSpec={pg} displayWidth={pageW} label={doc!.title} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  headerTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  headerSub: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted },
  viewBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF0F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  viewBadgeText: { fontFamily: font.semibold, fontSize: type.kicker, color: "#475569" },
  demoBanner: { backgroundColor: "#FEF3C7", paddingVertical: spacing.sm },
  demoText: { fontFamily: font.semibold, fontSize: type.sm, color: "#92400E", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  noteBox: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#EEF0F6", borderRadius: radius.sm, padding: spacing.md },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: type.sm, color: colors.onSurface },
  pageLabel: { fontFamily: font.semibold, fontSize: type.kicker, color: colors.muted, marginBottom: 6 },
  msgTitle: { fontFamily: font.bold, fontSize: type.title, color: colors.heading },
  msgSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, textAlign: "center" },
  primaryBtn: { height: 50, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, marginTop: spacing.md },
  primaryText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onBrandPrimary },
});
