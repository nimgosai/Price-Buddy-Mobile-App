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
  tariff_name: "Fixed 24",
  annual_cost,
  start_date: iso(days - 730),
  end_date: iso(days),
  days_until_expiry: days,
  meter_point_number: meter,
  meter_serial_number: `S${id.toUpperCase()}${Math.abs(days)}`,
  account_number: `AC-${id.toUpperCase()}-0042`,
  renewable_now: days > 90,
});

const CONTRACTS: DemoContract[] = [
  c("e1", "p1", "Head Office", "electricity", "British Gas", 8450, 34, "20 0001 1223 344"),
  c("g1", "p1", "Head Office", "gas", "British Gas", 5200, 34, "77 1234 5678"),
  c("b1", "p3", "Bristol Retail Unit", "broadband", "BT", 1150, 88, "BT-0098-221"),
  c("t1", "p3", "Bristol Retail Unit", "telecoms", "Vodafone", 2400, 155, "VF-7781-330"),
  c("e2", "p2", "Manchester Warehouse", "electricity", "EDF Energy", 12300, 210, "20 5566 7788 991"),
  c("w1", "p2", "Manchester Warehouse", "water", "United Utilities", 3100, 400, "UU-4410-118"),
];

const PROPERTIES = [
  { id: "p1", property_name: "Head Office", business_name: "Price Buddy Demo Ltd", address: "100 High Holborn", postcode: "WC1V 6LT" },
  { id: "p2", property_name: "Manchester Warehouse", business_name: "Price Buddy Demo Ltd", address: "22 Trafford Park", postcode: "M17 1WA" },
  { id: "p3", property_name: "Bristol Retail Unit", business_name: "Price Buddy Demo Ltd", address: "5 Park Street", postcode: "BS1 5NG" },
];

function sumBy<T>(items: T[], pick: (t: T) => number) {
  return items.reduce((a, t) => a + pick(t), 0);
}

function spendReport() {
  const byUtilityMap: Record<string, number> = {};
  const bySiteMap: Record<string, number> = {};
  CONTRACTS.forEach((x) => {
    byUtilityMap[x.utility_type] = (byUtilityMap[x.utility_type] || 0) + x.annual_cost;
    bySiteMap[x.property_name] = (bySiteMap[x.property_name] || 0) + x.annual_cost;
  });
  return {
    total_annual_spend: sumBy(CONTRACTS, (x) => x.annual_cost),
    by_utility: Object.entries(byUtilityMap)
      .map(([utility, spend]) => ({ utility, utility_type: utility, spend, annual_spend: spend }))
      .sort((a, b) => b.spend - a.spend),
    by_site: Object.entries(bySiteMap)
      .map(([site, spend]) => ({ site, site_name: site, spend, annual_spend: spend }))
      .sort((a, b) => b.spend - a.spend),
    contracts: CONTRACTS.map((x) => ({
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
  const clean = path.split("?")[0];

  if (clean === "/properties") return PROPERTIES;
  if (clean === "/contracts") return CONTRACTS;
  const one = clean.match(/^\/contracts\/([^/]+)$/);
  if (one) return CONTRACTS.find((x) => x.id === one[1]) || CONTRACTS[0];
  if (clean === "/reports/spend") return spendReport();
  if (clean === "/renewals/urgent") {
    const items = CONTRACTS.filter((x) => x.days_until_expiry <= 90).sort(
      (a, b) => a.days_until_expiry - b.days_until_expiry,
    );
    return { items };
  }
  if (clean === "/dashboard/overview") {
    return {
      all_contracts: CONTRACTS,
      contracts: CONTRACTS,
      urgency_summary: {},
      expiring_contracts: CONTRACTS.filter((x) => x.days_until_expiry <= 90),
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
