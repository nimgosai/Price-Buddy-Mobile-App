import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { Icon } from "@/src/components/icon";
import { Portal } from "@/src/components/portal";
import { DocumentPageCanvas, pageDisplaySize } from "@/src/features/documents/DocumentPageCanvas";
import { SignaturePad } from "@/src/features/documents/SignaturePad";
import { documentSigningService as svc, generateIdempotencyKey } from "@/src/features/documents/service";
import { docDebug } from "@/src/features/documents/debug";
import type { FieldDefinition, SigningRequest } from "@/src/features/documents/types";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";
import { useIsDesktop } from "@/src/utils/use-desktop";

const DESKTOP_PANEL_W = 380; // right-hand signing panel (desktop web only)
const DESKTOP_BODY_MAX = 1440;

const needsUser = (f: FieldDefinition) => f.required && !f.readOnly && f.type !== "date_signed";

export default function ReviewSign() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const isDesktop = useIsDesktop();

  const [req, setReq] = useState<SigningRequest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [terminal, setTerminal] = useState<{ code: string; message: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState<FieldDefinition | null>(null);
  const [declaration, setDeclaration] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState(false); // first page failed to display
  const [renderFail, setRenderFail] = useState(false); // MOCK/DEV: simulate first-page render failure
  const [foStatus, setFoStatus] = useState("waiting for document to display"); // DEV badge only
  const [lockHint, setLockHint] = useState(false); // shown when tapping a locked (out-of-order) field
  const scrollRef = useRef<ScrollView>(null);
  const pageYOffset = useRef<Record<number, number>>({});
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idemKey = useRef<string>(generateIdempotencyKey()); // reused on every retry
  const firstOpenDone = useRef(false); // success guard (in-session only)
  const firstOpenInFlight = useRef(false);
  const displayLogged = useRef(false);

  const load = useCallback(async () => {
    setLoadError(null); setTerminal(null); setSubmitError(null); setReq(null);
    setPageError(false); setRenderFail(false); setFoStatus("waiting for document to display");
    firstOpenDone.current = false; firstOpenInFlight.current = false; displayLogged.current = false;
    try {
      const r = await svc.getSigningRequest(String(id));
      if (r.status === "completed" || r.status === "processing" || r.status === "needs_attention") {
        router.replace(`/documents/${id}/status`); return;
      }
      if (r.status === "expired" || r.status === "cancelled") {
        setReq(r); setTerminal({ code: r.status, message: `This request is ${r.status}. Signing is no longer available.` }); return;
      }
      const init: Record<string, string> = {};
      r.fields.forEach((f) => { if (f.prefill) init[f.id] = f.prefill; });
      setValues(init);
      setRenderFail(svc.mockRenderFirstPageFails(String(id))); // MOCK/DEV only
      setReq(r);
    } catch (e: any) {
      setLoadError(e?.message || "Couldn't load this document.");
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // Attempt to record first-open. Called ONLY from onContentDisplayed (i.e. after
  // the first page actually renders). On failure, DO NOT permanently mark recorded
  // locally — reset the guard and retry once so the document stays usable.
  const attemptFirstOpen = useCallback(() => {
    if (firstOpenDone.current || firstOpenInFlight.current) return;
    firstOpenInFlight.current = true;
    setFoStatus("displayed → recording first-open…");
    svc.recordFirstOpen(String(id))
      .then((r) => {
        firstOpenInFlight.current = false;
        firstOpenDone.current = true;
        if (r.duplicate) { docDebug.firstOpenDuplicate++; setFoStatus("recorded (server dedup: duplicate)"); docDebug.log("first-open-duplicate", { id }); }
        else { docDebug.firstOpenRecorded++; setFoStatus("recorded (1 first-open event)"); docDebug.log("first-open-recorded", { id }); }
      })
      .catch((e: any) => {
        firstOpenInFlight.current = false;
        firstOpenDone.current = false; // not recorded — allow safe retry
        docDebug.firstOpenFailed++;
        setFoStatus("record failed → retrying safely…");
        docDebug.log("first-open-failed", { id, error: e?.message });
        setTimeout(() => { if (!firstOpenDone.current) attemptFirstOpen(); }, 1500);
      });
  }, [id]);

  // Fired when the FIRST page content has successfully displayed (image onLoad /
  // synthetic onLayout). Zoom/re-layout may fire this repeatedly — guarded so only
  // ONE first-open is ever recorded per session.
  const onContentDisplayed = useCallback(() => {
    if (!displayLogged.current) { displayLogged.current = true; docDebug.firstPageDisplayed++; docDebug.log("first-page-displayed", { id }); }
    attemptFirstOpen();
  }, [attemptFirstOpen, id]);

  // Fired when the FIRST page failed to display — first-open must NOT be recorded.
  const onContentError = useCallback(() => {
    docDebug.firstPageError++; docDebug.log("first-page-error (no first-open)", { id });
    setPageError(true);
    setFoStatus("content failed to display — no first-open recorded");
  }, [id]);

  if (!req && !loadError) return <Center><ActivityIndicator color={colors.brandPrimary} /></Center>;

  if (loadError && !req) return (
    <Center>
      <Text style={styles.msgTitle}>Couldn&apos;t open document</Text>
      <Text style={styles.msgSub}>{loadError}</Text>
      <Pressable testID="review-retry" onPress={load} style={styles.primaryBtn}><Text style={styles.primaryText}>Try again</Text></Pressable>
    </Center>
  );

  if (terminal) return (
    <Center>
      <View style={styles.terminalIcon}><Icon name="warning" size={34} color="#B45309" /></View>
      <Text style={styles.msgTitle}>Signing unavailable</Text>
      <Text style={styles.msgSub}>{terminal.message}</Text>
      <Pressable testID="terminal-back" onPress={() => router.replace("/documents")} style={styles.primaryBtn}><Text style={styles.primaryText}>Back to My Documents</Text></Pressable>
    </Center>
  );

  const r = req!;
  // Required fields the customer must complete, in strict document order (page, then top→bottom).
  const ordered = r.fields
    .filter(needsUser)
    .sort((a, b) => a.page - b.page || a.rect.y - b.rect.y);
  const doneCount = ordered.filter((f) => !!values[f.id]).length;
  const allDone = doneCount === ordered.length;
  const canSubmit = allDone && declaration && !pageError;
  const activeIndex = ordered.findIndex((f) => !values[f.id]);
  const activeField = activeIndex >= 0 ? ordered[activeIndex] : null;

  const screenW = Dimensions.get("window").width;
  // Desktop web: the document fills the left column (panel on the right).
  const docColW = Math.min(winW, DESKTOP_BODY_MAX) - DESKTOP_PANEL_W - spacing.xl * 2;
  const pageW = isDesktop
    ? Math.min(docColW, 760) * zoom
    : Math.min(screenW - spacing.lg * 2, 520) * zoom;
  const pageFits = pageW <= docColW;

  const fieldState = (f: FieldDefinition): "completed" | "current" | "pending" | "neutral" => {
    if (f.readOnly || f.type === "date_signed" || !needsUser(f)) return values[f.id] ? "completed" : "neutral";
    if (values[f.id]) return "completed";
    if (activeField && f.id === activeField.id) return "current";
    return "pending";
  };

  const scrollToField = (f: FieldDefinition) => {
    const pg = r.pages.find((p) => p.page === f.page);
    if (!pg) return;
    const h = pageDisplaySize(pg, pageW).height;
    const base = pageYOffset.current[f.page] ?? 0;
    const y = base + 22 + f.rect.y * h - 90; // 22 ≈ page label; 90 keeps it below the sticky bars
    scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
  };

  const flashLock = () => {
    setLockHint(true);
    if (activeField) scrollToField(activeField);
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => setLockHint(false), 2400);
  };

  const onFieldPress = (f: FieldDefinition) => {
    if (f.readOnly || f.type === "date_signed") return;
    if (fieldState(f) === "pending") { flashLock(); return; } // locked until earlier fields done
    setEditing(f); // current field, or re-editing a completed one
  };

  const openActiveField = () => {
    if (!activeField) return;
    scrollToField(activeField);
    setEditing(activeField);
  };

  const handleDone = (fieldId: string, v: string) => {
    setEditing(null);
    setValues((prev) => {
      const nv = { ...prev, [fieldId]: v };
      const next = ordered.find((f) => !nv[f.id]); // next incomplete in order
      setTimeout(() => { if (next) scrollToField(next); }, 300); // auto-flip/scroll to it
      return nv;
    });
  };

  const submit = async () => {
    if (!canSubmit || submitting) return; // guards repeated taps
    setSubmitting(true); setSubmitError(null);
    try {
      await svc.submit({
        signingRequestId: r.signingRequestId,
        documentVersion: r.documentVersion,
        fields: Object.entries(values).map(([fieldId, value]) => ({ fieldId, value })),
        declaration: { version: r.declaration.version, accepted: true },
        idempotencyKey: idemKey.current, // reused on retry => no duplicate signing
      });
      router.replace(`/documents/${r.signingRequestId}/status`);
    } catch (e: any) {
      const code = e?.code;
      if (code === "cancelled" || code === "expired" || code === "superseded") {
        setTerminal({ code, message: e?.message || "This request can no longer be signed." });
      } else {
        setSubmitError(e?.message || "Submission failed. Please check your connection and try again.");
      }
      setSubmitting(false);
    }
  };

  const onStepPress = (f: FieldDefinition) => {
    if (fieldState(f) !== "pending") scrollToField(f);
    onFieldPress(f);
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable testID="review-back" onPress={() => router.back()} hitSlop={10} style={{ width: 24 }}><Icon name="arrowLeft" size={24} color={colors.heading} /></Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>{r.title}</Text>
        <Text style={styles.headerSub} numberOfLines={1}>{r.businessName}</Text>
      </View>
      <View style={styles.zoomRow}>
        <Pressable testID="zoom-out" onPress={() => setZoom((z) => Math.max(0.75, z - 0.25))} hitSlop={8}><Text style={styles.zoomBtn}>−</Text></Pressable>
        <Pressable testID="zoom-in" onPress={() => setZoom((z) => Math.min(2, z + 0.25))} hitSlop={8}><Text style={styles.zoomBtn}>+</Text></Pressable>
      </View>
    </View>
  );

  const demoBanner = svc.isMock ? <View style={styles.demoBanner}><Text style={styles.demoText}>Demo signing — not a live signed document</Text></View> : null;

  const lockHintEl = lockHint ? (
    <View style={[styles.lockHintBox, isDesktop && dsk.lockHint]} testID="lock-hint">
      <Icon name="warning" size={15} color="#92400E" />
      <Text style={styles.lockHintText}>Please complete the highlighted field first.</Text>
    </View>
  ) : null;

  const pageErrorEl = pageError ? (
    <View style={styles.pageErrorBox}>
      <Icon name="warning" size={18} color="#B91C1C" />
      <Text style={styles.pageErrorText}>We couldn&apos;t display this document. Your first-open hasn&apos;t been recorded.</Text>
      <Pressable testID="page-reload" onPress={load} style={styles.pageReloadBtn}><Text style={styles.pageReloadText}>Reload</Text></Pressable>
    </View>
  ) : null;

  const devBadgeEl = __DEV__ ? (
    <View style={styles.devBadge}><Text style={styles.devBadgeText} testID="dev-firstopen">first-open (dev): {foStatus}</Text></View>
  ) : null;

  const pagesEl = r.pages.map((pg, idx) => {
    const size = pageDisplaySize(pg, pageW);
    const first = idx === 0;
    return (
      <View key={pg.page} onLayout={(e) => { pageYOffset.current[pg.page] = e.nativeEvent.layout.y; }}>
        <Text style={styles.pageLabel}>Page {pg.page} of {r.pageCount}</Text>
        <DocumentPageCanvas
          pageSpec={pg}
          displayWidth={pageW}
          label={r.title}
          isFirstPage={first}
          simulateRenderFailure={first && renderFail}
          onContentDisplayed={first ? onContentDisplayed : undefined}
          onContentError={first ? onContentError : undefined}
        >
          {r.fields.filter((f) => f.page === pg.page).map((f) => (
            <FieldOverlay key={f.id} field={f} size={size} value={values[f.id]} state={fieldState(f)} onPress={() => onFieldPress(f)} />
          ))}
        </DocumentPageCanvas>
      </View>
    );
  });

  const submitErrorEl = submitError ? (
    <View style={styles.submitErrBox}>
      <Icon name="warning" size={16} color="#B91C1C" />
      <Text style={styles.submitErrText}>{submitError}</Text>
    </View>
  ) : null;

  const declarationEl = (
    <Pressable testID="declaration" onPress={() => allDone && setDeclaration((d) => !d)} disabled={!allDone} style={[styles.declRow, !allDone && { opacity: 0.5 }]}>
      <View style={[styles.checkbox, declaration && styles.checkboxOn]}>{declaration ? <Icon name="check" size={14} color="#FFF" /> : null}</View>
      <Text style={styles.declText}>{allDone ? r.declaration.text : "Complete all required fields to confirm and sign."}</Text>
    </Pressable>
  );

  const signingForEl = (
    <Text style={styles.signingFor}>Signing for <Text style={styles.bold}>{r.businessName}</Text> as <Text style={styles.bold}>{r.signer.name}</Text></Text>
  );

  const submitEl = (
    <Pressable testID="sign-submit" onPress={submit} disabled={!canSubmit || submitting} style={[styles.primaryBtn, (!canSubmit || submitting) && { opacity: 0.45 }]}>
      {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{submitError ? "Try again" : "Sign and submit"}</Text>}
    </Pressable>
  );

  const editorEl = editing ? (
    <Portal>
      <View style={styles.modalWrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
        <View style={styles.modalCard}>
          <FieldEditor
            field={editing}
            value={values[editing.id]}
            onCancel={() => setEditing(null)}
            onDone={(v) => handleDone(editing.id, v)}
          />
        </View>
      </View>
    </Portal>
  ) : null;

  const nextLabel = doneCount === 0 ? "Start signing" : "Next required field";

  // DESKTOP WEB ONLY: document on the left, sticky signing panel on the right.
  if (isDesktop) {
    const pct = ordered.length ? Math.round((doneCount / ordered.length) * 100) : 100;
    return (
      <View style={styles.root}>
        {header}
        {demoBanner}
        <View style={dsk.body}>
          <ScrollView
            ref={scrollRef}
            style={[dsk.docScroll, { overflowX: "auto" } as any]}
            contentContainerStyle={[dsk.docContent, !pageFits && { alignItems: "flex-start" }]}
          >
            {pageErrorEl}
            {devBadgeEl}
            {pagesEl}
          </ScrollView>
          <View style={dsk.panel} testID="desktop-sign-panel">
            <ScrollView contentContainerStyle={dsk.panelScroll}>
              <Text style={dsk.kicker}>Signing progress</Text>
              <Text style={dsk.progressTitle}>{doneCount} of {ordered.length} fields completed</Text>
              <View style={dsk.track}><View style={[dsk.trackFill, { width: `${pct}%` }]} /></View>
              {activeField ? (
                <Pressable testID="next-field" onPress={openActiveField} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>{nextLabel}</Text>
                </Pressable>
              ) : (
                <View style={dsk.allDone} testID="all-fields-done">
                  <Icon name="check" size={16} color="#047857" />
                  <Text style={dsk.allDoneText}>All required fields completed</Text>
                </View>
              )}
              {lockHintEl}
              <Text style={[dsk.kicker, { marginTop: spacing.md }]}>Fields to complete</Text>
              {ordered.map((f, i) => (
                <StepRow key={f.id} index={i + 1} field={f} state={fieldState(f)} onPress={() => onStepPress(f)} />
              ))}
            </ScrollView>
            <View style={dsk.panelFooter}>
              {submitErrorEl}
              {declarationEl}
              {signingForEl}
              {submitEl}
            </View>
          </View>
        </View>
        {editorEl}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}

      {demoBanner}

      <View style={styles.progressBar}>
        <Text style={styles.progressText}>{doneCount} of {ordered.length} fields completed</Text>
        <Pressable testID="next-field" onPress={openActiveField} style={styles.nextBtn} disabled={!activeField}>
          <Text style={[styles.nextText, !activeField && { opacity: 0.4 }]}>{nextLabel}</Text>
        </Pressable>
      </View>

      {lockHintEl}

      <ScrollView ref={scrollRef} contentContainerStyle={{ alignItems: "center", padding: spacing.lg, paddingBottom: insets.bottom + 180, gap: spacing.lg }}>
        {pageErrorEl}
        {devBadgeEl}
        {pagesEl}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {submitErrorEl}
        {declarationEl}
        {signingForEl}
        {submitEl}
      </View>

      {editorEl}
    </View>
  );
}

/** Desktop-only step list row in the right-hand signing panel. */
function StepRow({ index, field, state, onPress }: {
  index: number;
  field: FieldDefinition;
  state: "completed" | "current" | "pending" | "neutral";
  onPress: () => void;
}) {
  const done = state === "completed";
  const cur = state === "current";
  const sig = field.type === "signature" || field.type === "initials";
  const status = done ? "Completed" : cur ? (sig ? "Sign now" : "Fill now") : "Complete earlier fields first";
  return (
    <Pressable testID={`step-${field.id}`} onPress={onPress} style={({ pressed }) => [dsk.step, cur && dsk.stepCurrent, pressed && { opacity: 0.85 }]}>
      <View style={[dsk.stepNum, done && dsk.stepNumDone, cur && dsk.stepNumCurrent]}>
        {done ? <Icon name="check" size={13} color="#FFFFFF" /> : <Text style={[dsk.stepNumText, cur && { color: "#FFFFFF" }]}>{index}</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={dsk.stepLabel} numberOfLines={1}>{field.label}</Text>
        <Text style={[dsk.stepMeta, cur && { color: colors.brandPrimary }]}>Page {field.page} · {status}</Text>
      </View>
      <Icon name={state === "pending" ? "lock" : "chevronRight"} size={15} color={colors.muted} />
    </Pressable>
  );
}

function FieldOverlay({ field, size, value, state, onPress }: {
  field: FieldDefinition;
  size: { width: number; height: number };
  value?: string;
  state: "completed" | "current" | "pending" | "neutral";
  onPress: () => void;
}) {
  const box = { left: field.rect.x * size.width, top: field.rect.y * size.height, width: field.rect.w * size.width, height: field.rect.h * size.height };
  const isDate = field.type === "date_signed";
  const done = state === "completed";
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state !== "current") { pulse.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const stateStyle =
    state === "completed" ? styles.overlayDone :
    state === "current" ? styles.overlayCurrent :
    state === "pending" ? styles.overlayPending :
    styles.overlayDate;

  const animStyle = state === "current" ? {
    borderColor: pulse.interpolate({ inputRange: [0, 1], outputRange: [colors.brandPrimary, "#FF2D55"] }),
    backgroundColor: pulse.interpolate({ inputRange: [0, 1], outputRange: ["rgba(255,107,71,0.10)", "rgba(255,45,85,0.20)"] }),
  } : null;

  const sig = field.type === "signature" || field.type === "initials";

  return (
    <Animated.View style={[styles.overlay, box, stateStyle, animStyle]} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {sig && done ? (
          <SignatureThumb dataUri={value!} width={box.width} height={box.height} />
        ) : (
          <View style={styles.overlayCenter}>
            <Text numberOfLines={1} style={[styles.overlayLabel, done && styles.overlayLabelDone, state === "current" && styles.overlayLabelCurrent]}>
              {isDate ? "Filled automatically on submission" : done ? value : field.label}
            </Text>
          </View>
        )}
      </View>
      {state === "current" ? (
        <View style={styles.currentTag} pointerEvents="none"><Text style={styles.currentTagText}>{sig ? "Sign here" : "Fill now"}</Text></View>
      ) : null}
      <Pressable testID={`field-${field.id}`} onPress={onPress} disabled={isDate} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function SignatureThumb({ dataUri, width, height }: { dataUri: string; width: number; height: number }) {
  const { viewBox, ds } = extractSvg(dataUri);
  return (
    <Svg width={width} height={height} viewBox={viewBox}>
      {ds.map((d, i) => (
        <Path key={i} d={d} fill="none" stroke="#111" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/** Extract the viewBox and ALL path `d` strings from a signature SVG data URI. */
function extractSvg(dataUri: string): { viewBox: string; ds: string[] } {
  const viewBox = dataUri.match(/viewBox="([^"]+)"/)?.[1] || "0 0 320 180";
  const ds = Array.from(dataUri.matchAll(/d="([^"]+)"/g)).map((m) => m[1]);
  return { viewBox, ds };
}

function FieldEditor({ field, value, onCancel, onDone }: { field: FieldDefinition; value?: string; onCancel: () => void; onDone: (v: string) => void }) {
  const [text, setText] = useState(value ?? field.prefill ?? "");
  if (field.type === "signature" || field.type === "initials") {
    return <SignaturePad title={field.type === "initials" ? "Draw your initials" : "Draw your signature"} onApply={(d) => onDone(d)} onCancel={onCancel} />;
  }
  if (field.type === "acknowledgement") {
    return (
      <View style={{ gap: spacing.md }}>
        <Text style={styles.editTitle}>{field.label}</Text>
        <Pressable testID="ack-confirm" onPress={() => onDone("true")} style={styles.primaryBtn}><Text style={styles.primaryText}>I acknowledge</Text></Pressable>
        <Pressable onPress={onCancel} style={styles.ghostBtn}><Text style={styles.ghostText}>Cancel</Text></Pressable>
      </View>
    );
  }
  const kb = field.type === "email" ? "email-address" : field.type === "telephone" ? "phone-pad" : "default";
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.editTitle}>{field.label}</Text>
      <TextInput
        testID="field-input"
        defaultValue={text}
        onChangeText={setText}
        keyboardType={kb as any}
        autoCapitalize={field.type === "email" ? "none" : "words"}
        placeholder={field.label}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <Pressable testID="field-save" onPress={() => onDone(text.trim())} disabled={!text.trim()} style={[styles.primaryBtn, !text.trim() && { opacity: 0.45 }]}><Text style={styles.primaryText}>Save</Text></Pressable>
      <Pressable onPress={onCancel} style={styles.ghostBtn}><Text style={styles.ghostText}>Cancel</Text></Pressable>
    </View>
  );
}

const Center = ({ children }: { children: React.ReactNode }) => <View style={styles.center}>{children}</View>;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  headerTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  headerSub: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted },
  zoomRow: { flexDirection: "row", gap: spacing.md },
  zoomBtn: { fontFamily: font.bold, fontSize: 22, color: colors.heading, width: 22, textAlign: "center" },
  demoBanner: { backgroundColor: "#FEF3C7", paddingVertical: spacing.sm },
  demoText: { fontFamily: font.semibold, fontSize: type.sm, color: "#92400E", textAlign: "center" },
  progressBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  progressText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.heading },
  nextBtn: {},
  nextText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },
  pageLabel: { fontFamily: font.semibold, fontSize: type.kicker, color: colors.muted, marginBottom: 6 },
  pageErrorBox: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#FEE2E2", borderRadius: radius.sm, padding: spacing.md },
  pageErrorText: { flex: 1, fontFamily: font.semibold, fontSize: type.kicker, color: "#B91C1C" },
  pageReloadBtn: { backgroundColor: "#B91C1C", paddingHorizontal: spacing.md, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  pageReloadText: { fontFamily: font.semibold, fontSize: type.kicker, color: "#FFF" },
  devBadge: { alignSelf: "stretch", backgroundColor: "#111827", borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: spacing.md },
  devBadgeText: { fontFamily: font.semibold, fontSize: type.kicker, color: "#A7F3D0" },
  lockHintBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#FEF3C7", paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  lockHintText: { fontFamily: font.semibold, fontSize: type.kicker, color: "#92400E" },
  overlay: { position: "absolute", borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.muted, borderRadius: 4 },
  overlayCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  overlayDone: { borderStyle: "solid", borderWidth: 1.5, borderColor: colors.success, backgroundColor: "rgba(16,185,129,0.10)" },
  overlayCurrent: { borderStyle: "solid", borderWidth: 2.5, borderColor: colors.brandPrimary, backgroundColor: "rgba(255,107,71,0.12)" },
  overlayPending: { borderStyle: "dashed", borderWidth: 1.5, borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.08)" },
  overlayDate: { borderStyle: "dashed", borderColor: colors.muted, backgroundColor: "rgba(100,116,139,0.06)" },
  overlayLabel: { fontFamily: font.semibold, fontSize: 10, color: "#B45309", textAlign: "center" },
  overlayLabelDone: { color: colors.onSurface },
  overlayLabelCurrent: { color: colors.brandPrimary },
  currentTag: { position: "absolute", top: -11, left: -1, backgroundColor: colors.brandPrimary, paddingHorizontal: 6, height: 16, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  currentTagText: { fontFamily: font.bold, fontSize: 9, color: "#FFFFFF" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider, padding: spacing.lg, gap: spacing.sm },
  submitErrBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#FEE2E2", borderRadius: radius.sm, padding: spacing.sm },
  submitErrText: { flex: 1, fontFamily: font.semibold, fontSize: type.kicker, color: "#B91C1C" },
  declRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  declText: { flex: 1, fontFamily: font.regular, fontSize: type.sm, color: colors.onSurface },
  signingFor: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted },
  bold: { fontFamily: font.semibold, color: colors.heading },
  terminalIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  primaryBtn: { height: 50, borderRadius: radius.md, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  primaryText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onBrandPrimary },
  ghostBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  ghostText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceSecondary },
  msgTitle: { fontFamily: font.bold, fontSize: type.title, color: colors.heading },
  msgSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, textAlign: "center" },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg },
  editTitle: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  input: { height: 50, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: spacing.md, fontFamily: font.regular, fontSize: type.base, color: colors.onSurface },
});

// Desktop web only (≥1024px). Never applied on iOS/Android.
const dsk = StyleSheet.create({
  body: { flex: 1, flexDirection: "row", width: "100%", maxWidth: DESKTOP_BODY_MAX, alignSelf: "center" },
  docScroll: { flex: 1 },
  docContent: { alignItems: "center", padding: spacing.xl, paddingBottom: spacing["3xl"], gap: spacing.xl },
  panel: { width: DESKTOP_PANEL_W, backgroundColor: colors.surface, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.divider },
  panelScroll: { padding: spacing.xl, gap: spacing.sm },
  panelFooter: { padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  kicker: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted },
  progressTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, letterSpacing: -0.3 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary, overflow: "hidden", marginBottom: spacing.sm },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: colors.success },
  allDone: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#D1FAE5", borderRadius: radius.sm, paddingHorizontal: spacing.md, height: 50 },
  allDoneText: { fontFamily: font.semibold, fontSize: type.base, color: "#047857" },
  lockHint: { borderRadius: radius.sm, paddingHorizontal: spacing.md },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  stepCurrent: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  stepNum: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  stepNumDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepNumCurrent: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  stepNumText: { fontFamily: font.bold, fontSize: type.kicker, color: colors.muted },
  stepLabel: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  stepMeta: { fontFamily: font.regular, fontSize: type.kicker, color: colors.muted, marginTop: 2 },
});
