import type { CSSProperties } from "react";
import type { ColorPreset } from "@/types";

export const colorPresets: ColorPreset[] = [
  // Solid presets
  {
    id: "dark",
    name: "다크",
    bgType: "solid",
    bgColor: "#0f0f0f",
    textColor: "#ffffff",
    accentColor: "#4ae3c0",
    subtextColor: "#a0a0a0",
  },
  {
    id: "light",
    name: "라이트",
    bgType: "solid",
    bgColor: "#ffffff",
    textColor: "#111111",
    accentColor: "#0d9488",
    subtextColor: "#666666",
  },
  {
    id: "navy",
    name: "네이비",
    bgType: "solid",
    bgColor: "#1a1a4e",
    textColor: "#ffffff",
    accentColor: "#ffd700",
    subtextColor: "#a0a8cc",
  },
  {
    id: "cream",
    name: "크림",
    bgType: "solid",
    bgColor: "#f5f0e8",
    textColor: "#2d2d2d",
    accentColor: "#b8860b",
    subtextColor: "#6b6560",
  },
  // Gradient presets
  {
    id: "sunset",
    name: "선셋",
    bgType: "gradient",
    gradientFrom: "#f093fb",
    gradientTo: "#f5576c",
    gradientDirection: "135deg",
    textColor: "#ffffff",
    accentColor: "#ffd700",
    subtextColor: "rgba(255,255,255,0.8)",
  },
  {
    id: "ocean",
    name: "오션",
    bgType: "gradient",
    gradientFrom: "#667eea",
    gradientTo: "#764ba2",
    gradientDirection: "135deg",
    textColor: "#ffffff",
    accentColor: "#00f2fe",
    subtextColor: "rgba(255,255,255,0.8)",
  },
  {
    id: "forest",
    name: "포레스트",
    bgType: "gradient",
    gradientFrom: "#11998e",
    gradientTo: "#38ef7d",
    gradientDirection: "135deg",
    textColor: "#ffffff",
    accentColor: "#ffd700",
    subtextColor: "rgba(255,255,255,0.8)",
  },
  {
    id: "midnight",
    name: "미드나잇",
    bgType: "gradient",
    gradientFrom: "#0f0c29",
    gradientTo: "#302b63",
    gradientDirection: "135deg",
    textColor: "#ffffff",
    accentColor: "#4ae3c0",
    subtextColor: "rgba(255,255,255,0.8)",
  },
];

export function getPresetById(id: string): ColorPreset {
  return colorPresets.find((p) => p.id === id) ?? colorPresets[0];
}

export function getPresetBackground(preset: ColorPreset): CSSProperties {
  if (preset.bgType === "gradient") {
    return {
      background: `linear-gradient(${preset.gradientDirection ?? "135deg"}, ${preset.gradientFrom}, ${preset.gradientTo})`,
      color: preset.textColor,
    };
  }
  return {
    backgroundColor: preset.bgColor,
    color: preset.textColor,
  };
}
