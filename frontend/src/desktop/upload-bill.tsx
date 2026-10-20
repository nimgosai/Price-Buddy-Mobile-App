/**
 * Desktop-web bill upload (≥1024px only). Phones keep the camera "Scan bill" flow in app/scan.
 * Drag-and-drop or browse for PDF / JPG / PNG, then the same backend auto-extraction (/scans).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { apiRequest, ApiError } from "@/src/api/client";
import { Icon } from "@/src/components/icon";
import { DesktopDialog, DialogButton } from "@/src/desktop/overlays";
import { dt } from "@/src/desktop/tokens";
import { colors, font, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_IMAGES = 4;
const ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";
const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const isImg = (f: File) => ["image/png", "image/jpeg", "image/jpg"].includes(f.type) || /\.(png|jpe?g)$/i.test(f.name);
const sizeLabel = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function BillUploader({ onCancel, onUploaded }: { onCancel?: () => void; onUploaded: (scanId: string) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const zoneRef = useRef<View>(null);

  const add = useCallback((incoming: File[]) => {
    setError("");
    setFiles((cur) => {
      let next = [...cur];
      for (const f of incoming) {
        if (!isPdf(f) && !isImg(f)) { setError(`"${f.name}" isn't supported. Please upload a PDF, JPG or PNG.`); continue; }
        if (f.size > MAX_BYTES) { setError(`"${f.name}" is over 12MB. Please try a smaller file.`); continue; }
        if (isPdf(f)) {
          if (next.length > 0) { setError("Please upload either a single PDF or up to 4 images — not both."); continue; }
          next = [f];
        } else {
          if (next.some(isPdf)) { setError("Please upload either a single PDF or up to 4 images — not both."); continue; }
          if (next.length >= MAX_IMAGES) { setError(`You can upload up to ${MAX_IMAGES} pages per bill.`); continue; }
          next.push(f);
        }
      }
      return next;
    });
  }, []);

  // Native HTML drag-and-drop on the zone (web only).
  useEffect(() => {
    const el = zoneRef.current as unknown as HTMLElement | null;
    if (Platform.OS !== "web" || !el?.addEventListener) return;
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const enter = (e: DragEvent) => { prevent(e); setOver(true); };
    const leave = (e: DragEvent) => { prevent(e); setOver(false); };
    const drop = (e: DragEvent) => { prevent(e); setOver(false); add(Array.from(e.dataTransfer?.files || [])); };
    el.addEventListener("dragenter", enter);
    el.addEventListener("dragover", enter);
    el.addEventListener("dragleave", leave);
    el.addEventListener("drop", drop);
    return () => {
      el.removeEventListener("dragenter", enter);
      el.removeEventListener("dragover", enter);
      el.removeEventListener("dragleave", leave);
      el.removeEventListener("drop", drop);
    };
  }, [add]);

  const browse = () => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPT;
    input.multiple = true;
    input.onchange = () => add(Array.from(input.files || []));
    input.click();
  };

  const submit = async () => {
    if (!files.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      if (files.length === 1 && isPdf(files[0])) form.append("file", files[0], files[0].name);
      else files.forEach((f) => form.append("files", f, f.name));
      const res = await apiRequest<any>("/scans", { method: "POST", body: form, timeoutMs: 120000 });
      const id = res?.id || res?.scan_id || res?._id;
      if (!id) throw new Error("no id");
      onUploaded(String(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not read this bill. Please try a clearer copy.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View ref={zoneRef} collapsable={false} style={[s.zone, over && s.zoneOver]} testID="bill-dropzone">
        {busy ? (
          <>
            <ActivityIndicator size="large" color={colors.brandPrimary} />
            <Text style={s.zoneTitle}>Analysing your bill…</Text>
            <Text style={s.zoneSub}>Pulling out the supplier, rates and meter numbers. This usually takes 10–20 seconds.</Text>
          </>
        ) : (
          <>
            <View style={s.zoneIcon}><Icon name="document" size={26} color={colors.brandPrimary} /></View>
            <Text style={s.zoneTitle}>{over ? "Drop to upload" : "Drag & drop your bill here"}</Text>
            <Text style={s.zoneSub}>PDF, JPG or PNG · up to 12MB · one PDF or up to 4 page images</Text>
            <DialogButton testID="bill-browse" label="Browse files" variant="ghost" onPress={browse} />
          </>
        )}
      </View>

      {files.length > 0 && !busy ? (
        <View style={{ gap: spacing.sm }} testID="bill-file-list">
          {files.map((f, i) => (
            <View key={`${f.name}-${i}`} style={s.file} testID={`bill-file-${i}`}>
              <Icon name="document" size={16} color={isPdf(f) ? "#B91C1C" : colors.brandPrimary} />
              <Text style={s.fileName} numberOfLines={1}>{f.name}</Text>
              <Text style={s.fileSize}>{sizeLabel(f.size)}</Text>
              <Pressable testID={`bill-file-remove-${i}`} onPress={() => setFiles((c) => c.filter((_, n) => n !== i))} hitSlop={8}>
                <Icon name="close" size={14} color={dt.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text style={s.error} testID="bill-upload-error">{error}</Text> : null}

      <View style={s.actions}>
        {onCancel ? <DialogButton label="Cancel" variant="ghost" onPress={onCancel} disabled={busy} /> : null}
        <DialogButton testID="bill-upload-submit" label="Extract details" onPress={submit} disabled={!files.length} loading={busy} />
      </View>
    </View>
  );
}

// ——— App-wide "capture a bill" trigger: modal on desktop, camera scan screen on mobile ———
type Ctx = { open: (utility?: string) => void };
const BillUploadContext = createContext<Ctx | null>(null);

export function BillUploadProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<{ utility?: string } | null>(null);
  const close = () => setState(null);
  return (
    <BillUploadContext.Provider value={{ open: (utility) => setState({ utility }) }}>
      {children}
      {state ? (
        <DesktopDialog
          testID="bill-upload-modal"
          title={state.utility ? `Upload ${state.utility.toLowerCase()} bill` : "Upload a bill"}
          subtitle="We'll extract the supplier, rates, meter numbers and renewal date automatically."
          icon="document"
          maxWidth={640}
          onClose={close}
        >
          <BillUploader onCancel={close} onUploaded={(id) => { close(); router.push(`/scan/review/${id}`); }} />
        </DesktopDialog>
      ) : null}
    </BillUploadContext.Provider>
  );
}

/** Desktop: "Upload … bill" + upload modal. Mobile: "Scan … bill" + camera scan screen. */
export function useBillCapture() {
  const router = useRouter();
  const ctx = useContext(BillUploadContext);
  const isDesktop = useIsDesktop();
  const upload = isDesktop && !!ctx;
  return {
    upload,
    verb: upload ? "Upload" : "Scan",
    open: (utility?: string) => (upload ? ctx!.open(utility) : router.push("/scan")),
  };
}

const s = StyleSheet.create({
  zone: { alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 40, paddingHorizontal: spacing.xl, borderWidth: 2, borderStyle: "dashed", borderColor: "#CBD5E1", borderRadius: 12, backgroundColor: dt.canvas },
  zoneOver: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  zoneIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  zoneTitle: { fontFamily: font.semibold, fontSize: type.lg, color: dt.text },
  zoneSub: { fontFamily: font.regular, fontSize: type.sm, color: dt.muted, textAlign: "center", marginBottom: spacing.sm },
  file: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: dt.border, borderRadius: 8, paddingHorizontal: spacing.md, height: 44 },
  fileName: { flex: 1, fontFamily: font.medium, fontSize: type.sm, color: dt.text },
  fileSize: { fontFamily: font.regular, fontSize: type.kicker, color: dt.muted },
  error: { fontFamily: font.medium, fontSize: type.sm, color: "#B91C1C" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
});
