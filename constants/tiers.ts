export const tierLabels = [
  "HT1",
  "LT1",
  "HT2",
  "LT2",
  "HT3",
  "LT3",
  "HT4",
  "LT4",
  "HT5",
  "LT5",
] as const;

export const tierRanges: Record<string, string> = {
  HT1: "#1",
  LT1: "#2-3",
  HT2: "#4-6",
  LT2: "#7-12",
  HT3: "#13-25",
  LT3: "#26-50",
  HT4: "#51-100",
  LT4: "#101-150",
  HT5: "#151-200",
  LT5: "200+",
};

export const defaultTierColors: Record<string, string> = {
  HT1: "#e1036c",
  LT1: "#d32539",
  HT2: "#e86412",
  LT2: "#e68209",
  HT3: "#e4da1c",
  LT3: "#b3c03f",
  HT4: "#54b532",
  LT4: "#06b962",
  HT5: "#039BE5",
  LT5: "#1565C0",
};

export const normalizeColor = (c?: string) => {
  if (!c) return "";
  return c.startsWith("#") ? c : `#${c}`;
};

export const tierTextColor = (hex: string) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizeColor(hex));
  if (!m) return "#0a0a0a";
  const r = parseInt(m[1]!, 16) / 255;
  const g = parseInt(m[2]!, 16) / 255;
  const b = parseInt(m[3]!, 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? "#0a0a0a" : "#f8fafc";
};
