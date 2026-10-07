import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Icon } from "@/src/components/icon";
import { Portal } from "@/src/components/portal";
import { documentSigningService as svc } from "@/src/features/documents/service";
import type { CompletionStatus } from "@/src/features/documents/types";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const BACKOFF = [1500, 2000, 3000, 4000, 5000]; // bounded polling with backoff

function fmtLondon(utc: string) {
  try {
    const d = new Date(utc);
    const s = d.toLocaleString("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const bst = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "short" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value || "GMT";
    return `${s} ${bst}`;
  } catch { return utc; }
}

export default function SigningStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<CompletionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [showAudit, setShowAudit] = useState<any | null>(null);
  const attempt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const s = await svc.getStatus(String(id));
      setData(s); setError(null);
      if (s.status === "processing") {
        const wait = BACKOFF[Math.min(attempt.current, BACKOFF.length - 1)];
        attempt.current += 1;
        timer.current = setTimeout(poll, wait);
      }
    } catch (e: any) {
      setError(e?.message || "Couldn't fetch status.");
    }
  }, [id]);

  // Retry BACKEND PROCESSING only — never re-signs or creates a new submission.
  const retryProcessing = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await svc.retryProcessing(String(id));
      attempt.current = 0;
      await poll();
    } catch (e: any) {
      setError(e?.message || "Couldn't retry processing.");
    } finally {
      setRetrying(false);
    }
  }, [id, poll, retrying]);

  useEffect(() => { poll(); return () => { if (timer.current) clearTimeout(timer.current); }; }, [poll]);

  const back = () => router.replace("/documents");

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="status-back" onPress={back} hitSlop={10} style={{ width: 24 }}><Icon name="arrowLeft" size={24} color={colors.heading} /></Pressable>
        <Text style={styles.headerTitle}>Signing status</Text>
        <View style={{ width: 24 }} />
      </View>
      {svc.isMock ? <View style={styles.demoBanner}><Text style={styles.demoText}>Demo signing — not a live signed document</Text></View> : null}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
        {error ? (
          <View style={styles.center}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.sub}>{error}</Text>
            <Pressable testID="status-retry" onPress={() => { attempt.current = 0; poll(); }} style={styles.primaryBtn}><Text style={styles.primaryText}>Try again</Text></Pressable>
          </View>
        ) : !data ? (
          <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
        ) : data.status === "processing" ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brandPrimary} size="large" />
            <Text style={styles.title}>Signature received — preparing your completed copy</Text>
            <Text style={styles.sub}>You can safely close the app. We&apos;ll finish processing and your completed document will appear here.</Text>
          </View>
        ) : data.status === "completed" && data.completion ? (
          <Completed c={data.completion} onAudit={async () => setShowAudit(await svc.getAudit(String(id)))} onBack={back} />
        ) : data.status === "needs_attention" ? (
          <View style={styles.center}>
            <View style={styles.attnIcon}><Icon name="warning" size={30} color="#B45309" /></View>
            <Text style={styles.title}>We need a moment to finish</Text>
            <Text style={styles.sub}>{data.message || "We couldn't finish preparing your signed document."}</Text>
            <Text style={styles.subStrong}>Your signature was received — you don&apos;t need to sign again.</Text>
            <Pressable testID="retry-processing" onPress={retryProcessing} disabled={retrying} style={[styles.primaryBtn, { alignSelf: "stretch" }, retrying && { opacity: 0.6 }]}>
              {retrying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Try to finish processing</Text>}
            </Pressable>
            <Pressable testID="attn-back" onPress={back} style={styles.ghostBtn}><Text style={styles.ghostText}>Back to My Documents</Text></Pressable>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.title}>This request is {data.status}</Text>
            <Text style={styles.sub}>{data.message || "Signing is no longer available."}</Text>
            <Pressable testID="status-back2" onPress={back} style={styles.primaryBtn}><Text style={styles.primaryText}>Back to My Documents</Text></Pressable>
          </View>
        )}
      </ScrollView>

      {showAudit ? (
        <Portal>
          <View style={styles.modalWrap}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAudit(null)} />
            <View style={styles.auditCard}>
              <ScrollView>
                <Text style={styles.auditTitle}>{showAudit.title}</Text>
                <Text style={styles.auditNote}>{showAudit.note}</Text>
                {Object.entries({ Reference: showAudit.reference, Document: showAudit.documentTitle, Version: showAudit.documentVersion, Business: `${showAudit.businessName} (${showAudit.companyNumber})`, "Intended signer": showAudit.intendedSigner, "Submitting account": showAudit.submittingAccount, "Auth method": showAudit.authMethod, Acceptance: `${showAudit.acceptanceWording} (${showAudit.acceptanceVersion})`, Device: showAudit.deviceMetadata, "Original hash": showAudit.originalPdfHash, "Signed hash": showAudit.signedPdfHash }).map(([k, v]) => (
                  <View key={k} style={styles.auditRow}><Text style={styles.auditKey}>{k}</Text><Text style={styles.auditVal}>{String(v)}</Text></View>
                ))}
                <Text style={styles.auditEventsTitle}>Events (UTC, simulated)</Text>
                {showAudit.events.map((e: any, i: number) => (
                  <View key={i} style={styles.auditRow}><Text style={styles.auditKey}>{e.label}</Text><Text style={styles.auditVal}>{fmtLondon(e.utc)}</Text></View>
                ))}
                <Pressable testID="audit-close" onPress={() => setShowAudit(null)} style={[styles.primaryBtn, { marginTop: spacing.md }]}><Text style={styles.primaryText}>Close</Text></Pressable>
              </ScrollView>
            </View>
          </View>
        </Portal>
      ) : null}
    </View>
  );
}

