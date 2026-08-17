// Design tokens — Utility Contract Hub / PriceBuddy branding.
// Accent orange #F25028, navy text/headings, soft off-white background.

export const colors = {
  surface: "#FFFFFF", // cards
  onSurface: "#1A1F36", // main text
  heading: "#1F2A44", // headings
  surfaceSecondary: "#F8F9FC", // app background
  onSurfaceSecondary: "#4A5169",
  surfaceTertiary: "#EEF0F6",
  surfaceInverse: "#1F2A44",
  onSurfaceInverse: "#FFFFFF",

  brand: "#F25028",
  brandPrimary: "#F25028",
  brandPrimaryPressed: "#DD3F1B",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#1F2A44",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FDE7DF", // light accent tint
  onBrandTertiary: "#F25028",

  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#4A5169",

  border: "#E6E8F0",
  borderStrong: "#C3C8D8",
  divider: "#EEF0F6",
  muted: "#8A90A6",

  urgency: {
    critical: "#EF4444",
    high: "#F97316",
    medium: "#F59E0B",
    renewable: "#10B981",
    low: "#6B7280",
    normal: "#1F2A44",
  } as Record<string, string>,
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

export const type = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
};

export const shadow = {
  card: {
    shadowColor: "#1F2A44",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
};
