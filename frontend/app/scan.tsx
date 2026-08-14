import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type Captured = { uri: string; name: string; type: string };

export default function Scan() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [captured, setCaptured] = useState<Captured | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/dashboard");
  };

  const askCamera = async () => {
    const res = await requestPermission();
    if (!res.granted && !res.canAskAgain) {
      Linking.openSettings();
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setCaptured({ uri: photo.uri, name: "bill.jpg", type: "image/jpeg" });
      }
    } catch {
      toast("Couldn't capture the photo. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          toast("Enable photo access in Settings to pick a bill.", "info");
          Linking.openSettings();
        } else {
          toast("Photo access is needed to pick a bill.", "info");
        }
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        const name = a.fileName || a.uri.split("/").pop() || "bill.jpg";
        setCaptured({
          uri: a.uri,
          name,
          type: a.mimeType || "image/jpeg",
        });
      }
    } catch {
      toast("Couldn't open your photos. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const upload = useCallback(async () => {
    if (!captured || uploading) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", {
        uri: captured.uri,
        name: captured.name,
        type: captured.type,
      } as any);
      await apiRequest("/scans", {
        method: "POST",
        body: form,
        timeoutMs: 120000,
      });
      setDone(true);
    } catch (e) {
      toast(
        e instanceof ApiError ? e.message : "Upload failed. Please try again.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  }, [captured, uploading, toast]);

  /* ---------- Success state ---------- */
  if (done) {
    return (
      <View style={styles.lightRoot}>
        <View style={[styles.successWrap, { paddingTop: insets.top + spacing["3xl"] }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text testID="scan-success-title" style={styles.successTitle}>
            Bill received
          </Text>
          <Text style={styles.successSub}>
            Our team will verify the details and update your contracts within a day.
            You&apos;ll see it under &quot;Audit in progress&quot; on your dashboard.
          </Text>
          <View style={styles.successActions}>
            <Button
              testID="scan-success-done"
              label="Back to dashboard"
              onPress={() => router.replace("/dashboard")}
            />
            <Button
              testID="scan-success-another"
              label="Scan another"
              variant="secondary"
              onPress={() => {
                setCaptured(null);
                setDone(false);
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  /* ---------- Preview + upload state ---------- */
  if (captured) {
    return (
      <View style={styles.darkRoot}>
        <Image source={{ uri: captured.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        {uploading && (
          <View style={styles.uploadOverlay} testID="scan-uploading">
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.uploadText}>
              Extracting document details{"\n"}(this may take up to 60s)…
            </Text>
          </View>
        )}
        <View style={[styles.previewBar, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            testID="scan-retake-button"
            label="Retake"
            variant="secondary"
            icon="camera-reverse-outline"
            onPress={() => setCaptured(null)}
            disabled={uploading}
            style={{ flex: 1 }}
          />
          <Button
            testID="scan-use-button"
            label="Use this bill"
            icon="cloud-upload-outline"
            onPress={upload}
            loading={uploading}
            style={{ flex: 1 }}
          />
        </View>
        <Pressable
          testID="scan-preview-back"
          onPress={() => setCaptured(null)}
          disabled={uploading}
          style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
    );
  }

  /* ---------- Permission primer ---------- */
  const needsPrimer = !permission || !permission.granted;
  if (needsPrimer) {
    const blocked = permission && !permission.granted && !permission.canAskAgain;
    return (
      <View style={styles.lightRoot}>
        <Header insetsTop={insets.top} onBack={goBack} />
        <View style={styles.primerWrap} testID="scan-permission-primer">
          <View style={styles.primerIcon}>
            <Ionicons name="camera-outline" size={40} color={colors.brandPrimary} />
          </View>
          <Text style={styles.primerTitle}>Scan your utility bill</Text>
          <Text style={styles.primerSub}>
            Allow camera access to snap a photo of your bill. We&apos;ll read the supplier,
            rates and dates for you — no typing needed.
          </Text>
          <View style={styles.primerActions}>
            <Button
              testID="scan-enable-camera"
              label={blocked ? "Open Settings" : "Enable camera"}
              icon="camera-outline"
              onPress={askCamera}
            />
            <Button
              testID="scan-pick-gallery-primer"
              label="Pick from gallery instead"
              variant="secondary"
              icon="images-outline"
              onPress={pickFromGallery}
              loading={busy}
            />
          </View>
        </View>
      </View>
    );
  }

  /* ---------- Live camera ---------- */
  return (
    <View style={styles.darkRoot}>
      {Platform.OS !== "web" ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webCam]}>
          <Text style={styles.webCamText}>Camera preview isn&apos;t available here.</Text>
        </View>
      )}

      {/* Mask overlay */}
      <View style={styles.maskTop} pointerEvents="none">
        <Text style={styles.frameHint}>Fit the whole bill inside the frame</Text>
      </View>
      <View style={styles.maskMiddle} pointerEvents="none">
        <View style={styles.maskSide} />
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cTL]} />
          <View style={[styles.corner, styles.cTR]} />
          <View style={[styles.corner, styles.cBL]} />
          <View style={[styles.corner, styles.cBR]} />
        </View>
        <View style={styles.maskSide} />
      </View>
      <View style={styles.maskBottom} pointerEvents="none" />

      {/* Top bar */}
      <Pressable
        testID="scan-close-button"
        onPress={goBack}
        style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Pressable
          testID="scan-gallery-button"
          onPress={pickFromGallery}
          style={styles.galleryBtn}
        >
          <Ionicons name="images-outline" size={24} color="#fff" />
        </Pressable>
        <Pressable
          testID="scan-shutter-button"
          onPress={takePhoto}
          disabled={busy}
          style={styles.shutterOuter}
        >
          <View style={styles.shutterInner}>
            {busy && <ActivityIndicator color={colors.brandPrimary} />}
          </View>
        </Pressable>
        <View style={styles.galleryBtn} />
      </View>
    </View>
  );
}

function Header({ insetsTop, onBack }: { insetsTop: number; onBack: () => void }) {
  return (
    <View style={[styles.lightHeader, { paddingTop: insetsTop + spacing.sm }]}>
      <Pressable testID="scan-back-button" onPress={onBack} hitSlop={10} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.headerTitle}>Scan a bill</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const FRAME_H = 380;
const styles = StyleSheet.create({
  darkRoot: { flex: 1, backgroundColor: "#000" },
  lightRoot: { flex: 1, backgroundColor: colors.surface },

  lightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  headerTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.onSurface },

  /* Mask */
  maskTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: spacing.lg,
  },
  maskMiddle: { flexDirection: "row", height: FRAME_H },
  maskSide: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  maskBottom: { flex: 1.4, backgroundColor: "rgba(0,0,0,0.6)" },
  frame: {
    width: "82%",
    height: FRAME_H,
    borderRadius: radius.md,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#fff",
  },
  cTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.md },
  cTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.md },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.md },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.md },
  frameHint: {
    color: "#fff",
    fontFamily: font.medium,
    fontSize: type.base,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },

  closeBtn: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
  },
  galleryBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  webCam: { backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },
  webCamText: { color: "#fff", fontFamily: font.medium, fontSize: type.base },

  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,17,17,0.82)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    zIndex: 5,
  },
  uploadText: {
    color: "#fff",
    fontFamily: font.medium,
    fontSize: type.lg,
    textAlign: "center",
    lineHeight: 24,
  },
  previewBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  /* Primer */
  primerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  primerIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  primerTitle: {
    fontFamily: font.bold,
    fontSize: type["2xl"],
    color: colors.onSurface,
    textAlign: "center",
  },
  primerSub: {
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  primerActions: { alignSelf: "stretch", gap: spacing.md, marginTop: spacing["2xl"] },

  /* Success */
  successWrap: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xl },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontFamily: font.bold,
    fontSize: type["2xl"],
    color: colors.onSurface,
    textAlign: "center",
  },
  successSub: {
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  successActions: { alignSelf: "stretch", gap: spacing.md, marginTop: spacing["2xl"] },
});
