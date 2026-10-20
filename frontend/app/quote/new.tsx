import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { QuoteDesktopLayout } from "@/src/desktop/quote-desktop";
import { SelectField } from "@/src/components/select-field";
import { CtaShimmer } from "@/src/components/cta-shimmer";
import { useAuth } from "@/src/auth/auth-context";
import { useBusiness } from "@/src/business/business-context";
import { apiRequest } from "@/src/api/client";
import { colors, font, radius, shadow, spacing, type } from "@/src/theme/theme";

// ——— Mirrors the original web app's quote wizard exactly ———

const SERVICES: { key: string; label: string; icon: IconName; color: string }[] = [
  { key: "electric", label: "Electric", icon: "bolt", color: "#F59E0B" },
  { key: "gas", label: "Gas", icon: "fire", color: "#FB923C" },
  { key: "water", label: "Water", icon: "droplet", color: "#3B82F6" },
  { key: "telecoms", label: "Telecoms", icon: "phone", color: "#0EA5E9" },
];

const WINDOWS = [
  { value: "dont_know", label: "Don't Know" },
  { value: "out_of_contract", label: "Out of Contract" },
  { value: "under_6m", label: "Under 6 months" },
  { value: "6_12m", label: "6–12 months" },
  { value: "over_12m", label: "Over 12 months" },
];
const WINDOW_LABEL = Object.fromEntries(WINDOWS.map((w) => [w.value, w.label]));

const SUPPLIERS = ["British Gas", "E.On Next", "EDF Energy", "Octopus Energy", "Scottish Power", "Opus Energy", "Total Energies", "SSE", "Crown Gas & Power", "Yu Energy"];

type Meter = { _id: string; utility: "electric" | "gas"; supplier: string; contract_end_window: string; meter_point_number: string; end_date?: string; days_until_expiry?: number; verified?: boolean };
let mid = 0;
const newMeter = (u: "electric" | "gas", supplier = ""): Meter => ({ _id: `m${mid++}`, utility: u, supplier, contract_end_window: "", meter_point_number: "" });

const UK_POSTCODE = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i;

const fmtDate = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const daysText = (days?: number): string => {
  if (days === null || days === undefined) return "";
  if (days < 0) return `Ended ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ago`;
  if (days === 0) return "Ends today";
  return `Ends in ${days} ${days === 1 ? "day" : "days"}`;
};
const meterStatus = (m: Meter): string => {
  const dt = daysText(m.days_until_expiry);
  const dd = fmtDate(m.end_date);
  return [dt, dd].filter(Boolean).join(" · ");
};

const windowFromEndDate = (endDate?: string): string => {
  if (!endDate) return "";
  const t = new Date(endDate);
  if (Number.isNaN(t.getTime())) return "";
  const days = Math.round((t.getTime() - Date.now()) / 86400000);
  return days < 0 ? "out_of_contract" : days < 180 ? "under_6m" : days < 365 ? "6_12m" : "over_12m";
};

