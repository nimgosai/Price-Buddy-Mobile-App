import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, TextField } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/auth/auth-context";
import { apiRequest, ApiError } from "@/src/api/client";
import { colors, font, radius, spacing, type } from "@/src/theme/theme";

const SERVICES = [
  { key: "electric", label: "Electricity", icon: "flash" as const },
  { key: "gas", label: "Gas", icon: "flame" as const },
  { key: "water", label: "Water", icon: "water" as const },
  { key: "telecoms", label: "Telecoms", icon: "wifi" as const },
];

function normalizeService(u?: string): string | null {
  if (!u) return null;
  const s = u.toLowerCase();
  if (s.startsWith("elect")) return "electric";
  if (s.startsWith("gas")) return "gas";
  if (s.startsWith("water")) return "water";
  if (s.startsWith("tele")) return "telecoms";
  return null;
}

export default function QuoteNew() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ utility_type?: string }>();

  const preset = normalizeService(params.utility_type);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set(preset ? [preset] : []));
  const [meterElectric, setMeterElectric] = useState("");
  const [meterGas, setMeterGas] = useState("");
  const [waterSupplier, setWaterSupplier] = useState("");
  const [telecomsSupplier, setTelecomsSupplier] = useState("");

  const [name, setName] = useState(user?.full_name || user?.company_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const postcodeRef = useRef<TextInput>(null);

  // AuthProvider may hydrate after mount — seed contact fields once available.
  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.full_name || user.company_name || "");
      setEmail((prev) => prev || user.email || "");
    }
  }, [user]);

  const has = (k: string) => selected.has(k);
  const toggle = (k: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/dashboard");
  };

  const validateStep1 = () => {
    const next: Record<string, string> = {};
    if (selected.size === 0) next.services = "Pick at least one utility";
    if (has("water") && !waterSupplier.trim()) next.water = "Enter your water supplier";
    if (has("telecoms") && !telecomsSupplier.trim()) next.telecoms = "Enter your telecoms supplier";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onNext = () => {
    if (validateStep1()) setStep(2);
  };

  const submit = async () => {
    if (submitting) return;
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter a contact name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email";
    if (!line1.trim()) next.line1 = "Enter the address";
    if (!postcode.trim()) next.postcode = "Enter the postcode";
    setErrors(next);
    if (Object.keys(next).length) return;

    const energy_meters: any[] = [];
    if (has("electric")) energy_meters.push({ utility: "electric", meter_number: meterElectric.trim() || undefined });
    if (has("gas")) energy_meters.push({ utility: "gas", meter_number: meterGas.trim() || undefined });

    const body: any = {
      selected_services: [...selected],
      contact: { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined },
      address: { line1: line1.trim(), city: city.trim(), postcode: postcode.trim().toUpperCase() },
    };
    if (energy_meters.length) body.energy_meters = energy_meters;
    if (has("water")) body.water_supplier = waterSupplier.trim();
    if (has("telecoms")) body.telecoms_supplier = telecomsSupplier.trim();

    setSubmitting(true);
    try {
      const res = await apiRequest<{ quote_request_id: string }>("/quotes/multi", {
        method: "POST",
        body,
      });
      router.replace(`/quote/success/${res.quote_request_id}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't submit your request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        testID="quote-header"
        title="Get a better deal"
        subtitle={`Step ${step} of 2`}
        onBack={goBack}
      />

      {step === 1 ? (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scroll}
          bottomOffset={90}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Which utilities?</Text>
          {!!errors.services && <Text style={styles.errText}>{errors.services}</Text>}
          <View style={styles.grid}>
            {SERVICES.map((s) => {
              const active = has(s.key);
              return (
                <Pressable
                  key={s.key}
                  testID={`quote-service-${s.key}`}
                  onPress={() => toggle(s.key)}
                  style={[styles.tile, active && styles.tileActive]}
                >
                  <Ionicons
                    name={s.icon}
                    size={22}
                    color={active ? colors.onBrandPrimary : colors.onSurfaceSecondary}
                  />
                  <Text style={[styles.tileText, active && styles.tileTextActive]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {(has("electric") || has("gas")) && (
            <View style={styles.section}>
              <Text style={styles.label}>Meter numbers (optional)</Text>
              {has("electric") && (
                <TextField
                  testID="quote-meter-electric"
                  label="Electricity MPAN"
                  value={meterElectric}
                  onChangeText={setMeterElectric}
                  placeholder="13-digit MPAN"
                  keyboardType="number-pad"
                />
              )}
              {has("gas") && (
                <TextField
                  testID="quote-meter-gas"
                  label="Gas MPRN"
                  value={meterGas}
                  onChangeText={setMeterGas}
                  placeholder="MPRN number"
                  keyboardType="number-pad"
                />
              )}
            </View>
          )}

          {has("water") && (
            <View style={styles.section}>
              <TextField
                testID="quote-water-supplier"
                label="Current water supplier"
                value={waterSupplier}
                onChangeText={(t) => {
                  setWaterSupplier(t);
                  if (errors.water) setErrors((p) => ({ ...p, water: "" }));
                }}
                error={errors.water}
                placeholder="e.g. Thames Water"
              />
            </View>
          )}

          {has("telecoms") && (
            <View style={styles.section}>
              <TextField
                testID="quote-telecoms-supplier"
                label="Current telecoms supplier"
                value={telecomsSupplier}
                onChangeText={(t) => {
                  setTelecomsSupplier(t);
                  if (errors.telecoms) setErrors((p) => ({ ...p, telecoms: "" }));
                }}
                error={errors.telecoms}
                placeholder="e.g. BT"
              />
            </View>
          )}
        </KeyboardAwareScrollView>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scroll}
          bottomOffset={90}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Where should we reach you?</Text>
          <TextField
            testID="quote-contact-name"
            label="Contact name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors((p) => ({ ...p, name: "" }));
            }}
            error={errors.name}
            placeholder="Full name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <TextField
            testID="quote-contact-email"
            ref={emailRef}
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors((p) => ({ ...p, email: "" }));
            }}
            error={errors.email}
            placeholder="you@company.co.uk"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField
            testID="quote-contact-phone"
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="07…"
            keyboardType="phone-pad"
          />
          <TextField
            testID="quote-addr-line1"
            label="Address"
            value={line1}
            onChangeText={(t) => {
              setLine1(t);
              if (errors.line1) setErrors((p) => ({ ...p, line1: "" }));
            }}
            error={errors.line1}
            placeholder="Street and building"
            returnKeyType="next"
            onSubmitEditing={() => cityRef.current?.focus()}
          />
          <TextField
            testID="quote-addr-city"
            ref={cityRef}
            label="Town / city"
            value={city}
            onChangeText={setCity}
            placeholder="e.g. London"
            returnKeyType="next"
            onSubmitEditing={() => postcodeRef.current?.focus()}
          />
          <TextField
            testID="quote-addr-postcode"
            ref={postcodeRef}
            label="Postcode"
            value={postcode}
            onChangeText={(t) => {
              setPostcode(t.toUpperCase());
              if (errors.postcode) setErrors((p) => ({ ...p, postcode: "" }));
            }}
            error={errors.postcode}
            placeholder="e.g. SW1A 1AA"
            autoCapitalize="characters"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <View style={styles.note}>
            <Ionicons name="shield-checkmark" size={18} color={colors.success} />
            <Text style={styles.noteText}>No obligation — we&apos;ll only switch you if it saves money.</Text>
          </View>
        </KeyboardAwareScrollView>
      )}

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          {step === 1 ? (
            <Button testID="quote-next" label="Continue" onPress={onNext} />
          ) : (
            <Button testID="quote-submit" label="Request quote" icon="pricetag-outline" onPress={submit} loading={submitting} />
          )}
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  label: { fontFamily: font.semibold, fontSize: type.base, color: colors.heading },
  errText: { fontFamily: font.regular, fontSize: type.sm, color: colors.error },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 60,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  tileText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurfaceSecondary },
  tileTextActive: { color: colors.onBrandPrimary },
  section: { gap: spacing.md },
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noteText: { flex: 1, fontFamily: font.medium, fontSize: type.base, color: "#065F46" },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
