import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/screen";
import { useAuth } from "@/src/auth/auth-context";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type Svc = { key: string; label: string; icon: IconName; color: string };
const SERVICES: Svc[] = [
  { key: "electric", label: "Electric", icon: "bolt", color: "#F59E0B" },
  { key: "gas", label: "Gas", icon: "fire", color: "#FB923C" },
  { key: "water", label: "Water", icon: "droplet", color: "#3B82F6" },
  { key: "telecoms", label: "Telecoms", icon: "phone", color: "#0EA5E9" },
];

const WINDOWS = [
  { value: "out_of_contract", label: "Out of Contract" },
  { value: "under_6m", label: "Under 6 months" },
  { value: "6_12m", label: "6–12 months" },
  { value: "over_12m", label: "Over 12 months" },
];

type Meter = { _id: string; utility: "electric" | "gas"; supplier: string; contract_end_window: string };

let mid = 0;
const newMeter = (u: "electric" | "gas"): Meter => ({ _id: `m${mid++}`, utility: u, supplier: "", contract_end_window: "" });

export default function QuoteWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ utility?: string; incumbent?: string; property?: string }>();

  const [properties, setProperties] = useState<any[]>([]);
  const [changedSite, setChangedSite] = useState(false);

  const preUtil = (params.utility || "").toLowerCase();
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (["electricity", "electric"].includes(preUtil)) s.add("electric");
    else if (preUtil === "gas") s.add("gas");
    return s;
  });
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [addr, setAddr] = useState({
    business_name: "",
    full_address: "",
    postcode: "",
    is_supply_address: true,
    supply_postcode: "",
    property_id: params.property || "",
  });
  const [meters, setMeters] = useState<Meter[]>(() => {
    const arr: Meter[] = [];
    if (["electricity", "electric"].includes(preUtil)) arr.push({ ...newMeter("electric"), supplier: params.incumbent || "" });
    if (preUtil === "gas") arr.push({ ...newMeter("gas"), supplier: params.incumbent || "" });
    return arr;
  });
  const [waterSupplier, setWaterSupplier] = useState("");
  const [telecomsSupplier, setTelecomsSupplier] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<any>(null);

  const clearFieldError = (k: string) =>
    setFieldErrors((p) => {
      if (!p[k]) return p;
      const n = { ...p };
      delete n[k];
      return n;
    });

  const fillFromProperty = (p: any) =>
    setAddr((a) => ({
      ...a,
      property_id: p.id || p._id || "",
      business_name: a.business_name || p.business_name || "",
      full_address: p.address || p.property_name || a.full_address,
      postcode: p.postcode || a.postcode,
    }));

  // Prefill contact from the signed-in account
  useEffect(() => {
    if (user) {
      setContact((c) => ({
        name: c.name || user.full_name || "",
        email: c.email || user.email || "",
        phone: c.phone || (user as any).phone || "",
      }));
    }
  }, [user]);

  // Load saved sites; auto-fill if arriving from a specific site
  useEffect(() => {
    apiRequest<any[]>("/properties")
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setProperties(arr);
        if (params.property) {
          const match = arr.find((p) => (p.id || p._id) === params.property);
          if (match) fillFromProperty(match);
        }
      })
      .catch(() => setProperties([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lockedSite = useMemo(
    () => (params.property ? properties.find((p) => (p.id || p._id) === params.property) : null),
    [params.property, properties],
  );

  const flow = useMemo(() => {
    const f = ["service", "global"];
    if (selected.has("electric") || selected.has("gas")) f.push("energy");
    if (selected.has("water")) f.push("water");
    if (selected.has("telecoms")) f.push("telecoms");
    f.push("review");
    return f;
  }, [selected]);

  const current = flow[step];
  const isLast = step >= flow.length - 1;

  const toggle = (k: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      // sync energy meters
      setMeters((ms) => {
        let next = [...ms];
        if ((k === "electric" || k === "gas")) {
          const has = next.some((m) => m.utility === k);
          if (n.has(k) && !has) next.push(newMeter(k as any));
          if (!n.has(k)) next = next.filter((m) => m.utility !== k);
        }
        return next;
      });
      return n;
    });
  };

  const updateMeter = (id: string, patch: Partial<Meter>) =>
    setMeters((ms) => ms.map((m) => (m._id === id ? { ...m, ...patch } : m)));
  const removeMeter = (id: string) => setMeters((ms) => ms.filter((m) => m._id !== id));

  const validateStep = (): boolean => {
    if (current === "service") return selected.size > 0;
    if (current === "global")
      return !!(contact.name.trim() && contact.email.trim() && (addr.is_supply_address || addr.supply_postcode.trim()) && (addr.business_name.trim() || addr.full_address.trim()));
    if (current === "energy") return meters.every((m) => m.supplier.trim() && m.contract_end_window);
    if (current === "water") return waterSupplier.trim().length > 0;
    if (current === "telecoms") return telecomsSupplier.trim().length > 0;
    return true;
  };

  const globalFieldErrors = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!contact.name.trim()) e.name = "Name is required";
    if (!contact.email.trim()) e.email = "Email is required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email.trim())) e.email = "Enter a valid email";
    if (!addr.business_name.trim()) e.business_name = "Business name is required";
    if (!addr.full_address.trim()) e.full_address = "Address is required";
    if (!addr.postcode.trim()) e.postcode = "Postcode is required";
    if (!addr.is_supply_address && !addr.supply_postcode.trim()) e.supply_postcode = "Supply postcode is required";
    return e;
  };

  const next = () => {
    setError("");
    if (current === "service") {
      if (selected.size === 0) {
        setError("Pick at least one service to continue.");
        return;
      }
    } else if (current === "global") {
      const fe = globalFieldErrors();
      if (Object.keys(fe).length > 0) {
        setFieldErrors(fe);
        setError("Please complete the required fields marked in red.");
        scrollRef.current?.scrollTo?.({ y: 0, animated: true });
        return;
      }
    } else if (current === "energy") {
      if (!meters.every((m) => m.supplier.trim() && m.contract_end_window)) {
        setError("Add a supplier and contract end date for each meter.");
        return;
      }
    } else if (current === "water" && !waterSupplier.trim()) {
      setError("Enter your current water supplier.");
      return;
    } else if (current === "telecoms" && !telecomsSupplier.trim()) {
      setError("Enter your current telecoms supplier.");
      return;
    }
    setStep((s) => Math.min(flow.length - 1, s + 1));
  };
  const back = () => {
    setError("");
    if (step === 0) router.back();
    else setStep((s) => Math.max(0, s - 1));
  };

  const submit = async () => {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await apiRequest<any>("/quotes/multi", {
        method: "POST",
        body: {
          selected_services: Array.from(selected),
          contact,
          address: addr,
          energy_meters: meters.map(({ _id, ...m }) => m),
          water_supplier: selected.has("water") ? waterSupplier : null,
          telecoms_supplier: selected.has("telecoms") ? telecomsSupplier : null,
        },
      });
      const id = res?.quote_request_id || res?.id;
      router.replace(`/quote/success/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const electricMeters = meters.filter((m) => m.utility === "electric");
  const gasMeters = meters.filter((m) => m.utility === "gas");

  return (
    <View style={styles.root}>
      <ScreenHeader testID="quote-header" title="Get a Quote" subtitle={`Step ${step + 1} of ${flow.length}`} onBack={back} />

      <View style={styles.pips}>
        {flow.map((s, i) => (
          <View key={s} testID={`quote-step-pip-${i}`} style={[styles.pip, { backgroundColor: i <= step ? colors.heading : colors.border }]} />
        ))}
      </View>

      <KeyboardAwareScrollView ref={scrollRef} contentContainerStyle={styles.scroll} bottomOffset={90} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {current === "service" && (
          <View testID="step-service">
            <Text style={styles.h2}>Which services do you need a quote for?</Text>
            <Text style={styles.muted}>Pick all that apply — we&apos;ll only ask the questions we need.</Text>
            <View style={styles.svcGrid}>
              {SERVICES.map((s) => {
                const on = selected.has(s.key);
                return (
                  <Pressable key={s.key} testID={`service-${s.key}`} onPress={() => toggle(s.key)} style={[styles.svcCard, on && styles.svcCardOn]}>
                    <View style={[styles.svcIcon, { backgroundColor: `${s.color}22` }]}>
                      <Icon name={s.icon} size={24} color={s.color} />
                    </View>
                    <Text style={styles.svcLabel}>{s.label}</Text>
                    {on && <Text style={styles.svcSelected}>SELECTED</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {current === "global" && (
          <View testID="step-global" style={{ gap: spacing.md }}>
            <Text style={styles.h2}>Your details</Text>
            <Text style={styles.muted}>
              {user
                ? "Pre-filled from your account — edit if a colleague should receive the quote instead."
                : "Tell us who should receive the quote and where the supply is."}
            </Text>
            <Labeled label="Your name" required error={fieldErrors.name} testID="quote-error-name">
              <TextInput testID="quote-contact-name" value={contact.name} onChangeText={(t) => { setContact((c) => ({ ...c, name: t })); clearFieldError("name"); }} placeholder="Your name" placeholderTextColor={colors.muted} style={[styles.input, fieldErrors.name && styles.inputError]} />
            </Labeled>
            <Labeled label="Email" required error={fieldErrors.email} testID="quote-error-email">
              <TextInput testID="quote-contact-email" value={contact.email} onChangeText={(t) => { setContact((c) => ({ ...c, email: t })); clearFieldError("email"); }} placeholder="you@company.co.uk" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" style={[styles.input, fieldErrors.email && styles.inputError]} />
            </Labeled>
            <Labeled label="Phone (optional)">
              <TextInput testID="quote-contact-phone" value={contact.phone} onChangeText={(t) => setContact((c) => ({ ...c, phone: t }))} placeholder="07123 456789" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
            </Labeled>
            <Text style={[styles.h3, { marginTop: spacing.sm }]}>Site</Text>
            {lockedSite && !changedSite ? (
              <View style={styles.lockedSite} testID="quote-locked-site">
                <View style={styles.lockedIcon}>
                  <Icon name="building" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.lockedKicker}>QUOTE FOR THIS SITE</Text>
                  <Text style={styles.lockedName} numberOfLines={1}>{lockedSite.property_name || lockedSite.address}</Text>
                  <Text style={styles.lockedAddr} numberOfLines={1}>{[lockedSite.address, lockedSite.postcode].filter(Boolean).join(", ")}</Text>
                </View>
                {properties.length > 1 && (
                  <Pressable testID="quote-change-site" onPress={() => setChangedSite(true)}>
                    <Text style={styles.changeLink}>Change</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              properties.length > 0 && (
                <View testID="quote-property-select" style={{ gap: spacing.xs }}>
                  <Text style={styles.label}>Use a saved site</Text>
                  <View style={styles.chipWrap}>
                    {properties.map((p) => {
                      const pid = p.id || p._id;
                      const on = addr.property_id === pid;
                      return (
                        <Pressable
                          key={pid}
                          testID={`quote-site-${pid}`}
                          onPress={() => { fillFromProperty(p); clearFieldError("business_name"); clearFieldError("full_address"); clearFieldError("postcode"); }}
                          style={[styles.chip, on && styles.chipOn]}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.property_name || p.address}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )
            )}
            <Labeled label="Business name" required error={fieldErrors.business_name} testID="quote-error-business">
              <TextInput testID="quote-business-name" value={addr.business_name} onChangeText={(t) => { setAddr((a) => ({ ...a, business_name: t })); clearFieldError("business_name"); }} placeholder="BIOS Ltd" placeholderTextColor={colors.muted} style={[styles.input, fieldErrors.business_name && styles.inputError]} />
            </Labeled>
            <Labeled label="Address" required error={fieldErrors.full_address} testID="quote-error-address">
              <TextInput testID="quote-address" value={addr.full_address} onChangeText={(t) => { setAddr((a) => ({ ...a, full_address: t })); clearFieldError("full_address"); }} placeholder="123 Boulevard Avenue" placeholderTextColor={colors.muted} style={[styles.input, fieldErrors.full_address && styles.inputError]} />
            </Labeled>
            <Labeled label="Postcode" required error={fieldErrors.postcode} testID="quote-error-postcode">
              <TextInput testID="quote-postcode" value={addr.postcode} onChangeText={(t) => { setAddr((a) => ({ ...a, postcode: t.toUpperCase() })); clearFieldError("postcode"); }} placeholder="SW1A 1AA" placeholderTextColor={colors.muted} autoCapitalize="characters" style={[styles.input, fieldErrors.postcode && styles.inputError]} />
            </Labeled>
            <Labeled label="Is this the supply address?">
              <View style={styles.segRow}>
                <Pressable testID="quote-supply-yes" onPress={() => setAddr((a) => ({ ...a, is_supply_address: true }))} style={[styles.seg, addr.is_supply_address && styles.segOn]}>
                  <Text style={[styles.segText, addr.is_supply_address && styles.segTextOn]}>Yes</Text>
                </Pressable>
                <Pressable testID="quote-supply-no" onPress={() => setAddr((a) => ({ ...a, is_supply_address: false }))} style={[styles.seg, !addr.is_supply_address && styles.segOn]}>
                  <Text style={[styles.segText, !addr.is_supply_address && styles.segTextOn]}>No — different site</Text>
                </Pressable>
              </View>
            </Labeled>
            {!addr.is_supply_address && (
              <Labeled label="Supply postcode" required error={fieldErrors.supply_postcode} testID="quote-error-supply-postcode">
                <TextInput testID="quote-supply-postcode" value={addr.supply_postcode} onChangeText={(t) => { setAddr((a) => ({ ...a, supply_postcode: t.toUpperCase() })); clearFieldError("supply_postcode"); }} placeholder="EC2A 4BX" placeholderTextColor={colors.muted} autoCapitalize="characters" style={[styles.input, fieldErrors.supply_postcode && styles.inputError]} />
              </Labeled>
            )}
          </View>
        )}

        {current === "energy" && (
          <View testID="step-energy">
            <Text style={styles.h2}>Energy details</Text>
            <Text style={styles.muted}>Tell us about each meter at this site.</Text>
            {electricMeters.length > 0 && (
              <MeterGroup title="Electric" color="#F59E0B" icon="bolt" list={electricMeters} onUpdate={updateMeter} onRemove={removeMeter} onAdd={() => setMeters((m) => [...m, newMeter("electric")])} />
            )}
            {gasMeters.length > 0 && (
              <MeterGroup title="Gas" color="#FB923C" icon="fire" list={gasMeters} onUpdate={updateMeter} onRemove={removeMeter} onAdd={() => setMeters((m) => [...m, newMeter("gas")])} />
            )}
          </View>
        )}

        {current === "water" && (
          <SupplierStep testID="water" title="Who's your current Water supplier?" placeholder="e.g. Anglian Water, Thames Water" value={waterSupplier} onChange={setWaterSupplier} />
        )}
        {current === "telecoms" && (
          <SupplierStep testID="telecoms" title="Who's your current Telecoms supplier?" placeholder="e.g. BT, Virgin, Sky Business" value={telecomsSupplier} onChange={setTelecomsSupplier} />
        )}

        {current === "review" && (
          <View testID="step-review" style={{ gap: spacing.md }}>
            <Text style={styles.h2}>Review</Text>
            <Text style={styles.muted}>Ready to submit? We&apos;ll handle the rest.</Text>
            <View style={styles.reviewCard}>
              <ReviewRow label="Services" value={Array.from(selected).map((k) => SERVICES.find((s) => s.key === k)?.label).join(", ")} />
              <ReviewRow label="Contact" value={`${contact.name} · ${contact.email}`} />
              <ReviewRow label="Business" value={addr.business_name || addr.full_address} />
              {meters.map((m, i) => (
                <ReviewRow key={m._id} label={`${m.utility === "gas" ? "Gas" : "Electric"} meter ${i + 1}`} value={`${m.supplier || "—"} · ${WINDOWS.find((w) => w.value === m.contract_end_window)?.label || "—"}`} />
              ))}
              {selected.has("water") && <ReviewRow label="Water" value={waterSupplier} />}
              {selected.has("telecoms") && <ReviewRow label="Telecoms" value={telecomsSupplier} />}
            </View>
          </View>
        )}

        {!!error && <Text testID="wizard-error" style={styles.error}>{error}</Text>}

        <View style={styles.navRow}>
          {step > 0 && (
            <Pressable testID="wizard-back" onPress={back} style={[styles.navBtn, styles.navBack]}>
              <Text style={styles.navBackText}>Back</Text>
            </Pressable>
          )}
          {isLast ? (
            <Pressable testID="wizard-submit" onPress={submit} disabled={submitting} style={[styles.navBtn, styles.navPrimary, { flex: 2 }, submitting && { opacity: 0.6 }]}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Text style={styles.navPrimaryText}>Submit request</Text>
                  <Icon name="chevronRight" size={16} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          ) : (
            <Pressable testID="wizard-next" onPress={next} style={[styles.navBtn, styles.navPrimary, { flex: 2 }, !validateStep() && styles.navPrimarySubtle]}>
              <Text style={styles.navPrimaryText}>Continue</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Labeled({ label, required, error, testID, children }: { label: string; required?: boolean; error?: string; testID?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      {children}
      {!!error && (
        <Text testID={testID} style={styles.fieldError}>{error}</Text>
      )}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow} testID={`review-service-${label}`}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={2}>{value || "—"}</Text>
    </View>
  );
}

function MeterGroup({ title, color, icon, list, onUpdate, onRemove, onAdd }: {
  title: string; color: string; icon: IconName; list: Meter[];
  onUpdate: (id: string, p: Partial<Meter>) => void; onRemove: (id: string) => void; onAdd: () => void;
}) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <View style={styles.meterHead}>
        <View style={[styles.meterHeadIcon, { backgroundColor: `${color}22` }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <Text style={styles.h3}>{title}</Text>
      </View>
      {list.map((m, i) => (
        <View key={m._id} testID={`meter-${m.utility}-${i}`} style={styles.meterCard}>
          <View style={styles.meterTopRow}>
            <Text style={styles.meterTitle}>{title} Meter {i + 1}</Text>
            {i > 0 && (
              <Pressable testID={`meter-${m.utility}-${i}-remove`} onPress={() => onRemove(m._id)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.label}>Supplier</Text>
          <TextInput testID={`meter-${m.utility}-${i}-supplier`} value={m.supplier} onChangeText={(t) => onUpdate(m._id, { supplier: t })} placeholder="e.g. British Gas, EDF, Octopus" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={[styles.label, { marginTop: spacing.sm }]}>Contract end date</Text>
          <View style={styles.chipWrap}>
            {WINDOWS.map((w) => {
              const on = m.contract_end_window === w.value;
              return (
                <Pressable key={w.value} testID={`meter-${m.utility}-${i}-end-${w.value}`} onPress={() => onUpdate(m._id, { contract_end_window: w.value })} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{w.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Pressable testID={`add-meter-${title.toLowerCase()}`} onPress={onAdd} style={styles.addMeter}>
        <Icon name="plus" size={16} color={colors.brandPrimary} />
        <Text style={styles.addMeterText}>Add another {title.toLowerCase()} meter</Text>
      </Pressable>
    </View>
  );
}

function SupplierStep({ title, placeholder, value, onChange, testID }: { title: string; placeholder: string; value: string; onChange: (t: string) => void; testID: string }) {
  return (
    <View testID={`step-${testID}`}>
      <Text style={styles.h2}>{title}</Text>
      <Text style={styles.muted}>Just the supplier name is fine — we&apos;ll take it from there.</Text>
      <TextInput testID={`${testID}-supplier`} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} style={[styles.input, { marginTop: spacing.md }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  pips: { flexDirection: "row", gap: 4, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  pip: { flex: 1, height: 4, borderRadius: 999 },
  scroll: { padding: spacing.lg, paddingBottom: spacing["2xl"] * 2 },
  h2: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, marginBottom: 6 },
  h3: { fontFamily: font.semibold, fontSize: type.lg, color: colors.heading },
  muted: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginBottom: spacing.md, lineHeight: 20 },
  label: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },
  req: { color: "#DC2626", fontFamily: font.bold },
  fieldError: { fontFamily: font.medium, fontSize: type.sm, color: "#DC2626" },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontFamily: font.regular, fontSize: type.lg, color: colors.onSurface, backgroundColor: colors.surface },
  inputError: { borderWidth: 1.5, borderColor: "#DC2626", backgroundColor: "#FEF2F2" },

  svcGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  svcCard: { width: "47%", flexGrow: 1, alignItems: "center", padding: spacing.lg, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  svcCardOn: { borderColor: colors.heading, backgroundColor: "#F5F3FF" },
  svcIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  svcLabel: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  svcSelected: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.4, color: colors.heading, marginTop: 4 },

  segRow: { flexDirection: "row", gap: spacing.sm },
  lockedSite: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", borderRadius: radius.md, padding: spacing.md },
  lockedIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.heading, alignItems: "center", justifyContent: "center" },
  lockedKicker: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.4, color: colors.heading, marginBottom: 2 },
  lockedName: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  lockedAddr: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  changeLink: { fontFamily: font.semibold, fontSize: type.sm, color: colors.heading },
  seg: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  segOn: { borderWidth: 2, borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  segText: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },
  segTextOn: { fontFamily: font.semibold, color: colors.brandPrimary },

  meterHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  meterHeadIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  meterCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  meterTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  meterTitle: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  removeText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.error },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  chipText: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },
  chipTextOn: { fontFamily: font.semibold, color: colors.brandPrimary },
  addMeter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.xs },
  addMeterText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },

  reviewCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  reviewLabel: { fontFamily: font.medium, fontSize: type.sm, color: colors.muted, flexShrink: 0 },
  reviewValue: { fontFamily: font.semibold, fontSize: type.sm, color: colors.heading, flex: 1, textAlign: "right" },

  error: { fontFamily: font.medium, fontSize: type.sm, color: colors.error, marginTop: spacing.md },
  navRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  navBtn: { height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm },
  navBack: { flex: 1, backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  navBackText: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  navPrimary: { backgroundColor: colors.brandPrimary },
  navPrimarySubtle: { opacity: 0.55 },
  navPrimaryText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
});