export default function QuoteWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeBusiness, businesses } = useBusiness();

  const params = useLocalSearchParams<{ propertyId?: string; property?: string; utility?: string; contractId?: string; incumbent?: string }>();
  const paramUtility = (params.utility || "").toLowerCase();
  const paramPropertyId = params.propertyId || params.property || "";
  const contractId = params.contractId || "";

  const y = !!paramUtility; // deep-linked with a utility → skip the service step
  const x = !!contractId && ["electricity", "gas"].includes(paramUtility); // renewal deep-link → skip energy step

  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [changeSite, setChangeSite] = useState(false);

  // "Where's the supply?" branch: existing site vs a brand-new supply.
  const [supplyKind, setSupplyKind] = useState<"" | "existing" | "new">(paramPropertyId ? "existing" : "");
  const [wizardBizId, setWizardBizId] = useState("");

  const [selected, setSelected] = useState<Set<string>>(() => {
    if (paramUtility === "electricity") return new Set(["electric"]);
    if (paramUtility === "broadband") return new Set(["telecoms"]);
    if (["gas", "water", "telecoms"].includes(paramUtility)) return new Set([paramUtility]);
    return new Set();
  });
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState({ name: user?.full_name || "", email: user?.email || "" });

  // Late user resolution (e.g. deep-link before auth loads): back-fill empty fields.
  useEffect(() => {
    setContact((c) => ({ name: c.name || user?.full_name || "", email: c.email || user?.email || "" }));
  }, [user?.full_name, user?.email]);
  const [addr, setAddr] = useState({
    property_id: paramPropertyId,
    business_name: "",
    full_address: "",
    postcode: "",
    is_supply_address: true,
    supply_postcode: "",
  });
  const [meters, setMeters] = useState<Meter[]>([]);
  const [prefilledIds, setPrefilledIds] = useState<Set<string>>(new Set());
  const [renewingContract, setRenewingContract] = useState<any>(null);
  const [waterSupplier, setWaterSupplier] = useState("");
  const [telecomsSupplier, setTelecomsSupplier] = useState("");
  const [waterPrefilled, setWaterPrefilled] = useState(false);
  const [telecomsPrefilled, setTelecomsPrefilled] = useState(false);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Deep-linked with a utility: start on "Your details".
  useEffect(() => {
    if (y && step === 0) setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y]);

  // Load ALL sites (the wizard has its own business picker); prefill when deep-linked.
  useEffect(() => {
    apiRequest<any[]>("/properties")
      .then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        setProperties(list);
        if (!list.length) return;
        const match = paramPropertyId ? list.find((p) => p.id === paramPropertyId) : null;
        if (match) {
          if (match.business_id) setWizardBizId(match.business_id);
          setAddr((a) => ({
            ...a,
            business_name: a.business_name || activeBusiness?.company_name || match.property_name || "",
            full_address: a.full_address || match.address || "",
            postcode: a.postcode || match.postcode || "",
          }));
          // Prefill the incumbent supplier for water / telecoms deep-links.
          if (params.incumbent) {
            if (paramUtility === "water") { setWaterSupplier(params.incumbent); setWaterPrefilled(true); }
            else if (paramUtility === "telecoms" || paramUtility === "broadband") { setTelecomsSupplier(params.incumbent); setTelecomsPrefilled(true); }
          }
        }
      })
      .catch(() => setProperties([]))
      .finally(() => setLoadingProps(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync meters with the selected services; prefill from the deep-linked contract.
  useEffect(() => {
    const wanted: ("electric" | "gas")[] = [];
    if (selected.has("electric")) wanted.push("electric");
    if (selected.has("gas")) wanted.push("gas");
    const linkedUtility = paramUtility === "electricity" ? "electric" : paramUtility === "gas" ? "gas" : null;
    let cancelled = false;

    (async () => {
      let supplier = "";
      let win = "";
      let mpx = "";
      let prefillFor: string | null = null;
      if (contractId && linkedUtility && wanted.includes(linkedUtility)) {
        try {
          const c = await apiRequest<any>(`/contracts/${contractId}`);
          supplier = (c?.supplier_name || "").trim();
          win = windowFromEndDate(c?.end_date);
          mpx = (c?.meter_point_number || "").trim();
          prefillFor = linkedUtility;
          if (!cancelled) setRenewingContract(c);
        } catch {
          supplier = params.incumbent || "";
          prefillFor = params.incumbent ? linkedUtility : null;
        }
      }
      if (cancelled) return;
      setMeters((ms) => {
        const kept = ms.filter((m) => wanted.includes(m.utility));
        const next = [...kept];
        const newlyPrefilled = new Set<string>();
        wanted.forEach((u) => {
          if (!kept.some((m) => m.utility === u)) {
            if (u === prefillFor) {
              const m = newMeter(u, supplier);
              m.contract_end_window = win;
              m.meter_point_number = mpx;
              next.push(m);
              newlyPrefilled.add(m._id);
            } else {
              next.push(newMeter(u));
            }
          }
        });
        if (newlyPrefilled.size) {
          setPrefilledIds((prev) => {
            const s = new Set(prev);
            newlyPrefilled.forEach((id) => s.add(id));
            return s;
          });
        }
        return next;
      });
    })();

    if (!selected.has("water")) setWaterSupplier("");
    if (!selected.has("telecoms")) setTelecomsSupplier("");
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const hasEnergy = selected.has("electric") || selected.has("gas");
  const flow = useMemo(() => {
    const f = ["service", "global"];
    if (hasEnergy && !x) f.push("energy");
    if (selected.has("water")) f.push("water");
    if (selected.has("telecoms")) f.push("telecoms");
    f.push("review");
    return f;
  }, [selected, hasEnergy, x]);

  const current = flow[Math.min(step, flow.length - 1)];
  const isLast = step >= flow.length - 1;
  const nextIsReview = flow[step + 1] === "review";

  // Reset scroll to the top whenever the step changes so each step starts at the top.
  const scrollRef = useRef<any>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [step]);

  const back = () => {
    setError("");
    setShowErrors(false);
    if (step === 0 || (y && step === 1)) router.back();
    else setStep((s) => Math.max(0, s - 1));
  };

  const stepValid = (): boolean => {
    if (current === "service") return selected.size > 0;
    if (current === "global") {
      if (!contact.name.trim() || !contact.email.trim()) return false;
      if (lockedProp) return true;
      if (!supplyKind) return false;
      if (supplyKind === "existing") return !!(wizardBizId && addr.property_id);
      return !!(addr.business_name.trim() && addr.full_address.trim() && UK_POSTCODE.test(addr.postcode.trim()));
    }
    if (current === "energy") return meters.every((m) => m.supplier?.trim() && m.contract_end_window);
    if (current === "water") return waterSupplier.trim().length > 0;
    if (current === "telecoms") return telecomsSupplier.trim().length > 0;
    return true;
  };

  const next = () => {
    setError("");
    if (!stepValid()) {
      setShowErrors(true);
      setError("Please complete the highlighted fields.");
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(flow.length - 1, s + 1));
  };

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        selected_services: Array.from(selected),
        contact,
        address: addr,
        energy_meters: meters,
        water_supplier: selected.has("water") ? (waterSupplier === "__idk__" ? "Unknown / To be verified by team" : waterSupplier) : null,
        telecoms_supplier: selected.has("telecoms") ? (telecomsSupplier === "__idk__" ? "Unknown / To be verified by team" : telecomsSupplier) : null,
      };
      const res = await apiRequest<any>("/quotes/multi", { method: "POST", body: payload });
      router.replace({ pathname: "/quote/success", params: { id: res?.quote_request_id || "" } });
    } catch (e: any) {
      setError(e?.message || "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleService = (key: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const pickBusiness = (id: string) => {
    setWizardBizId(id);
    setAddr((a) => ({ ...a, property_id: "", business_name: "", full_address: "", postcode: "" }));
  };

  // Pull the selected site's known meters (supplier, end date, MPAN) so the
  // energy step can confirm them instead of asking the user to re-enter.
  const prefillFromSite = useCallback(
    async (propertyId: string) => {
      try {
        const res = await apiRequest<any>(`/properties/${propertyId}/utilities`);
        const utils = res?.utilities || {};
        setMeters((ms) => {
          const next: Meter[] = [];
          (["electric", "gas"] as const).forEach((u) => {
            if (!selected.has(u)) return;
            const c = utils[u === "electric" ? "electricity" : "gas"] || utils[u];
            if (c) {
              const m = newMeter(u, (c.supplier_name || c.supplier || "").trim());
              m.contract_end_window = windowFromEndDate(c.end_date);
              m.meter_point_number = (c.meter_point_number || "").trim();
              m.end_date = c.end_date;
              m.days_until_expiry = c.days_until_expiry;
              m.verified = true;
              next.push(m);
            } else {
              const existing = ms.find((x) => x.utility === u);
              next.push(existing ? { ...existing, verified: false } : newMeter(u));
            }
          });
          return next;
        });
        // Pre-fill Water / Telecoms suppliers from the site's records too.
        if (selected.has("water") && utils.water?.supplier_name) {
          setWaterSupplier(utils.water.supplier_name);
          setWaterPrefilled(true);
        }
        if (selected.has("telecoms") && (utils.telecoms?.supplier_name || utils.broadband?.supplier_name)) {
          setTelecomsSupplier((utils.telecoms || utils.broadband).supplier_name);
          setTelecomsPrefilled(true);
        }
      } catch {
        /* keep manual entry on failure */
      }
    },
    [selected],
  );

  const pickProperty = (id: string) => {
    const p = properties.find((t) => t.id === id);
    const owner = businesses.find((b) => b.id === wizardBizId);
    setAddr((a) => ({
      ...a,
      property_id: id,
      business_name: owner?.company_name || activeBusiness?.company_name || p?.property_name || "",
      full_address: p?.address || "",
      postcode: p?.postcode || "",
    }));
    prefillFromSite(id);
  };

  const chooseSupply = (kind: "existing" | "new") => {
    setSupplyKind(kind);
    if (kind === "new") {
      setWizardBizId("");
      setAddr((a) => ({ ...a, property_id: "", business_name: "", full_address: "", postcode: "" }));
    }
  };

  const sitesForBiz = useMemo(() => {
    if (!wizardBizId) return [];
    return properties.filter((p) => (p.business_id ? p.business_id === wizardBizId : true));
  }, [properties, wizardBizId]);

  const cameFromSite = Boolean(paramPropertyId);
  const lockedProp = cameFromSite && !changeSite ? properties.find((p) => p.id === addr.property_id) : null;
  const lockedMeta = ({
    electricity: { icon: "bolt" as IconName, label: "ELECTRICITY", color: "#F59E0B" },
    gas: { icon: "fire" as IconName, label: "GAS", color: "#FB923C" },
    water: { icon: "droplet" as IconName, label: "WATER", color: "#3B82F6" },
    telecoms: { icon: "phone" as IconName, label: "TELECOMS", color: "#0EA5E9" },
    broadband: { icon: "wifi" as IconName, label: "BROADBAND", color: "#0EA5E9" },
  } as Record<string, { icon: IconName; label: string; color: string }>)[paramUtility] || null;

  const electricMeters = meters.filter((m) => m.utility === "electric");
  const gasMeters = meters.filter((m) => m.utility === "gas");
  const anyPrefilled = meters.some((m) => prefilledIds.has(m._id));

  // Existing-site (autofill) vs new-supply (manual) branching for the energy step.
  const selectedProp = lockedProp || properties.find((p) => p.id === addr.property_id) || null;
  const isExistingSite = !!(lockedProp || (supplyKind === "existing" && addr.property_id));
  const siteName = selectedProp?.property_name || selectedProp?.address || addr.business_name || "this site";
  const showConfirmMeters = current === "energy" && isExistingSite && meters.some((m) => m.verified);

  const postcodeInvalid = current === "global" && !lockedProp && supplyKind === "new" && addr.postcode.trim().length > 0 && !UK_POSTCODE.test(addr.postcode.trim());
  const continueDisabled = current === "global" && !lockedProp && supplyKind === "new" && !(addr.business_name.trim() && addr.full_address.trim() && UK_POSTCODE.test(addr.postcode.trim()));

  const subtitle = y ? `Step ${Math.max(1, step)} of ${flow.length - 1}` : `Step ${step + 1} of ${flow.length}`;

  return (
    <QuoteDesktopLayout
      summary={{
        services: SERVICES.filter((sv) => selected.has(sv.key)),
        contact,
        siteName,
        address: addr,
        meters,
        waterSupplier,
        telecomsSupplier,
        stepLabel: subtitle,
      }}
    >
    <View style={styles.root}>
      <ScreenHeader testID="quote-header" title="Get a Quote" subtitle={subtitle} onBack={back} />
      <View style={styles.pips}>
        {flow.map((s, i) =>
          y && i === 0 ? null : (
            <View key={s} testID={`quote-step-pip-${i}`} style={[styles.pip, { backgroundColor: i <= step ? colors.brandPrimary : colors.border }]} />
          ),
        )}
      </View>
      <KeyboardAwareScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {current === "service" && (
          <View testID="step-service">
            <Text style={styles.h2}>Which services do you need a quote for?</Text>
            <Text style={styles.muted}>Pick all that apply — we&apos;ll only ask the questions we need.</Text>
            <View style={styles.svcGrid}>
              {SERVICES.map((s) => {
                const on = selected.has(s.key);
                return (
                  <Pressable key={s.key} testID={`service-${s.key}`} onPress={() => toggleService(s.key)} style={[styles.svcCard, on && styles.svcCardOn]}>
                    <View style={[styles.svcIcon, { backgroundColor: `${s.color}22` }]}>
                      <Icon name={s.icon} size={24} color={s.color} />
                    </View>
                    <Text style={styles.svcLabel}>{s.label}</Text>
                    {on ? <Text style={styles.svcSelected}>SELECTED</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {current === "global" && (
          <View testID="step-global">
            <Text style={styles.h2}>Your details</Text>
            <Text style={styles.muted}>Pre-filled from your account — edit if a colleague should receive the quote instead.</Text>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Name</Text>
              <TextInput testID="quote-contact-name" value={contact.name} onChangeText={(t) => setContact((c) => ({ ...c, name: t }))} placeholderTextColor={colors.muted} style={[styles.input, styles.inputPrefilled, showErrors && !contact.name.trim() && styles.inputError]} />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput testID="quote-contact-email" value={contact.email} onChangeText={(t) => setContact((c) => ({ ...c, email: t }))} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.muted} style={[styles.input, styles.inputPrefilled, showErrors && !contact.email.trim() && styles.inputError]} />
            </View>

            {lockedProp ? (
              <>
                <View testID="quote-locked-site" style={styles.lockedSite}>
                  <View style={[styles.lockedIcon, lockedMeta && { backgroundColor: lockedMeta.color }]}>
                    <Icon name={lockedMeta ? lockedMeta.icon : "building"} size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.lockedKicker}>{lockedMeta ? `QUOTE FOR ${lockedMeta.label}` : "QUOTE FOR THIS SITE"}</Text>
                    <Text style={styles.lockedName} numberOfLines={1}>{lockedProp.property_name || lockedProp.address}</Text>
                    <Text style={styles.lockedAddr} numberOfLines={2}>{[lockedProp.address, lockedProp.postcode].filter(Boolean).join(", ")}</Text>
                  </View>
                  {properties.length > 1 && (
                    <Pressable testID="quote-change-site" onPress={() => setChangeSite(true)} hitSlop={8}>
                      <Text style={styles.changeLink}>Change site</Text>
                    </Pressable>
                  )}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.h3}>Where&apos;s the supply?</Text>
                <Pressable
                  testID="quote-supply-existing"
                  disabled={loadingProps || properties.length === 0}
                  onPress={() => chooseSupply("existing")}
                  style={[styles.radioRow, supplyKind === "existing" && styles.radioRowOn, showErrors && !supplyKind && styles.radioRowError, !loadingProps && properties.length === 0 && { opacity: 0.5 }]}
                >
                  <View style={[styles.radio, supplyKind === "existing" && styles.radioOn]}>{supplyKind === "existing" && <View style={styles.radioDot} />}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.radioText}>One of my existing sites</Text>
                    <Text style={styles.radioDesc}>Pick from sites on your account.</Text>
                  </View>
                </Pressable>
                <Pressable testID="quote-supply-new" onPress={() => chooseSupply("new")} style={[styles.radioRow, supplyKind === "new" && styles.radioRowOn, showErrors && !supplyKind && styles.radioRowError]}>
                  <View style={[styles.radio, supplyKind === "new" && styles.radioOn]}>{supplyKind === "new" && <View style={styles.radioDot} />}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.radioText}>A new supply — I&apos;ll enter details</Text>
                    <Text style={styles.radioDesc}>For a brand new site, or a business you haven&apos;t added yet.</Text>
                  </View>
                </Pressable>

                {supplyKind === "existing" && (
                  <View style={{ marginTop: spacing.md }}>
                    <View style={styles.inputWrap}>
                      <Text style={styles.label}>Business</Text>
                      <SelectField
                        testID="quote-business-select"
                        value={wizardBizId}
                        onChange={pickBusiness}
                        placeholder="Select a business"
                        sheetTitle="Choose a business"
                        error={showErrors && !wizardBizId}
                        options={businesses.map((b) => ({ value: b.id, label: b.company_name }))}
                      />
                    </View>
                    {!!wizardBizId && (
                      <View style={styles.inputWrap}>
                        <Text style={styles.label}>Site</Text>
                        <SelectField
                          testID="quote-property-select"
                          value={addr.property_id}
                          onChange={pickProperty}
                          placeholder="Select a site"
                          sheetTitle="Choose a site"
                          emptyText="No sites for this business yet."
                          error={showErrors && !addr.property_id}
                          options={sitesForBiz.map((p) => ({
                            value: p.id,
                            label: p.property_name || p.address,
                            sublabel: [p.address, p.postcode].filter(Boolean).join(", "),
                          }))}
                        />
                      </View>
                    )}
                    {!!addr.property_id && (
                      <Text testID="quote-address-preview" style={styles.preview}>
                        Address: {[addr.full_address, addr.postcode].filter(Boolean).join(", ")}
                      </Text>
                    )}
                  </View>
                )}

                {supplyKind === "new" && (
                  <View style={{ marginTop: spacing.md }}>
                    <View style={styles.inputWrap}>
                      <Text style={styles.label}>Business name</Text>
                      <TextInput testID="quote-business-name" value={addr.business_name} onChangeText={(t) => setAddr((a) => ({ ...a, business_name: t }))} placeholder="Acme Bakery Ltd" placeholderTextColor={colors.muted} style={[styles.input, showErrors && !addr.business_name.trim() && styles.inputError]} />
                    </View>
                    <View style={styles.inputWrap}>
                      <Text style={styles.label}>Supply address</Text>
                      <TextInput testID="quote-address" value={addr.full_address} onChangeText={(t) => setAddr((a) => ({ ...a, full_address: t }))} placeholder="123 Boulevard Avenue" placeholderTextColor={colors.muted} style={[styles.input, showErrors && !addr.full_address.trim() && styles.inputError]} />
                    </View>
                    <View style={styles.inputWrap}>
                      <Text style={styles.label}>Postcode</Text>
                      <TextInput testID="quote-postcode" value={addr.postcode} onChangeText={(t) => setAddr((a) => ({ ...a, postcode: t.toUpperCase() }))} placeholder="SW1A 1AA" placeholderTextColor={colors.muted} autoCapitalize="characters" style={[styles.input, ((showErrors && !addr.postcode.trim()) || postcodeInvalid) && styles.inputError]} />
                      {postcodeInvalid && (
                        <Text testID="postcode-error" style={styles.fieldErrorText}>Please enter a valid UK postcode (e.g. SW1A 1AA)</Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {current === "energy" && (
          showConfirmMeters ? (
            <View testID="step-energy">
              <Text style={styles.h2}>Confirm meter details</Text>
              <Text style={styles.muted}>We found the following active {meters.filter((m) => m.verified).length > 1 ? "meters" : "meter"} for {siteName}:</Text>
              {meters.map((m, i) =>
                m.verified ? (
                  <MeterConfirmCard
                    key={m._id}
                    meter={m}
                    index={electricMeters.indexOf(m) >= 0 ? electricMeters.indexOf(m) : gasMeters.indexOf(m)}
                    onEdit={() => setMeters((ms) => ms.map((x) => (x._id === m._id ? { ...x, verified: false } : x)))}
                  />
                ) : (
                  <View key={m._id} style={styles.meterCard} testID={`meter-manual-${i}`}>
                    <View style={styles.meterTopRow}>
                      <Text style={styles.meterTitle}>{m.utility === "electric" ? "Electric" : "Gas"} Meter</Text>
                      <Pressable testID={`meter-manual-${i}-remove`} onPress={() => setMeters((ms) => ms.filter((x) => x._id !== m._id))} hitSlop={8}>
                        <Text style={styles.removeText}>Remove</Text>
                      </Pressable>
                    </View>
                    <MeterFields meter={m} showErrors={showErrors} onUpdate={(p) => setMeters((ms) => ms.map((x) => (x._id === m._id ? { ...x, ...p } : x)))} />
                  </View>
                ),
              )}
              <Pressable testID="meter-add-at-address" onPress={() => setMeters((ms) => [...ms, newMeter(selected.has("electric") ? "electric" : "gas")])} style={styles.addMeter}>
                <Icon name="plus" size={16} color={colors.brandPrimary} />
                <Text style={styles.addMeterText}>Add another meter at this address</Text>
              </Pressable>
            </View>
          ) : (
            <View testID="step-energy">
              <Text style={styles.h2}>Energy details</Text>
              <Text style={styles.muted}>
                {anyPrefilled ? "We've pre-filled this from your existing contract — change anything if it's wrong." : "Tell us about each meter at this new site."}
              </Text>
              {electricMeters.length > 0 && (
                <MeterGroup title="Electric" utility="electric" color="#F59E0B" icon="bolt" meters={meters} group={electricMeters} prefilledIds={prefilledIds} showErrors={showErrors} first
                  onUpdate={(id, p) => setMeters((ms) => ms.map((m) => (m._id === id ? { ...m, ...p } : m)))}
                  onRemove={(id) => setMeters((ms) => ms.filter((m) => m._id !== id))}
                  onAdd={() => setMeters((ms) => [...ms, newMeter("electric", ms.find((m) => m.utility === "electric")?.supplier || "")])} />
              )}
              {gasMeters.length > 0 && (
                <MeterGroup title="Gas" utility="gas" color="#FB923C" icon="fire" meters={meters} group={gasMeters} prefilledIds={prefilledIds} showErrors={showErrors}
                  onUpdate={(id, p) => setMeters((ms) => ms.map((m) => (m._id === id ? { ...m, ...p } : m)))}
                  onRemove={(id) => setMeters((ms) => ms.filter((m) => m._id !== id))}
                  onAdd={() => setMeters((ms) => [...ms, newMeter("gas", ms.find((m) => m.utility === "gas")?.supplier || "")])} />
              )}
            </View>
          )
        )}

        {current === "water" && (
          <SupplierStep testID="water" title="Who's your current Water supplier?" placeholder="e.g. Anglian Water, Thames Water" value={waterSupplier} prefilled={waterPrefilled} onChange={(t) => { setWaterSupplier(t); setWaterPrefilled(false); }} error={showErrors && !waterSupplier.trim()} />
        )}
        {current === "telecoms" && (
          <SupplierStep testID="telecoms" title="Who's your current Telecoms supplier?" placeholder="e.g. BT, Virgin, Sky Business" value={telecomsSupplier} prefilled={telecomsPrefilled} onChange={(t) => { setTelecomsSupplier(t); setTelecomsPrefilled(false); }} error={showErrors && !telecomsSupplier.trim()} />
        )}

        {current === "review" && (
          <ReviewStep selected={selected} contact={contact} addr={addr} meters={meters} waterSupplier={waterSupplier} telecomsSupplier={telecomsSupplier} renewingContract={renewingContract} />
        )}

        {!!error && <Text testID="wizard-error" style={styles.error}>{error}</Text>}

        <View style={styles.navRow}>
          {step > 0 && (
            <Pressable testID="wizard-back" onPress={back} style={[styles.navBtn, styles.navBack]}>
              <Text style={styles.navBackText}>Back</Text>
            </Pressable>
          )}
          {isLast ? (
            <Pressable testID="wizard-submit" onPress={submit} disabled={submitting} style={[styles.navBtn, styles.navPrimary, { flex: 2, overflow: "hidden" }]}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.navPrimaryText}>Submit request</Text>
                  <Icon name="chevronRight" size={16} color="#FFFFFF" />
                  <CtaShimmer width={260} />
                </>
              )}
            </Pressable>
          ) : (
            <Pressable testID="wizard-next" onPress={next} disabled={continueDisabled} style={[styles.navBtn, styles.navPrimary, { flex: 2 }, continueDisabled && { opacity: 0.45 }]}>
              <Text style={styles.navPrimaryText}>{nextIsReview ? "Continue to Review" : "Continue"}</Text>
              {nextIsReview ? <Icon name="chevronRight" size={16} color="#FFFFFF" /> : null}
            </Pressable>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
    </QuoteDesktopLayout>
  );
}

// ——— Supplier picker: clean native dropdown (+ "Other" free-text) ———
function SupplierPicker({ value, onChange, testidPrefix, error }: { value: string; onChange: (v: string) => void; testidPrefix: string; error?: boolean }) {
  const trimmed = (value || "").trim();
  const known = SUPPLIERS.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  const idk = trimmed === "__idk__";
  const custom = !!trimmed && !known && !idk;
  const [otherMode, setOtherMode] = useState(custom);
  const selectValue = known ? known : idk ? "__idk__" : otherMode || custom ? "__other__" : "";
  return (
    <View>
      <SelectField
        testID={`${testidPrefix}-supplier-select`}
        value={selectValue}
        placeholder="Select a supplier"
        sheetTitle="Choose a supplier"
        error={error && !otherMode}
        options={[
          ...SUPPLIERS.map((s) => ({ value: s, label: s })),
          { value: "__idk__", label: "I don't know" },
          { value: "__other__", label: "Other — type it in" },
        ]}
        onChange={(v) => {
          if (v === "__other__") {
            setOtherMode(true);
            onChange("");
          } else {
            setOtherMode(false);
            onChange(v);
          }
        }}
      />
      {(otherMode || custom) && (
        <TextInput
          testID={`${testidPrefix}-supplier`}
          value={custom ? trimmed : ""}
          onChangeText={onChange}
          placeholder="Type your supplier"
          placeholderTextColor={colors.muted}
          style={[styles.input, { marginTop: 8 }, error && styles.inputError]}
        />
      )}
    </View>
  );
}

function MeterGroup({ title, utility, color, icon, group, prefilledIds, showErrors, onUpdate, onRemove, onAdd, first }: {
  title: string; utility: "electric" | "gas"; color: string; icon: IconName; meters: Meter[]; group: Meter[];
  prefilledIds: Set<string>; showErrors: boolean; onUpdate: (id: string, p: Partial<Meter>) => void; onRemove: (id: string) => void; onAdd: () => void; first?: boolean;
}) {
  return (
    <View style={[{ marginBottom: 28 }, !first && styles.groupDivider]}>
      <View style={styles.meterHead}>
        <View style={[styles.meterHeadIcon, { backgroundColor: `${color}22` }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <Text style={styles.h3NoMargin}>{title}</Text>
      </View>
      {group.map((m, i) => {
        const prefilled = prefilledIds.has(m._id);
        return (
          <View key={m._id} testID={`meter-${utility}-${i}`} style={styles.meterCard}>
            <View style={styles.meterTopRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Text style={styles.meterTitle}>{title} Meter {i + 1}</Text>
                {prefilled && (
                  <View testID={`meter-${utility}-${i}-prefilled`} style={styles.prefilledBadge}>
                    <Text style={styles.prefilledBadgeText}>FROM YOUR CONTRACT</Text>
                  </View>
                )}
              </View>
              {i > 0 && (
                <Pressable testID={`meter-${utility}-${i}-remove`} onPress={() => onRemove(m._id)} hitSlop={8}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              )}
            </View>
            <MeterFields meter={m} showErrors={showErrors} onUpdate={(p) => onUpdate(m._id, p)} testidPrefix={`meter-${utility}-${i}`} />
          </View>
        );
      })}
      <Pressable testID={`meter-${utility}-add`} onPress={onAdd} style={styles.addMeter}>
        <Icon name="plus" size={16} color={colors.brandPrimary} />
        <Text style={styles.addMeterText}>Add another {title} Meter</Text>
      </Pressable>
    </View>
  );
}

// Shared manual meter inputs (supplier, end date, MPAN/MPRN).
function MeterFields({ meter, showErrors, onUpdate, testidPrefix }: {
  meter: Meter; showErrors: boolean; onUpdate: (p: Partial<Meter>) => void; testidPrefix?: string;
}) {
  const utility = meter.utility;
  const mpxLabel = utility === "gas" ? "MPRN" : "MPAN";
  const tp = testidPrefix || `meter-${utility}`;
  return (
    <>
      <View style={styles.inputWrap}>
        <Text style={styles.label}>Supplier</Text>
        <SupplierPicker value={meter.supplier} onChange={(v) => onUpdate({ supplier: v })} testidPrefix={tp} error={showErrors && !meter.supplier?.trim()} />
      </View>
      <View style={[styles.inputWrap, { marginBottom: 0 }]}>
        <Text style={styles.label}>Contract end date</Text>
        <SelectField
          testID={`${tp}-end`}
          value={meter.contract_end_window}
          onChange={(v) => onUpdate({ contract_end_window: v })}
          placeholder="Select…"
          sheetTitle="Contract end date"
          error={showErrors && !meter.contract_end_window}
          options={WINDOWS}
        />
      </View>
      <View style={[styles.inputWrap, { marginTop: 12, marginBottom: 0 }]}>
        <Text style={styles.label}>
          {mpxLabel} <Text style={styles.labelOptional}>(optional)</Text>
        </Text>
        <TextInput
          testID={`${tp}-mpx`}
          value={meter.meter_point_number}
          onChangeText={(t) => onUpdate({ meter_point_number: t })}
          placeholder={utility === "gas" ? "e.g. 1234567890" : "e.g. 2199992424131"}
          placeholderTextColor={colors.muted}
          inputMode="numeric"
          style={[styles.input, styles.inputMono]}
        />
        <Text style={styles.helperText}>
          Providing your MPAN / MPRN speeds up your quote. If left blank, our team will look this up from your address.
        </Text>
      </View>
    </>
  );
}

// Read-only confirmation card for a meter we already have on file for the site.
function MeterConfirmCard({ meter, index, onEdit }: { meter: Meter; index: number; onEdit: () => void }) {
  const isGas = meter.utility === "gas";
  const color = isGas ? "#FB923C" : "#F59E0B";
  const icon: IconName = isGas ? "fire" : "bolt";
  const mpxLabel = isGas ? "MPRN" : "MPAN";
  const status = meterStatus(meter);
  return (
    <View style={styles.confirmCard} testID={`confirm-meter-${meter.utility}-${index}`}>
      <View style={styles.confirmHead}>
        <View style={[styles.confirmIcon, { backgroundColor: `${color}22` }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <Text style={styles.confirmTitle}>{isGas ? "Gas" : "Electricity"} Meter {index + 1}</Text>
        <Pressable testID={`confirm-meter-${meter.utility}-${index}-edit`} onPress={onEdit} hitSlop={8}>
          <Text style={styles.confirmEdit}>Edit</Text>
        </Pressable>
      </View>
      <View style={styles.confirmRow}>
        <Text style={styles.confirmLabel}>Supplier</Text>
        <View style={styles.confirmValRight}>
          <Text style={styles.confirmVal} numberOfLines={1}>{meter.supplier || "—"}</Text>
          <View style={styles.currentTag}><Text style={styles.currentTagText}>Current supplier</Text></View>
        </View>
      </View>
      {status ? (
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Contract status</Text>
          <Text style={[styles.confirmVal, { flex: 1, textAlign: "right" }]} numberOfLines={2}>{status}</Text>
        </View>
      ) : null}
      {meter.meter_point_number ? (
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>{mpxLabel}</Text>
          <Text style={[styles.confirmVal, styles.inputMono, { flex: 1, textAlign: "right" }]} numberOfLines={1}>{meter.meter_point_number}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SupplierStep({ title, placeholder, value, onChange, testID, error, prefilled }: { title: string; placeholder: string; value: string; onChange: (t: string) => void; testID: string; error?: boolean; prefilled?: boolean }) {
  const idk = value === "__idk__";
  return (
    <View testID={`step-${testID}`}>
      <Text style={styles.h2}>{title}</Text>
      <Text style={styles.muted}>That&apos;s all we need — we already have your business details.</Text>
      <View style={styles.inputWrap}>
        <Text style={styles.label}>Supplier</Text>
        <TextInput
          testID={`${testID}-supplier`}
          value={idk ? "" : value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={[styles.input, error && !idk && styles.inputError]}
        />
        {prefilled && !idk ? (
          <Text testID={`${testID}-prefilled-note`} style={styles.helperText}>Pre-filled from your site records — change it if this isn&apos;t right.</Text>
        ) : null}
      </View>
      <Pressable testID={`${testID}-idk`} onPress={() => onChange(idk ? "" : "__idk__")} style={styles.idkRow} hitSlop={6}>
        <View style={[styles.idkBox, idk && styles.idkBoxOn]}>{idk ? <Icon name="check" size={14} color="#FFFFFF" /> : null}</View>
        <Text style={styles.idkLabel}>I don&apos;t know my supplier</Text>
      </Pressable>
      {idk ? (
        <View testID={`${testID}-idk-note`} style={styles.idkNote}>
          <Text style={styles.idkNoteText}>No problem! Our team will identify your supplier from your address and meter records.</Text>
        </View>
      ) : null}
    </View>
  );
}

// ——— Review step ———
const RENEWING_TINTS: Record<string, { bg: string; fg: string; border: string; accent: string; iconBg: string; icon: IconName }> = {
  gas: { bg: "#FFF7ED", fg: "#9A3412", border: "#FED7AA", accent: "#EA580C", iconBg: "#FED7AA", icon: "fire" },
  water: { bg: "#EFF6FF", fg: "#1E40AF", border: "#BFDBFE", accent: "#2563EB", iconBg: "#BFDBFE", icon: "droplet" },
  telecoms: { bg: "#F0F9FF", fg: "#0369A1", border: "#BAE6FD", accent: "#0284C7", iconBg: "#BAE6FD", icon: "wifi" },
  broadband: { bg: "#F0F9FF", fg: "#0369A1", border: "#BAE6FD", accent: "#0284C7", iconBg: "#BAE6FD", icon: "wifi" },
  default: { bg: "#FFFBEB", fg: "#92400E", border: "#FDE68A", accent: "#D97706", iconBg: "#FDE68A", icon: "bolt" },
};

function ReviewStep({ selected, contact, addr, meters, waterSupplier, telecomsSupplier, renewingContract }: {
  selected: Set<string>; contact: { name: string; email: string };
  addr: { business_name: string; full_address: string; postcode: string; is_supply_address: boolean; supply_postcode: string };
  meters: Meter[]; waterSupplier: string; telecomsSupplier: string; renewingContract: any;
}) {
  let pill: React.ReactNode = null;
  if (renewingContract) {
    const u = renewingContract.utility_type || "";
    const supplier = (renewingContract.supplier_name || "").trim();
    let daysText = "";
    if (renewingContract.end_date) {
      const d = new Date(renewingContract.end_date);
      if (!Number.isNaN(d.getTime())) {
        const days = Math.round((d.getTime() - Date.now()) / 86400000);
        daysText = days < 0 ? `Ended ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ago` : days === 0 ? "Ends today" : `Ends in ${days} ${days === 1 ? "day" : "days"}`;
      }
    }
    const label = u === "electricity" ? "Electricity" : u ? u[0].toUpperCase() + u.slice(1) : "Contract";
    const t = RENEWING_TINTS[u] || RENEWING_TINTS.default;
    pill = (
      <View testID="review-renewing-pill" style={[styles.renewPill, { backgroundColor: t.bg, borderColor: t.border }]}>
        <View style={[styles.renewIcon, { backgroundColor: t.iconBg }]}>
          <Icon name={t.icon} size={20} color={t.accent} />
        </View>
        <Text style={[styles.renewTitle, { color: t.fg }]}>
          {label}
          {supplier ? ` · ${supplier}` : ""}
        </Text>
        {daysText ? (
          <View style={[styles.renewDays, { borderColor: t.border }]}>
            <Text style={[styles.renewDaysText, { color: t.accent }]}>{daysText}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const showMeters = !renewingContract && meters.length > 0;

  return (
    <View testID="step-review">
      <Text style={styles.h2}>Review</Text>
      <Text style={styles.muted}>Ready to submit? We&apos;ll handle the rest.</Text>
      {pill}
      {!renewingContract && (
        <ReviewCard title="SERVICES">
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {Array.from(selected).map((s) => (
              <View key={s} testID={`review-service-${s}`} style={styles.reviewPill}>
                <Text style={styles.reviewPillText}>{s}</Text>
              </View>
            ))}
          </View>
        </ReviewCard>
      )}
      <ReviewCard title="CONTACT">
        <KV k="Name" v={contact.name} />
        <KV k="Email" v={contact.email} />
      </ReviewCard>
      <ReviewCard title="BUSINESS">
        {addr.business_name ? <KV k="Name" v={addr.business_name} /> : null}
        <KV k="Address" v={[addr.full_address, addr.postcode].filter(Boolean).join(", ") || "—"} />
        {!addr.is_supply_address ? <KV k="Supply postcode" v={addr.supply_postcode} /> : null}
      </ReviewCard>
      {showMeters && (
        <ReviewCard title="ENERGY METERS">
          {meters.map((m, i) => (
            <View key={m._id} testID={`review-meter-${i}`} style={styles.miniCard}>
              <Text style={styles.miniCardTitle}>
                {m.utility === "electric" ? "Electricity" : "Gas"} · {m.supplier === "__idk__" ? "I don't know" : m.supplier || "—"}
              </Text>
              {m.meter_point_number ? (
                <Text testID={`review-meter-${i}-mpx`} style={styles.miniCardMpx}>
                  <Text style={{ fontFamily: font.bold, color: colors.muted }}>{m.utility === "gas" ? "MPRN" : "MPAN"} </Text>
                  {m.meter_point_number}
                </Text>
              ) : null}
              <Text style={styles.miniCardSub}>
                {meterStatus(m) || `Contract end: ${WINDOW_LABEL[m.contract_end_window] || "—"}`}
              </Text>
            </View>
          ))}
        </ReviewCard>
      )}
      {selected.has("water") && (
        <ReviewCard title="WATER">
          <KV k="Supplier" v={waterSupplier === "__idk__" ? "To be identified by team" : waterSupplier || "—"} />
        </ReviewCard>
      )}
      {selected.has("telecoms") && (
        <ReviewCard title="TELECOMS">
          <KV k="Supplier" v={telecomsSupplier === "__idk__" ? "To be identified by team" : telecomsSupplier || "—"} />
        </ReviewCard>
      )}
    </View>
  );
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.reviewCard}>
      <Text style={styles.reviewCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal} numberOfLines={2}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  pips: { flexDirection: "row", gap: 4, paddingHorizontal: spacing.lg, marginBottom: 18 },
  pip: { flex: 1, height: 4, borderRadius: 999 },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing["2xl"] * 2 },

  h2: { fontFamily: font.bold, fontSize: type["2xl"], color: colors.heading, marginBottom: 6, letterSpacing: -0.3 },
  h3: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading, marginTop: 18, marginBottom: 10 },
  h3NoMargin: { fontFamily: font.bold, fontSize: type.xl, color: colors.heading },
  muted: { fontFamily: font.regular, fontSize: type.base, color: colors.muted, marginBottom: 14, lineHeight: 20 },

  inputWrap: { marginBottom: spacing.md },
  label: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary, marginBottom: 6 },
  labelOptional: { fontFamily: font.regular, color: colors.muted },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontFamily: font.regular, fontSize: type.lg, color: colors.onSurface, backgroundColor: colors.surface },
  inputPrefilled: { backgroundColor: colors.brandTertiary, borderColor: "#FFD5C9" },
  inputError: { borderColor: colors.error, borderWidth: 1.5 },
  fieldErrorText: { fontFamily: font.medium, fontSize: type.sm, color: colors.error, marginTop: 6 },
  helperText: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 6 },
  inputMono: { fontFamily: undefined, letterSpacing: 0.3 },

  svcGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  svcCard: { width: "47%", flexGrow: 1, alignItems: "center", padding: 20, borderRadius: radius.md, borderWidth: 2, borderColor: "transparent", backgroundColor: colors.surface },
  svcCardOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  svcIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  svcLabel: { fontFamily: font.semibold, fontSize: type.lg, color: colors.heading },
  svcSelected: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.5, color: colors.brandPrimary, marginTop: 4 },

  lockedSite: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: "#FFD5C9", borderRadius: radius.md, padding: spacing.md, marginBottom: 14 },
  lockedIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  lockedKicker: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.brandPrimary, marginBottom: 2 },
  lockedName: { fontFamily: font.bold, fontSize: type.title, color: colors.heading },
  lockedAddr: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  changeLink: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },

  radioRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: 10 },
  radioRowOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  radioRowError: { borderColor: colors.error },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginTop: 1 },
  radioOn: { borderColor: colors.brandPrimary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brandPrimary },
  radioText: { fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  radioDesc: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted, marginTop: 2 },
  preview: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceSecondary, marginTop: -4, marginBottom: 4 },

  meterHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  groupDivider: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 22 },
  meterHeadIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  meterCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginBottom: 12 },
  meterTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 },
  meterTitle: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  prefilledBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: "#FFD5C9" },
  prefilledBadgeText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.5, color: colors.brandPrimary },
  removeText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.error },

  addMeter: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brandPrimary, borderRadius: radius.md, paddingVertical: spacing.md, backgroundColor: colors.brandTertiary },
  addMeterText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },

  idkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, paddingVertical: 4 },
  idkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  idkBoxOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  idkLabel: { fontFamily: font.medium, fontSize: type.base, color: colors.heading },
  idkNote: { marginTop: 10, backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: 12 },
  idkNoteText: { fontFamily: font.regular, fontSize: type.sm, color: colors.onSurfaceSecondary, lineHeight: 18 },

  confirmCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginBottom: 12, ...shadow.card },
  confirmHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  confirmIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  confirmTitle: { flex: 1, fontFamily: font.semibold, fontSize: type.title, color: colors.heading },
  confirmEdit: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brandPrimary },
  confirmRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.divider },
  confirmLabel: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },
  confirmVal: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  confirmValRight: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 6 },
  currentTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: "#FFD5C9" },
  currentTagText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.3, color: colors.brandPrimary },

  renewPill: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  renewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  renewTitle: { flex: 1, fontFamily: font.bold, fontSize: type.base, lineHeight: 19 },
  renewDays: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.6)", flexShrink: 0 },
  renewDaysText: { fontFamily: font.semibold, fontSize: 12 },

  reviewCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: 10 },
  reviewCardTitle: { fontFamily: font.bold, fontSize: type.kicker, letterSpacing: 0.6, color: colors.muted, marginBottom: 8 },
  reviewPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  reviewPillText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurfaceSecondary },
  kvRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: spacing.md },
  kvKey: { fontFamily: font.regular, fontSize: type.base, color: colors.onSurfaceSecondary },
  kvVal: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurface, flex: 1, textAlign: "right" },
  miniCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm, padding: spacing.sm, marginBottom: 8 },
  miniCardTitle: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading, marginBottom: 2 },
  miniCardMpx: { fontSize: type.sm, color: colors.onSurfaceSecondary, marginBottom: 2, letterSpacing: 0.2 },
  miniCardSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.muted },

  error: { fontFamily: font.medium, fontSize: type.sm, color: colors.error, marginTop: 12 },
  navRow: { flexDirection: "row", gap: 10, marginTop: 20, marginBottom: 24 },
  navBtn: { height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  navBack: { flex: 1, backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  navBackText: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  navPrimary: { backgroundColor: colors.brandPrimary },
  navPrimaryText: { fontFamily: font.semibold, fontSize: type.lg, color: "#FFFFFF" },
});