function Completed({ c, onAudit, onBack }: { c: NonNullable<CompletionStatus["completion"]>; onAudit: () => void; onBack: () => void }) {
  const note = (label: string) => alertDemo(label, c.simulated);
  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.successTop}>
        <View style={styles.successIcon}><Icon name="shield" size={34} color="#FFF" /></View>
        <Text style={styles.title}>Document signed successfully</Text>
        {c.simulated ? <Text style={styles.simTag}>Simulated — demo fixture (not a real signed document)</Text> : null}
      </View>
      <View style={styles.infoCard}>
        <Row k="Signatory" v={c.signatoryName} />
        <Row k="Signed (server time)" v={fmtLondon(c.signedAtUtc) + (c.simulated ? " · simulated" : "")} />
        <Row k="Reference" v={c.reference} />
      </View>
      <Action testID="view-signed" label="View signed PDF" onPress={() => note("View signed PDF")} />
      <Action testID="download-signed" label="Download signed PDF" onPress={() => note("Download signed PDF")} />
      <Action testID="view-audit" label="View signing audit record" onPress={onAudit} />
      <Action testID="download-audit" label="Download signing audit record" onPress={() => note("Download audit record")} />
      {c.combinedUrl ? <Action testID="download-combined" label="Download combined copy" onPress={() => note("Download combined copy")} /> : null}
      <Pressable testID="completed-back" onPress={onBack} style={[styles.primaryBtn, { marginTop: spacing.sm }]}><Text style={styles.primaryText}>Back to My Documents</Text></Pressable>
    </View>
  );
}

// Demo-only affordance: real builds open an authenticated/short-lived file URL.
function alertDemo(label: string, simulated?: boolean) {
  // eslint-disable-next-line no-alert
  if (typeof window !== "undefined" && (window as any).alert) (window as any).alert(`${label}\n\n${simulated ? "Demo fixture — no real file is generated on the device. The backend produces the authenticated file in production." : ""}`);
}

const Row = ({ k, v }: { k: string; v: string }) => (<View style={styles.infoRow}><Text style={styles.infoKey}>{k}</Text><Text style={styles.infoVal}>{v}</Text></View>);
const Action = ({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) => (
  <Pressable testID={testID} onPress={onPress} style={styles.actionBtn}><Text style={styles.actionText}>{label}</Text><Icon name="chevronRight" size={18} color={colors.brandPrimary} /></Pressable>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: font.bold, fontSize: type.lg, color: colors.heading },
  demoBanner: { backgroundColor: "#FEF3C7", paddingVertical: spacing.sm },
  demoText: { fontFamily: font.semibold, fontSize: type.sm, color: "#92400E", textAlign: "center" },
  center: { alignItems: "center", justifyContent: "center", gap: spacing.md, paddingVertical: spacing["2xl"] },
  title: { fontFamily: font.bold, fontSize: type.title, color: colors.heading, textAlign: "center" },
  sub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, textAlign: "center", lineHeight: 20 },
  subStrong: { fontFamily: font.semibold, fontSize: type.sm, color: colors.heading, textAlign: "center" },
  attnIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  ghostBtn: { height: 44, alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  ghostText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  simTag: { fontFamily: font.semibold, fontSize: type.kicker, color: "#92400E", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: "hidden" },
  successTop: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  infoKey: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  infoVal: { flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: type.sm, color: colors.heading },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  actionText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brandPrimary },
  primaryBtn: { height: 50, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onBrandPrimary },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  auditCard: { width: "100%", maxWidth: 420, maxHeight: "80%", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg },
  auditTitle: { fontFamily: font.bold, fontSize: type.title, color: colors.heading },
  auditNote: { fontFamily: font.regular, fontSize: type.kicker, color: "#92400E", backgroundColor: "#FEF3C7", padding: spacing.sm, borderRadius: 8, marginVertical: spacing.sm },
  auditRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.divider },
  auditKey: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted, flex: 1 },
  auditVal: { fontFamily: font.semibold, fontSize: type.kicker, color: colors.heading, flex: 1.4, textAlign: "right" },
  auditEventsTitle: { fontFamily: font.semibold, fontSize: type.sm, color: colors.heading, marginTop: spacing.md, marginBottom: 4 },
});
