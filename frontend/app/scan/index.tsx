import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";

const MAX_PAGES = 4;
const MAX_BYTES = 12 * 1024 * 1024;

type Page = { uri: string; name: string; type: string };

export default function Scan() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const [pages, setPages] = useState<Page[]>([]);
  const [pdf, setPdf] = useState<Page | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "extracting">("idle");
  const [error, setError] = useState("");

  const busy = phase !== "idle";
  const count = pdf ? 1 : pages.length;
  const canAddMore = !pdf && pages.length < MAX_PAGES;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/dashboard");
  };

  const addImage = (a: ImagePicker.ImagePickerAsset) => {
    if (a.fileSize && a.fileSize > MAX_BYTES) {
      setError(`"${a.fileName || "Photo"}" is over 12MB. Please try a smaller photo.`);
      return;
    }
    setError("");
    setPages((p) => [
      ...p,
      { uri: a.uri, name: a.fileName || `Page ${p.length + 1}.jpg`, type: a.mimeType || "image/jpeg" },
    ]);
  };

  const takePhoto = async () => {
    if (pdf) {
      setError("Remove the PDF before adding images.");
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        toast("Enable camera access in Settings to scan a bill.", "info");
        Linking.openSettings();
      } else {
        toast("Camera access is needed to photograph your bill.", "info");
      }
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) addImage(res.assets[0]);
  };

  const uploadFile = async () => {
    // Try image library first; user can also pick a PDF via document picker below
    if (pdf) {
      setError("Remove the PDF before adding images.");
      return;
    }
    const res = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const isPdf = a.mimeType === "application/pdf" || (a.name || "").toLowerCase().endsWith(".pdf");
    if (isPdf) {
      if (pages.length > 0) {
        setError("Please upload either a single PDF or multiple images — not both.");
        return;
      }
      if (a.size && a.size > MAX_BYTES) {
        setError("That PDF is over 12MB. Please try a smaller file.");
        return;
      }
      setError("");
      setPdf({ uri: a.uri, name: a.name || "bill.pdf", type: "application/pdf" });
    } else {
      if (pages.length >= MAX_PAGES) {
        setError(`You can upload up to ${MAX_PAGES} pages per bill.`);
        return;
      }
      if (a.size && a.size > MAX_BYTES) {
        setError(`"${a.name || "Photo"}" is over 12MB. Please try a smaller photo.`);
        return;
      }
      setError("");
      setPages((p) => [...p, { uri: a.uri, name: a.name || `Page ${p.length + 1}.jpg`, type: a.mimeType || "image/jpeg" }]);
    }
  };

  const removePage = (i: number) => {
    setError("");
    setPages((p) => p.filter((_, n) => n !== i));
  };

  const reset = () => {
    setPages([]);
    setPdf(null);
    setError("");
  };

  const extract = useCallback(async () => {
    if (count === 0 || busy) return;
    setError("");
    setPhase("uploading");
    try {
      const form = new FormData();
      if (pdf) {
        form.append("file", { uri: pdf.uri, name: pdf.name, type: pdf.type } as any);
      } else {
        pages.forEach((p) => form.append("files", { uri: p.uri, name: p.name, type: p.type } as any));
      }
      setPhase("extracting");
      const res = await apiRequest<any>("/scans", { method: "POST", body: form, timeoutMs: 120000 });
      const id = res?.id || res?.scan_id || res?._id;
      router.replace(`/scan/review/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not read this bill. Please try a clearer photo.");
    } finally {
      setPhase("idle");
    }
  }, [count, busy, pdf, pages, router]);

  const heading = busy
    ? phase === "uploading"
      ? "Uploading bill…"
      : "Analyzing your bill… parsing contract details"
    : count > 0
      ? `Ready: ${count} ${count === 1 ? "page" : "pages"}`
      : "Scan your bill to find savings";

  const sub = busy
    ? "This usually takes 10–20 seconds."
    : count > 0
      ? "Add more pages if your bill spans several sheets, or hit Extract details."
      : "Snap or upload your bill — we'll pull out the supplier, rates, and meter numbers automatically.";

  return (
    <View style={styles.root}>
      <ScreenHeader testID="scan-header" title="Scan a bill" onBack={goBack} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card} testID="scan-cta-box">
          <View style={[styles.circle, busy && styles.circlePulse]}>
            <Icon name="scan" size={42} color={colors.heading} />
          </View>
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.sub}>{sub}</Text>

          {!busy && pages.length > 0 && (
            <View style={styles.strip} testID="scan-page-strip">
              {pages.map((p, i) => (
                <View key={p.uri} style={styles.thumb} testID={`scan-page-thumb-${i}`}>
                  <Image source={{ uri: p.uri }} style={styles.thumbImg} />
                  <Pressable
                    testID={`scan-page-remove-${i}`}
                    onPress={() => removePage(i)}
                    style={styles.thumbRemove}
                  >
                    <Text style={styles.thumbRemoveText}>×</Text>
                  </Pressable>
                  <View style={styles.thumbLabel}>
                    <Text style={styles.thumbLabelText}>PAGE {i + 1}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {!busy && pdf && (
            <View style={styles.pdfChip} testID="scan-pdf-chip">
              <Icon name="document" size={16} color={colors.heading} />
              <Text style={styles.pdfName} numberOfLines={1}>{pdf.name}</Text>
              <Pressable testID="scan-pdf-remove" onPress={() => setPdf(null)} style={styles.pdfRemove}>
                <Text style={styles.thumbRemoveText}>×</Text>
              </Pressable>
            </View>
          )}

          {busy && <ActivityIndicator color={colors.heading} style={{ marginTop: spacing.sm }} />}

          {!busy && (
            <View style={styles.actions}>
              {count > 0 && (
                <Pressable testID="scan-submit" onPress={extract} style={[styles.btn, styles.btnAccent]}>
                  <Icon name="scan" size={18} color="#FFFFFF" />
                  <Text style={styles.btnAccentText}>
                    Extract details ({count} {count === 1 ? "page" : "pages"})
                  </Text>
                </Pressable>
              )}
              {canAddMore && (
                <Pressable testID="scan-take-photo" onPress={takePhoto} style={[styles.btn, count === 0 ? styles.btnPurple : styles.btnSecondary]}>
                  <Icon name="scan" size={18} color={count === 0 ? "#FFFFFF" : colors.heading} />
                  <Text style={count === 0 ? styles.btnPurpleText : styles.btnSecondaryText}>
                    {pages.length === 0 ? "Take a photo" : "+ Add another page"}
                  </Text>
                </Pressable>
              )}
              {canAddMore && (
                <Pressable testID="scan-upload-file" onPress={uploadFile} style={[styles.btn, count === 0 ? styles.btnPrimary : styles.btnSecondary]}>
                  <Icon name="document" size={18} color={count === 0 ? "#FFFFFF" : colors.heading} />
                  <Text style={count === 0 ? styles.btnPrimaryText : styles.btnSecondaryText}>
                    {count === 0 ? "Upload image or PDF" : "+ Add from gallery"}
                  </Text>
                </Pressable>
              )}
              {count > 0 && (
                <Pressable testID="scan-reset" onPress={reset} style={styles.startOver}>
                  <Text style={styles.startOverText}>Start over</Text>
                </Pressable>
              )}
            </View>
          )}

          {!!error && (
            <Text testID="scan-error" style={styles.error}>{error}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg },
  card: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C4B5FD",
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    alignItems: "center",
  },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  circlePulse: { opacity: 0.9 },
  heading: { fontFamily: font.bold, fontSize: type.lg, color: colors.heading, textAlign: "center", marginBottom: spacing.sm },
  sub: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, textAlign: "center", marginBottom: spacing.lg, lineHeight: 20 },

  strip: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: spacing.md },
  thumb: { width: 76, height: 96, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: "#C4B5FD", backgroundColor: "#fff" },
  thumbImg: { width: "100%", height: "100%" },
  thumbRemove: { position: "absolute", top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  thumbRemoveText: { color: "#fff", fontFamily: font.bold, fontSize: 14, lineHeight: 16 },
  thumbLabel: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 2, alignItems: "center" },
  thumbLabelText: { color: "#fff", fontFamily: font.bold, fontSize: 10, letterSpacing: 0.5 },

  pdfChip: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, marginBottom: spacing.md, ...shadow.card, maxWidth: "100%" },
  pdfName: { flexShrink: 1, fontFamily: font.semibold, fontSize: type.sm, color: colors.heading },
  pdfRemove: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },

  actions: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.sm },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 50, borderRadius: radius.md },
  btnAccent: { backgroundColor: colors.brandPrimary },
  btnAccentText: { fontFamily: font.semibold, fontSize: type.base, color: "#FFFFFF" },
  btnPurple: { backgroundColor: colors.heading },
  btnPurpleText: { fontFamily: font.semibold, fontSize: type.base, color: "#FFFFFF" },
  btnPrimary: { backgroundColor: colors.brandPrimary },
  btnPrimaryText: { fontFamily: font.semibold, fontSize: type.base, color: "#FFFFFF" },
  btnSecondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  startOver: { alignItems: "center", paddingVertical: spacing.sm },
  startOverText: { fontFamily: font.medium, fontSize: type.sm, color: colors.muted, textDecorationLine: "underline" },
  error: { fontFamily: font.medium, fontSize: type.sm, color: colors.error, marginTop: spacing.md, textAlign: "center" },
});
