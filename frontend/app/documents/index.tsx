import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { Icon } from "@/src/components/icon";
import { documentSigningService as svc } from "@/src/features/documents/service";
import type { DocumentFilter, DocumentStatus, DocumentSummary } from "@/src/features/documents/types";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const FILTERS: { key: DocumentFilter; label: string }[] = [
  { key: "all", label: "All documents" },
  { key: "needs_signature", label: "Needs signature" },
  { key: "completed", label: "Completed" },
];

const STATUS_META: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  awaiting_signature: { label: "Awaiting signature", color: "#B45309", bg: "#FEF3C7" },
  processing: { label: "Processing", color: "#1D4ED8", bg: "#DBEAFE" },
  completed: { label: "Completed", color: "#047857", bg: "#D1FAE5" },
  expired: { label: "Expired", color: "#6B7280", bg: "#F3F4F6" },
  cancelled: { label: "Cancelled", color: "#6B7280", bg: "#F3F4F6" },
  needs_attention: { label: "Needs attention", color: "#B91C1C", bg: "#FEE2E2" },
  available: { label: "View only", color: "#475569", bg: "#EEF0F6" },
};

const TYPE_LABEL = { loa: "LOA", supplier_contract: "Supplier contract", quote: "Quote", bill: "Bill", other: "Other" };

export default function MyDocuments() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<DocumentFilter>("all");

  const load = useCallback(async () => {
    setError(false);
    setDocs(null);
    try {
      setDocs(await svc.listDocuments());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { if (docs) svc.listDocuments().then(setDocs).catch(() => {}); }, [docs]));

  const filtered = (docs ?? []).filter((d) => {
    if (filter === "needs_signature") return d.status === "awaiting_signature" || d.status === "needs_attention";
    if (filter === "completed") return d.status === "completed";
    return true;
  });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="docs-back" onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Icon name="arrowLeft" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>My Documents</Text>
        <View style={{ width: 24 }} />
      </View>

      {svc.isMock ? (
        <View style={styles.demoBanner} testID="demo-banner">
          <Text style={styles.demoText}>Demo signing — not a live signed document</Text>
        </View>
      ) : null}

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            testID={`filter-${f.key}`}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {docs === null && !error ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Couldn&apos;t load your documents</Text>
          <Pressable testID="docs-retry" onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Icon name="document" size={40} color={colors.muted} />
          <Text style={styles.emptyTitle}>No documents here yet</Text>
          <Text style={styles.emptySub}>Documents your account manager sends will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
          {filtered.map((d) => (
            <DocRow key={d.id} doc={d} onPress={() => openDoc(router, d)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function openDoc(router: ReturnType<typeof useRouter>, d: DocumentSummary) {
  if (d.status === "available") return router.push(`/documents/${d.id}/view`);
  if (d.status === "completed" || d.status === "processing" || d.status === "needs_attention")
    return router.push(`/documents/${d.signingRequestId}/status`);
  if (d.status === "awaiting_signature")
    return router.push(`/documents/${d.signingRequestId}/review`);
  // expired / cancelled -> status screen (read-only explanation)
  return router.push(`/documents/${d.signingRequestId ?? d.id}/status`);
}

function actionLabel(s: DocumentStatus): string {
  switch (s) {
    case "awaiting_signature": return "Review and sign";
    case "needs_attention": return "Check progress";
    case "processing": return "Check progress";
    case "completed": return "View signed document";
    case "expired": return "View status";
    case "cancelled": return "View status";
    case "available": return "View document";
    default: return "View document";
  }
}

function DocRow({ doc, onPress }: { doc: DocumentSummary; onPress: () => void }) {
  const sm = STATUS_META[doc.status];
  return (
    <Pressable testID={`doc-${doc.id}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}>
      <View style={styles.cardHead}>
        <View style={styles.docIcon}><Icon name="document" size={20} color="#7C3AED" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.docTitle} numberOfLines={2}>{doc.title}</Text>
          <Text style={styles.docMeta}>{TYPE_LABEL[doc.type]} · {doc.businessName}</Text>
          {doc.siteLabel ? <Text style={styles.docMeta}>{doc.siteLabel}</Text> : null}
          <Text style={styles.docDate}>Issued {new Date(doc.dateIssued).toLocaleDateString("en-GB")}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: sm.bg }]}>
          <Text style={[styles.badgeText, { color: sm.color }]}>{sm.label}</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <Text style={styles.actionText}>{actionLabel(doc.status)}</Text>
        <Icon name="chevronRight" size={18} color={colors.brandPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backBtn: { width: 24 },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  demoBanner: { backgroundColor: "#FEF3C7", paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  demoText: { fontFamily: font.semibold, fontSize: type.sm, color: "#92400E", textAlign: "center" },
  filters: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm, flexWrap: "wrap" },
  chip: { paddingHorizontal: spacing.md, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  chipText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurfaceSecondary },
  chipTextActive: { color: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading, marginTop: spacing.sm },
  emptySub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, textAlign: "center" },
  retryBtn: { marginTop: spacing.md, height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  retryText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onBrandPrimary },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardHead: { flexDirection: "row", gap: spacing.md },
  docIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
  docTitle: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  docMeta: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 1 },
  docDate: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted, marginTop: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  badgeText: { fontFamily: font.semibold, fontSize: type.kicker },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  actionText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brandPrimary },
});
