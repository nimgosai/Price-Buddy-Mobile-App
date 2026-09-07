// -------------------------------------------------------------------------
// DEMO DATA LAYER
// When demo mode is enabled (Profile → "Demo data"), GET requests to the
// listed endpoints are answered locally with realistic sample data so every
// screen looks full. Nothing is sent to the real backend and no real account
// data is touched. This is purely for previewing/testing the UI.
// -------------------------------------------------------------------------

let demoEnabled = false;
export function setDemoEnabled(v: boolean) {
  demoEnabled = v;
}
export function isDemoEnabled() {
  return demoEnabled;
}

export const DEMO_MODE_KEY = "uch_demo_mode";

// Append a site to the in-memory demo store so it shows immediately in the
// Sites tab and business switcher (demo mode only).
let demoPropSeq = 0;
export function addDemoProperty(p: { business_id: string; property_name: string; address: string; postcode: string }) {
  const business = BUSINESSES.find((b) => b.id === p.business_id);
  const prop = {
    id: `pnew${++demoPropSeq}`,
    business_id: p.business_id,
    property_name: (p.property_name || p.address || "New site").trim(),
    business_name: business?.company_name || "",
    address: p.address.trim(),
    postcode: p.postcode.trim().toUpperCase(),
  };
  PROPERTIES.push(prop);
  return prop;
}

const DAY = 24 * 60 * 60 * 1000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();

type DemoContract = {
  id: string;
  property_id: string;
  property_name: string;
  utility_type: string;
  supplier_name: string;
  supplier: string;
  tariff_name: string;
  annual_cost: number;
  start_date: string;
  end_date: string;
  days_until_expiry: number;
  meter_point_number: string;
  meter_serial_number: string;
  account_number: string;
  renewable_now: boolean;
  tariff_type: string;
  unit_rate_day: number | null;
  standing_charge: number | null;
  annual_usage: number | null;
  usage_unit: string;
};

const c = (
  id: string,
  property_id: string,
  property_name: string,
  utility_type: string,
  supplier_name: string,
  annual_cost: number,
  days: number,
  meter: string,
): DemoContract => ({
  id,
  property_id,
  property_name,
  utility_type,
  supplier_name,
  supplier: supplier_name,
  tariff_name: `${supplier_name} – Standard`,
  annual_cost,
  start_date: iso(days - 730),
  end_date: iso(days),
  days_until_expiry: days,
  meter_point_number: meter,
  meter_serial_number: `S${id.toUpperCase()}${Math.abs(days)}`,
  account_number: `AC-${id.toUpperCase()}-0042`,
  renewable_now: days > 90,
  // Tariff & rates (shown on the site detail "Your tariff & rates" panel).
  tariff_type: "Fixed",
  unit_rate_day: utility_type === "electricity" ? 27.14 : utility_type === "gas" ? 7.42 : null,
  standing_charge: utility_type === "electricity" ? 69.9 : utility_type === "gas" ? 32.5 : null,
  annual_usage: utility_type === "electricity" ? Math.round(annual_cost * 3.1) : utility_type === "gas" ? Math.round(annual_cost * 9.5) : null,
  usage_unit: "kWh",
});

const CONTRACTS: DemoContract[] = [
  // ---- Business 1: Price Buddy Demo Ltd ----
  c("e1", "p1", "Head Office", "electricity", "British Gas", 8450, 34, "20 0001 1223 344"),
  c("g1", "p1", "Head Office", "gas", "British Gas", 5200, 34, "77 1234 5678"),
  c("b1c", "p3", "Bristol Retail Unit", "broadband", "BT", 1150, 88, "BT-0098-221"),
  c("t1", "p3", "Bristol Retail Unit", "telecoms", "Vodafone", 2400, 155, "VF-7781-330"),
  c("e2", "p2", "Manchester Warehouse", "electricity", "EDF Energy", 12300, 210, "20 5566 7788 991"),
  c("w1", "p2", "Manchester Warehouse", "water", "United Utilities", 3100, 400, "UU-4410-118"),
  // ---- Business 2: Riverside Cafés Ltd ----
  c("e3", "p4", "Riverside Café — Bath", "electricity", "Octopus Energy", 6100, 58, "20 8842 1190 552"),
  c("g2", "p4", "Riverside Café — Bath", "gas", "E.ON Next", 3980, 58, "88 4410 9921"),
  c("e4", "p5", "Riverside Café — Oxford", "electricity", "Scottish Power", 5400, 260, "20 3391 7788 220"),
  c("w2", "p5", "Riverside Café — Oxford", "water", "Thames Water", 1850, 320, "TW-9982-441"),
];

const PROPERTIES = [
  // ---- Business 1: Price Buddy Demo Ltd ----
  { id: "p1", business_id: "b1", property_name: "Head Office", business_name: "Price Buddy Demo Ltd", address: "100 High Holborn", postcode: "WC1V 6LT" },
  { id: "p2", business_id: "b1", property_name: "Manchester Warehouse", business_name: "Price Buddy Demo Ltd", address: "22 Trafford Park", postcode: "M17 1WA" },
  { id: "p3", business_id: "b1", property_name: "Bristol Retail Unit", business_name: "Price Buddy Demo Ltd", address: "5 Park Street", postcode: "BS1 5NG" },
  // ---- Business 2: Riverside Cafés Ltd ----
  { id: "p4", business_id: "b2", property_name: "Riverside Café — Bath", business_name: "Riverside Cafés Ltd", address: "12 Pulteney Bridge", postcode: "BA2 4AT" },
  { id: "p5", business_id: "b2", property_name: "Riverside Café — Oxford", business_name: "Riverside Cafés Ltd", address: "3 Cornmarket Street", postcode: "OX1 3EX" },
];

