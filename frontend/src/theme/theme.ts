// Design tokens derived from /app/design_guidelines.json
// PriceBuddy "iOS-Native Clean" — strict black/white with an emerald accent.

export const colors = {
  surface: "#FFFFFF",
  onSurface: "#111111",
  surfaceSecondary: "#F5F5F5",
  onSurfaceSecondary: "#404040",
  surfaceTertiary: "#EBEBEB",
  surfaceInverse: "#111111",
  onSurfaceInverse: "#FFFFFF",
  brand: "#000000",
  brandPrimary: "#000000",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#0A5C36",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E6F2ED",
  onBrandTertiary: "#0A5C36",
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  info: "#475569",
  border: "#E5E5E5",
  borderStrong: "#A3A3A3",
  divider: "#EBEBEB",
  muted: "#737373",
  urgency: {
    critical: "#DC2626",
    high: "#EA580C",
    medium: "#F59E0B",
    renewable: "#16A34A",
    low: "#475569",
    normal: "#111111",
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
  sm: 6,
  md: 12,
  lg: 20,
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
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
