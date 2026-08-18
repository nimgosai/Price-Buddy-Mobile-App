// Design tokens — Utility Contract Hub / PriceBuddy branding.
// Accent orange #F25028, navy text/headings, soft off-white background.

export const colors = {
  surface: "#FFFFFF", // cards
  onSurface: "#1E293B", // main / card text
  heading: "#1A1D1E", // page titles & greetings (dark slate)
  surfaceSecondary: "#F8F9FC", // app background
  onSurfaceSecondary: "#475569", // secondary text (readable medium-slate)
  surfaceTertiary: "#EEF0F6",
  surfaceInverse: "#1A1D1E",
  onSurfaceInverse: "#FFFFFF",

  brand: "#FF6B47",
  brandPrimary: "#FF6B47",
  brandPrimaryPressed: "#E85535",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#1A1F36",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FFEAE4", // light accent tint
  onBrandTertiary: "#FF6B47",

  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#4A5169",

  border: "#E6E8F0",
  borderStrong: "#C3C8D8",
  divider: "#EEF0F6",
  muted: "#64748B",

  urgency: {
    critical: "#EF4444",
    high: "#F97316",
    medium: "#F59E0B",
    renewable: "#10B981",
    low: "#6B7280",
    normal: "#1F2A44",
  } as Record<string, string>,

  // Soft pastel tints — mirror the live web app (--hu-pastel-*)
  pastel: {
    blue: "#BFDBFE",
    blueIcon: "#2563EB",
    lavender: "#DDD6FE",
    lavenderIcon: "#7C3AED",
    mint: "#BBF7D0",
    mintIcon: "#059669",
    peach: "#FED7AA",
    peachIcon: "#EA580C",
    yellow: "#FEF3C7",
    yellowIcon: "#F59E0B",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 14,
  md: 20,
  lg: 28,
  pill: 999,
};

export const font = {
  regular: "Geist-Regular",
  medium: "Geist-Medium",
  semibold: "Geist-SemiBold",
  bold: "Geist-Bold",
};

// Canonical type scale — mirrors the original web app (hu-* classes):
//  kicker 11 (hu-mini), sm 13 (hu-muted), title 15 (card/row titles),
//  xl 18 (hu-h3 page/header titles), 2xl 24 (hu-h2), 3xl 30 (hu-h1).
export const type = {
  kicker: 11,
  sm: 13,
  base: 14,
  title: 15,
  lg: 16,
  xl: 18,
  "2xl": 24,
  "3xl": 30,
};

export const shadow = {
  card: {
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
};