// Two demo businesses. site_count / contract_count are derived so the
// switcher chip and any counters stay in sync with the data above.
const BUSINESSES = [
  { id: "b1", company_name: "Price Buddy Demo Ltd", business_type: "Multi-site retailer", is_primary: true },
  { id: "b2", company_name: "Riverside Cafés Ltd", business_type: "Hospitality", is_primary: false },
].map((b) => ({
  ...b,
  site_count: PROPERTIES.filter((p) => p.business_id === b.id).length,
  contract_count: CONTRACTS.filter((x) => PROPERTIES.some((p) => p.id === x.property_id && p.business_id === b.id)).length,
}));

function sumBy<T>(items: T[], pick: (t: T) => number) {
  return items.reduce((a, t) => a + pick(t), 0);
}

function spendReport(list: DemoContract[] = CONTRACTS) {
  const byUtilityMap: Record<string, number> = {};
  const bySiteMap: Record<string, number> = {};
  list.forEach((x) => {
    byUtilityMap[x.utility_type] = (byUtilityMap[x.utility_type] || 0) + x.annual_cost;
    bySiteMap[x.property_name] = (bySiteMap[x.property_name] || 0) + x.annual_cost;
  });
  return {
    total_annual_spend: sumBy(list, (x) => x.annual_cost),
    by_utility: Object.entries(byUtilityMap)
      .map(([utility, spend]) => ({ utility, utility_type: utility, spend, annual_spend: spend }))
      .sort((a, b) => b.spend - a.spend),
    by_site: Object.entries(bySiteMap)
      .map(([site, spend]) => ({ site, site_name: site, spend, annual_spend: spend }))
      .sort((a, b) => b.spend - a.spend),
    contracts: list.map((x) => ({
      id: x.id,
      utility_type: x.utility_type,
      supplier: x.supplier_name,
      supplier_name: x.supplier_name,
      site: x.property_name,
      property_name: x.property_name,
      annual_cost: x.annual_cost,
      annual_spend: x.annual_cost,
    })),
  };
}

function utilitiesForProperty(id: string) {
  const property = PROPERTIES.find((p) => p.id === id) || PROPERTIES[0];
  const utilities: Record<string, DemoContract> = {};
  CONTRACTS.filter((x) => x.property_id === id).forEach((x) => {
    utilities[x.utility_type] = x;
  });
  return { property, utilities };
}

/**
 * Returns a demo payload for a GET path, or undefined if the path isn't mocked
 * (in which case the real request proceeds).
 */
export function getDemoResponse(path: string): any | undefined {
  if (!demoEnabled) return undefined;
  const [clean, qs = ""] = path.split("?");

  // Respect "?business_id=<id>" so switching businesses actually filters the UI.
  const m = qs.match(/business_id=([^&]+)/);
  const bizId = m ? decodeURIComponent(m[1]) : "";
  const props = bizId ? PROPERTIES.filter((p) => p.business_id === bizId) : PROPERTIES;
  const propIds = new Set(props.map((p) => p.id));
  const contracts = bizId ? CONTRACTS.filter((x) => propIds.has(x.property_id)) : CONTRACTS;

  if (clean === "/businesses") return BUSINESSES.map((b) => ({
    ...b,
    site_count: PROPERTIES.filter((p) => p.business_id === b.id).length,
    contract_count: CONTRACTS.filter((x) => PROPERTIES.some((p) => p.id === x.property_id && p.business_id === b.id)).length,
  }));
  if (clean === "/properties") return props;
  if (clean === "/contracts") return contracts;
  const one = clean.match(/^\/contracts\/([^/]+)$/);
  if (one) return CONTRACTS.find((x) => x.id === one[1]) || CONTRACTS[0];
  if (clean === "/reports/spend") return spendReport(contracts);
  if (clean === "/renewals/urgent") {
    const items = contracts
      .filter((x) => x.days_until_expiry <= 90)
      .sort((a, b) => a.days_until_expiry - b.days_until_expiry)
      .map((x) => {
        const p = PROPERTIES.find((pp) => pp.id === x.property_id);
        return {
          ...x,
          contract_id: x.id,
          business_id: p?.business_id || "",
          business_name: p?.business_name || "",
          postcode: p?.postcode || "",
        };
      });
    return { items };
  }
  if (clean === "/dashboard/overview") {
    return {
      all_contracts: contracts,
      contracts: contracts,
      urgency_summary: {},
      expiring_contracts: contracts.filter((x) => x.days_until_expiry <= 90),
    };
  }
  if (clean === "/my/audits-in-progress") return [{ id: "a1", status: "processing" }];

  const util = clean.match(/^\/properties\/([^/]+)\/utilities$/);
  if (util) return utilitiesForProperty(util[1]);

  return undefined;
}

// Load the saved preference at startup so GET requests are answered correctly
// from the very first fetch.
import { storage } from "@/src/utils/storage";
storage
  .getItem<boolean>(DEMO_MODE_KEY, false)
  .then((v) => {
    demoEnabled = !!v;
  })
  .catch(() => {});
