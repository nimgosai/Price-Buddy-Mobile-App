import { Platform } from "react-native";

/** Desktop-web portal design tokens (≥1024px only). */
export const dt = {
  canvas: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  subtle: "#F1F5F9",
  hover: "#F1F5F9",
  text: "#0F172A",
  body: "#334155",
  muted: "#64748B",
  radius: 12,
  shadowSm: Platform.select({
    web: { boxShadow: "0 1px 2px rgba(15,23,42,0.06)" } as object,
    default: { shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  }),
};

export const dCard = {
  backgroundColor: dt.card,
  borderWidth: 1,
  borderColor: dt.border,
  borderRadius: dt.radius,
  ...dt.shadowSm,
};
