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
import { useBusiness } from "@/src/business/business-context";
import { apiRequest } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

type Svc = { key: string; label: string; icon: IconName; color: string };
const SERVICES: Svc[] = [
  { key: "electric", label: "Electricity", icon: "bolt", color: "#F59E0B" },
  { key: "gas", label: "Gas", icon: "fire", color: "#FB923C" },
  { key: "water", label: "Water", icon: "droplet", color: "#3B82F6" },
  { key: "telecoms", label: "Telecoms", icon: "phone", color: "#0EA5E9" },
];
const SVC_ICON: Record<string, { icon: IconName; color: string; label: string }> = {
  electric: { icon: "bolt", color: "#F59E0B", label: "Electricity" },
  gas: { icon: "fire", color: "#FB923C", label: "Gas" },
  water: { icon: "droplet", color: "#3B82F6", label: "Water" },
  telecoms: { icon: "phone", color: "#0EA5E9", label: "Telecoms" },
};

const WINDOWS = [
  { value: "out_of_contract", label: "Out of Contract" },
  { value: "under_6m", label: "Under 6 months" },
  { value: "6_12m", label: "6–12 months" },
  { value: "over_12m", label: "Over 12 months" },
];

type Meter = { _id: string; utility: "electric" | "gas"; supplier: string; contract_end_window: string };
let mid = 0;
const newMeter = (u: "electric" | "gas"): Meter => ({ _id: `m${mid++}`, utility: u, supplier: "", contract_end_window: "" });

const norm = (u: string) => {
  const s = (u || "").toLowerCase();
  if (s === "electricity" || s === "electric") return "electric";
  return s;
};
const outUtil = (k: string) => (k === "electric" ? "electricity" : k);

