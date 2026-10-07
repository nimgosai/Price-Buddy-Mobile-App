import Svg, { Circle, Path, Rect } from "react-native-svg";

// Exact replica of the web app's icon set (`hr`) — same paths, so icons match 1:1.
type El =
  | { t: "path"; d: string; fill?: boolean; opacity?: number }
  | { t: "circle"; cx: number; cy: number; r: number; fill?: boolean }
  | { t: "rect"; x: number; y: number; w: number; h: number; rx: number; fill?: boolean };

type Def = { mode: "fill" | "stroke"; sw?: number; els: El[] };

export const ICONS: Record<string, Def> = {
  bolt: { mode: "fill", els: [{ t: "path", d: "M13 2L3 14h7l-1 8 11-13h-7l1-7z" }] },
  fire: {
    mode: "fill",
    els: [
      { t: "path", d: "M12 2s4 4 4 8a4 4 0 11-8 0c0-2 1-3 2-4-1 4 2 4 2 4s-1-3 0-5 0-3 0-3z" },
      { t: "path", d: "M5 14c0 4 3 7 7 7s7-3 7-7c0-2-1-4-2-5 0 3-2 4-2 4s1-3 0-5c-1 2-3 3-5 4s-5 1-5 2z", opacity: 0.7 },
    ],
  },
  droplet: { mode: "fill", els: [{ t: "path", d: "M12 2c-4 6-7 9-7 13a7 7 0 0014 0c0-4-3-7-7-13z" }] },
  wifi: {
    mode: "stroke",
    sw: 2,
    els: [
      { t: "path", d: "M2 9a14 14 0 0120 0" },
      { t: "path", d: "M5 12.5a10 10 0 0114 0" },
      { t: "path", d: "M8.5 16a5 5 0 017 0" },
      { t: "circle", cx: 12, cy: 19, r: 1.2, fill: true },
    ],
  },
  phone: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" }] },
  shield: { mode: "fill", els: [{ t: "path", d: "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" }] },
  home: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M3 11l9-8 9 8" }, { t: "path", d: "M5 10v10h14V10" }] },
  scan: {
    mode: "stroke",
    sw: 2,
    els: [
      { t: "path", d: "M4 7V5a1 1 0 011-1h2" },
      { t: "path", d: "M20 7V5a1 1 0 00-1-1h-2" },
      { t: "path", d: "M4 17v2a1 1 0 001 1h2" },
      { t: "path", d: "M20 17v2a1 1 0 01-1 1h-2" },
      { t: "path", d: "M4 12h16" },
    ],
  },
  building: { mode: "fill", els: [{ t: "path", d: "M4 21V4h7v17H4zm9 0V9h7v12h-7zM6 7h3v2H6V7zm0 4h3v2H6v-2zm0 4h3v2H6v-2zm9-2h3v2h-3v-2zm0 4h3v2h-3v-2z" }] },
  mapPin: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" }, { t: "circle", cx: 12, cy: 10, r: 2.6 }] },
  close: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M6 6l12 12M18 6L6 18" }] },
  user: { mode: "stroke", sw: 2, els: [{ t: "circle", cx: 12, cy: 8, r: 4 }, { t: "path", d: "M4 20c0-4 4-7 8-7s8 3 8 7" }] },
  chevronRight: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M9 6l6 6-6 6" }] },
  chevronDown: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M6 9l6 6 6-6" }] },
  arrowLeft: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M15 18l-6-6 6-6" }] },
  plus: { mode: "stroke", sw: 2.5, els: [{ t: "path", d: "M12 5v14M5 12h14" }] },
  bell: { mode: "fill", els: [{ t: "path", d: "M12 2a6 6 0 00-6 6v3l-2 4h16l-2-4V8a6 6 0 00-6-6zm0 20a3 3 0 003-3H9a3 3 0 003 3z" }] },
  document: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" }, { t: "path", d: "M14 3v5h5" }] },
  fingerprint: {
    mode: "stroke",
    sw: 1.6,
    els: [
      { t: "path", d: "M5 12a7 7 0 0114 0v2" },
      { t: "path", d: "M8 12a4 4 0 018 0v3" },
      { t: "path", d: "M12 11v6" },
      { t: "path", d: "M16 16c0 2-1 4-3 5" },
      { t: "path", d: "M9 21c-2-2-3-4-3-7" },
    ],
  },
  faceid: {
    mode: "stroke",
    sw: 1.6,
    els: [
      { t: "path", d: "M5 8V6a1 1 0 011-1h2" },
      { t: "path", d: "M19 8V6a1 1 0 00-1-1h-2" },
      { t: "path", d: "M5 16v2a1 1 0 001 1h2" },
      { t: "path", d: "M19 16v2a1 1 0 01-1 1h-2" },
      { t: "circle", cx: 9, cy: 11, r: 0.8, fill: true },
      { t: "circle", cx: 15, cy: 11, r: 0.8, fill: true },
      { t: "path", d: "M12 11v3" },
      { t: "path", d: "M9 16c1 1 2 1.5 3 1.5s2-0.5 3-1.5" },
    ],
  },
  logout: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" }, { t: "path", d: "M16 17l5-5-5-5" }, { t: "path", d: "M21 12H9" }] },
  lock: { mode: "stroke", sw: 2, els: [{ t: "rect", x: 4, y: 11, w: 16, h: 10, rx: 2 }, { t: "path", d: "M8 11V7a4 4 0 018 0v4" }] },
  search: { mode: "stroke", sw: 2, els: [{ t: "circle", cx: 11, cy: 11, r: 7 }, { t: "path", d: "M21 21l-4.3-4.3" }] },
  check: { mode: "stroke", sw: 2.5, els: [{ t: "path", d: "M5 12l5 5L20 7" }] },
  mail: { mode: "stroke", sw: 2, els: [{ t: "rect", x: 3, y: 5, w: 18, h: 14, rx: 2.5 }, { t: "path", d: "M3.5 7l8.5 6 8.5-6" }] },
  meter: {
    mode: "stroke",
    sw: 2,
    els: [
      { t: "rect", x: 4, y: 4, w: 16, h: 16, rx: 3 },
      { t: "circle", cx: 12, cy: 12, r: 4 },
      { t: "path", d: "M12 12l2.5-2.5" },
      { t: "path", d: "M12 4v2" },
      { t: "path", d: "M12 18v2" },
    ],
  },
  users: {
    mode: "stroke",
    sw: 2,
    els: [
      { t: "circle", cx: 9, cy: 8, r: 3.2 },
      { t: "path", d: "M3 20c0-3 3-5 6-5s6 2 6 5" },
      { t: "circle", cx: 17, cy: 9, r: 2.6 },
      { t: "path", d: "M15 14c3 0 6 1.5 6 4" },
    ],
  },
  heart: { mode: "fill", els: [{ t: "path", d: "M12 21s-7-4.5-9-9.5C1.6 7.5 4 4 7.5 4c2 0 3.4 1 4.5 2.5C13.1 5 14.5 4 16.5 4 20 4 22.4 7.5 21 11.5 19 16.5 12 21 12 21z" }] },
  clipboard: {
    mode: "stroke",
    sw: 2,
    els: [
      { t: "rect", x: 6, y: 5, w: 12, h: 16, rx: 2 },
      { t: "rect", x: 9, y: 3, w: 6, h: 4, rx: 1, fill: true },
      { t: "path", d: "M9 12h6" },
      { t: "path", d: "M9 16h4" },
    ],
  },
  arrowUp: { mode: "stroke", sw: 2, els: [{ t: "path", d: "M12 20V4" }, { t: "path", d: "M5 11l7-7 7 7" }] },
  chat: {
    mode: "stroke",
    sw: 2,
    els: [
      { t: "path", d: "M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-4 4V6a1 1 0 011-1z" },
      { t: "circle", cx: 9, cy: 11, r: 0.8, fill: true },
      { t: "circle", cx: 12, cy: 11, r: 0.8, fill: true },
      { t: "circle", cx: 15, cy: 11, r: 0.8, fill: true },
    ],
  },
  sparkle: {
    mode: "fill",
    els: [
      { t: "path", d: "M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" },
      { t: "path", d: "M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6L15.5 17.5l2.6-.9L19 14z", opacity: 0.7 },
    ],
  },
  pound: {
    mode: "stroke",
    sw: 2.5,
    els: [
      { t: "path", d: "M17 6.5c-.9-1.4-2.5-2.3-4.3-2.3-2.9 0-5.3 2.4-5.3 5.4 0 1.5.6 2.8 1.5 3.8" },
      { t: "path", d: "M4.5 13.5h11" },
      { t: "path", d: "M7.5 13c.4 1.3.5 2.7.2 4.1-.3 1.2-.9 2.4-1.7 3.2h12" },
    ],
  },
  warning: {
    mode: "stroke",
    sw: 2,
    els: [
      { t: "path", d: "M12 3L2 20h20L12 3z" },
      { t: "path", d: "M12 10v5" },
      { t: "circle", cx: 12, cy: 18, r: 0.9, fill: true },
    ],
  },
  eye: {
    mode: "stroke",
    sw: 2,
    els: [
      { t: "path", d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" },
      { t: "circle", cx: 12, cy: 12, r: 3 },
    ],
  },
};

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color = "#1A1F36",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const def = ICONS[name];
  if (!def) return null;
  const stroke = def.mode === "stroke";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {def.els.map((el, i) => {
        const filled = el.fill || def.mode === "fill";
        const common = {
          fill: filled ? color : "none",
          stroke: stroke && !el.fill ? color : "none",
          strokeWidth: def.sw ?? 2,
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
          opacity: (el as any).opacity ?? 1,
        };
        if (el.t === "circle") return <Circle key={i} cx={el.cx} cy={el.cy} r={el.r} {...common} />;
        if (el.t === "rect")
          return <Rect key={i} x={el.x} y={el.y} width={el.w} height={el.h} rx={el.rx} {...common} />;
        return <Path key={i} d={el.d} {...common} />;
      })}
    </Svg>
  );
}