export default function QuoteWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const { businesses } = useBusiness();

  const params = useLocalSearchParams<{ propertyId?: string; utility?: string; contractId?: string; incumbent?: string }>();
  const deepUtil = norm(params.utility || "");
  const deepPropertyId = params.propertyId || "";
  const contractId = params.contractId || "";
  const entryA = !!(deepUtil && deepPropertyId);

  const [properties, setProperties] = useState<any[]>([]);
  const [forceEditSite, setForceEditSite] = useState(false);

  // supply branch: "" until chosen (Entry B); Entry A implies "existing"
  const [supplyKind, setSupplyKind] = useState<"" | "existing" | "new">(entryA ? "existing" : "");
  const [wizardBizId, setWizardBizId] = useState<string>("");
  const [propertyId, setPropertyId] = useState<string>(entryA ? deepPropertyId : "");

  const [selected, setSelected] = useState<Set<string>>(() => new Set(entryA ? [deepUtil] : []));
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [addr, setAddr] = useState({ business_name: "", full_address: "", postcode: "" });
  const [meters, setMeters] = useState<Meter[]>(() => {
    const arr: Meter[] = [];
    if (deepUtil === "electric") arr.push({ ...newMeter("electric"), supplier: params.incumbent || "" });
    if (deepUtil === "gas") arr.push({ ...newMeter("gas"), supplier: params.incumbent || "" });
    return arr;
  });
  const [waterSupplier, setWaterSupplier] = useState("");
  const [telecomsSupplier, setTelecomsSupplier] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // prefill contact from the signed-in user
  useEffect(() => {
    setContact((c) => ({ ...c, name: c.name || user?.full_name || "", email: c.email || user?.email || "" }));
  }, [user?.full_name, user?.email]);

  // load sites
  useEffect(() => {
    apiRequest<any[]>("/properties")
      .then((arr) => setProperties(Array.isArray(arr) ? arr : []))
      .catch(() => setProperties([]));
  }, []);

  const resolveBizName = (p: any): string => {
    if (!p) return "";
    const owner = businesses.find((b) => b.id === p.business_id);
    if (owner) return owner.company_name;
    if (p.business_name) return p.business_name;
    if (businesses.length === 1) return businesses[0].company_name;
    return "";
  };

  const selectProperty = (p: any) => {
    setPropertyId(p.id || p._id);
    setAddr({
      business_name: resolveBizName(p),
      full_address: `${p.address || ""}${p.postcode ? `, ${p.postcode}` : ""}`.trim(),
      postcode: p.postcode || "",
    });
  };

  // Entry A: auto-select the deep-linked property once sites (and businesses) load.
  useEffect(() => {
    if (!entryA || forceEditSite) return;
    const p = properties.find((x) => (x.id || x._id) === deepPropertyId);
    if (p) selectProperty(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryA, forceEditSite, properties, deepPropertyId]);

  // Rule #2: back-fill owning-business name once businesses resolve.
  useEffect(() => {
    if (!propertyId || addr.business_name) return;
    const p = properties.find((x) => (x.id || x._id) === propertyId);
    const name = resolveBizName(p);
    if (name) setAddr((a) => ({ ...a, business_name: name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses, propertyId, properties]);

  // Entry A: prefill Step 3 from the passed contract (graceful fallback).
  useEffect(() => {
    if (!entryA || !contractId) return;
    apiRequest<any>(`/contracts/${contractId}`)
      .then((c) => {
        const sup = c?.supplier_name || c?.supplier || params.incumbent || "";
        if (sup) setMeters((ms) => ms.map((m) => (m.supplier ? m : { ...m, supplier: sup })));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryA, contractId]);

  const hasSites = properties.length > 0;
  const showBranching = !entryA || forceEditSite;

  const sitesForBiz = useMemo(() => {
    if (businesses.length <= 1 || !wizardBizId) return properties;
    return properties.filter((p) => p.business_id === wizardBizId);
  }, [properties, businesses.length, wizardBizId]);

  // Build the step flow.
  const flow = useMemo(() => {
    const f: string[] = [];
    if (!entryA) f.push("service");
    f.push("details");
    if (selected.has("electric") || selected.has("gas")) f.push("energy");
    if (selected.has("water")) f.push("water");
    if (selected.has("telecoms")) f.push("telecoms");
    f.push("review");
    return f;
  }, [entryA, selected]);

  const current = flow[Math.min(step, flow.length - 1)];
  const isLast = step >= flow.length - 1;

  const toggleService = (key: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      // keep meters in sync
      setMeters((ms) => {
        let next = ms.slice();
        (["electric", "gas"] as const).forEach((k) => {
          const want = n.has(k);
          const have = next.some((m) => m.utility === k);
          if (want && !have) next.push(newMeter(k));
          if (!want) next = next.filter((m) => m.utility !== k);
        });
        return next;
      });
      return n;
    });
  };

  const updateMeter = (id: string, patch: Partial<Meter>) => setMeters((ms) => ms.map((m) => (m._id === id ? { ...m, ...patch } : m)));
  const removeMeter = (id: string) => setMeters((ms) => ms.filter((m) => m._id !== id));

  const chooseSupply = (kind: "existing" | "new") => {
    setSupplyKind(kind);
    if (kind === "new") {
      // Rule #4: clear site-derived fields; keep business_name only on deep-link.
      setPropertyId("");
      setAddr((a) => ({ business_name: entryA ? a.business_name : "", full_address: "", postcode: "" }));
    }
  };

  const detailsValid = (): boolean => {
    if (!contact.name.trim() || !contact.email.trim()) return false;
    if (entryA && !forceEditSite) return true; // context banner
    if (!supplyKind) return false;
    if (supplyKind === "existing") {
      if (businesses.length > 1 && !wizardBizId) return false;
      return !!propertyId;
    }
    return !!(addr.business_name.trim() && addr.full_address.trim() && addr.postcode.trim());
  };

  const canContinue = (): boolean => {
    if (current === "service") return selected.size > 0;
    if (current === "details") return detailsValid();
    if (current === "energy") return meters.every((m) => m.supplier.trim() && m.contract_end_window);
    if (current === "water") return waterSupplier.trim().length > 0;
    if (current === "telecoms") return telecomsSupplier.trim().length > 0;
    return true;
  };

  const next = () => {
    setError("");
    if (!canContinue()) {
      setError("Please complete the highlighted fields to continue.");
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
    setSubmitting(true);
    setError("");
    try {
      const kind: "existing" | "new" = propertyId ? "existing" : "new";
      const payload: any = {
        utilities: Array.from(selected).map(outUtil),
        address: {
          property_id: kind === "existing" ? propertyId : null,
          business_name: addr.business_name,
          full_address: addr.full_address,
          postcode: addr.postcode,
          supply_kind: kind,
        },
        contact: { name: contact.name, email: contact.email, phone: contact.phone || undefined },
      };
      if (selected.has("electric") || selected.has("gas")) {
        payload.energy = meters.map((m) => ({ utility: outUtil(m.utility), supplier: m.supplier, contract_end_window: m.contract_end_window }));
      }
      if (selected.has("water")) payload.water = { supplier: waterSupplier };
      if (selected.has("telecoms")) payload.telecoms = { supplier: telecomsSupplier };

      const res = await apiRequest<any>("/quotes/multi", { method: "POST", body: payload });
      router.replace({ pathname: "/quote/success", params: { id: res?.id || res?.quote_id || "" } });
    } catch (e: any) {
      setError(e?.message || "Something went wrong submitting your quote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const electricMeters = meters.filter((m) => m.utility === "electric");
  const gasMeters = meters.filter((m) => m.utility === "gas");
  const bannerMeta = SVC_ICON[deepUtil] || SVC_ICON.electric;
  const deepProperty = properties.find((x) => (x.id || x._id) === deepPropertyId);

  return (
    <View style={styles.root}>
      <ScreenHeader testID="quote-header" title="Get a Quote" subtitle={`Step ${step + 1} of ${flow.length}`} onBack={back} />
      <View style={styles.pips}>
        {flow.map((s, i) => (
          <View key={s} testID={`quote-step-pip-${i}`} style={[styles.pip, { backgroundColor: i <= step ? colors.heading : colors.border }]} />
        ))}
      </View>
      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {current === "service" && (
          <View testID="step-service">
            <Text style={styles.h2}>What can we quote for?</Text>
            <Text style={styles.muted}>Pick everything you&apos;d like us to shop around for.</Text>
            <View style={styles.svcGrid}>
              {SERVICES.map((s) => {
                const on = selected.has(s.key);
                return (
                  <Pressable key={s.key} testID={`quote-service-${s.key}`} onPress={() => toggleService(s.key)} style={[styles.svcCard, on && styles.svcCardOn]}>
                    <View style={[styles.svcIcon, { backgroundColor: `${s.color}22` }]}>
                      <Icon name={s.icon} size={22} color={s.color} />
                    </View>
                    <Text style={styles.svcLabel}>{s.label}</Text>
                    {on ? <Text style={styles.svcSelected}>SELECTED</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {current === "details" && (
          <View testID="step-global" style={{ gap: spacing.md }}>
            <Text style={styles.h2}>Your details</Text>

            <Labeled label="Name" required>
              <TextInput testID="quote-contact-name" value={contact.name} onChangeText={(t) => setContact((c) => ({ ...c, name: t }))} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input} />
            </Labeled>
            <Labeled label="Email" required>
              <TextInput testID="quote-contact-email" value={contact.email} onChangeText={(t) => setContact((c) => ({ ...c, email: t }))} placeholder="you@business.co.uk" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
            </Labeled>
            <Labeled label="Phone (optional)">
              <TextInput testID="quote-contact-phone" value={contact.phone} onChangeText={(t) => setContact((c) => ({ ...c, phone: t }))} placeholder="07…" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
            </Labeled>

            {entryA && !forceEditSite ? (
              <View testID="quote-context-banner" style={styles.lockedSite}>
                <View style={styles.lockedIcon}>
                  <Icon name={bannerMeta.icon} size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.lockedKicker}>QUOTE FOR {bannerMeta.label.toUpperCase()}</Text>
                  <Text style={styles.lockedName} numberOfLines={1}>{deepProperty?.property_name || deepProperty?.name || "This site"}</Text>
                  <Text style={styles.lockedAddr} numberOfLines={2}>
                    {addr.full_address || "—"}{addr.business_name ? ` · ${addr.business_name}` : ""}
                  </Text>
                </View>
                <Pressable testID="quote-change-site" onPress={() => { setForceEditSite(true); setSupplyKind(""); }} hitSlop={8}>
                  <Text style={styles.changeLink}>Change site →</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                <Text style={styles.label}>Where is the supply?</Text>
                <Pressable testID="quote-supply-existing" disabled={!hasSites} onPress={() => chooseSupply("existing")} style={[styles.radioRow, supplyKind === "existing" && styles.radioRowOn, !hasSites && { opacity: 0.5 }]}>
                  <View style={[styles.radio, supplyKind === "existing" && styles.radioOn]}>{supplyKind === "existing" && <View style={styles.radioDot} />}</View>
                  <Text style={styles.radioText}>One of my existing sites</Text>
                </Pressable>
                <Pressable testID="quote-supply-new" onPress={() => chooseSupply("new")} style={[styles.radioRow, supplyKind === "new" && styles.radioRowOn]}>
                  <View style={[styles.radio, supplyKind === "new" && styles.radioOn]}>{supplyKind === "new" && <View style={styles.radioDot} />}</View>
                  <Text style={styles.radioText}>A new supply — I&apos;ll enter details</Text>
                </Pressable>

                {supplyKind === "existing" && (
                  <>
                    {businesses.length > 1 && (
                      <Labeled label="Business">
                        <View testID="quote-business-select" style={styles.chipWrap}>
                          {businesses.map((b) => {
                            const on = wizardBizId === b.id;
                            return (
                              <Pressable key={b.id} testID={`quote-business-opt-${b.id}`} onPress={() => { setWizardBizId(b.id); setPropertyId(""); setAddr({ business_name: "", full_address: "", postcode: "" }); }} style={[styles.chip, on && styles.chipOn]}>
                                <Text style={[styles.chipText, on && styles.chipTextOn]}>{b.company_name}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </Labeled>
                    )}
                    {(businesses.length <= 1 || wizardBizId) && (
                      <Labeled label="Site">
                        <View testID="quote-property-select" style={{ gap: spacing.xs }}>
                          {sitesForBiz.length === 0 ? (
                            <Text style={styles.muted}>No sites for this business.</Text>
                          ) : (
                            sitesForBiz.map((p) => {
                              const on = propertyId === (p.id || p._id);
                              return (
                                <Pressable key={p.id || p._id} testID={`quote-property-opt-${p.id || p._id}`} onPress={() => selectProperty(p)} style={[styles.siteOpt, on && styles.siteOptOn]}>
                                  <Text style={styles.siteOptName}>{p.property_name || p.name}</Text>
                                  <Text style={styles.siteOptAddr} numberOfLines={1}>{`${p.address || ""}${p.postcode ? `, ${p.postcode}` : ""}`}</Text>
                                </Pressable>
                              );
                            })
                          )}
                        </View>
                      </Labeled>
                    )}
                    {!!propertyId && (
                      <Text testID="quote-address-preview" style={styles.preview}>Address: {addr.full_address}</Text>
                    )}
                  </>
                )}

                {supplyKind === "new" && (
                  <>
                    <Labeled label="Business name" required>
                      <TextInput testID="quote-business-name" value={addr.business_name} onChangeText={(t) => setAddr((a) => ({ ...a, business_name: t }))} placeholder="Acme Bakery Ltd" placeholderTextColor={colors.muted} style={styles.input} />
                    </Labeled>
                    <Labeled label="Supply address" required>
                      <TextInput testID="quote-supply-address" value={addr.full_address} onChangeText={(t) => setAddr((a) => ({ ...a, full_address: t }))} placeholder="Street, town" placeholderTextColor={colors.muted} style={styles.input} />
                    </Labeled>
                    <Labeled label="Postcode" required>
                      <TextInput testID="quote-supply-postcode" value={addr.postcode} onChangeText={(t) => setAddr((a) => ({ ...a, postcode: t.toUpperCase() }))} placeholder="EC2A 4BX" placeholderTextColor={colors.muted} autoCapitalize="characters" style={styles.input} />
                    </Labeled>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {current === "energy" && (
          <View testID="step-energy">
            <Text style={styles.h2}>Meter details</Text>
            <Text style={styles.muted}>Tell us about each meter at this site.</Text>
            {electricMeters.length > 0 && (
              <MeterGroup title="Electricity" color="#F59E0B" icon="bolt" list={electricMeters} onUpdate={updateMeter} onRemove={removeMeter} onAdd={() => setMeters((m) => [...m, newMeter("electric")])} />
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
              <ReviewRow label="Services" value={Array.from(selected).map((k) => SVC_ICON[k]?.label).join(", ")} />
              <ReviewRow label="Contact" value={`${contact.name} · ${contact.email}`} />
              <ReviewRow label="Business" value={addr.business_name} />
              <ReviewRow label="Address" value={addr.full_address} />
              {meters.map((m, i) => (
                <ReviewRow key={m._id} label={`${m.utility === "gas" ? "Gas" : "Electricity"} meter ${i + 1}`} value={`${m.supplier || "—"} · ${WINDOWS.find((w) => w.value === m.contract_end_window)?.label || "—"}`} />
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
            <Pressable testID="wizard-next" onPress={next} disabled={!canContinue()} style={[styles.navBtn, styles.navPrimary, { flex: 2 }, !canContinue() && styles.navPrimarySubtle]}>
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
      {!!error && <Text testID={testID} style={styles.fieldError}>{error}</Text>}
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
  const kind = list[0]?.utility || "electric";
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
      <Pressable testID={`add-meter-${kind}`} onPress={onAdd} style={styles.addMeter}>
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
  preview: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary },

  svcGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  svcCard: { width: "47%", flexGrow: 1, alignItems: "center", padding: spacing.lg, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  svcCardOn: { borderColor: colors.heading, backgroundColor: "#F5F3FF" },
  svcIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  svcLabel: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  svcSelected: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.4, color: colors.heading, marginTop: 4 },

  radioRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.surface },
  radioRowOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.brandPrimary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.brandPrimary },
  radioText: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading, flex: 1 },

  siteOpt: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.surface },
  siteOptOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  siteOptName: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  siteOptAddr: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },

  lockedSite: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", borderRadius: radius.md, padding: spacing.md },
  lockedIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.heading, alignItems: "center", justifyContent: "center" },
  lockedKicker: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.4, color: colors.heading, marginBottom: 2 },
  lockedName: { fontFamily: font.bold, fontSize: type.base, color: colors.heading },
  lockedAddr: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  changeLink: { fontFamily: font.semibold, fontSize: type.sm, color: colors.heading },

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
