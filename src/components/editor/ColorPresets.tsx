"use client";

import { useState } from "react";
import { colorPresets } from "@/data/presets";
import GradientPicker from "./GradientPicker";

interface ColorPresetsProps {
  selected: string;
  customSolidColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: string;
  onChange: (presetId: string) => void;
  onCustomSolidChange?: (color: string) => void;
  onGradientChange?: (from: string, to: string, direction: string) => void;
}

export default function ColorPresets({
  selected,
  customSolidColor = "#0f0f0f",
  gradientFrom = "#667eea",
  gradientTo = "#764ba2",
  gradientDirection = "135deg",
  onChange,
  onCustomSolidChange,
  onGradientChange,
}: ColorPresetsProps) {
  const [showCustomGradient, setShowCustomGradient] = useState(false);
  const [showCustomSolid, setShowCustomSolid] = useState(false);

  const solidPresets = colorPresets.filter((p) => p.bgType === "solid");
  const gradientPresets = colorPresets.filter((p) => p.bgType === "gradient");

  const getPresetStyle = (preset: (typeof colorPresets)[0]): React.CSSProperties => {
    if (preset.bgType === "gradient") {
      return {
        background: `linear-gradient(${preset.gradientDirection ?? "135deg"}, ${preset.gradientFrom}, ${preset.gradientTo})`,
      };
    }
    return { backgroundColor: preset.bgColor };
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="block text-xs font-medium text-muted">색상 프리셋</label>

      {/* Solid presets */}
      <div>
        <p className="mb-1.5 text-xs text-muted">단색</p>
        <div className="flex flex-wrap gap-1.5">
          {solidPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onChange(preset.id);
                setShowCustomGradient(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                selected === preset.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-muted"
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-border"
                style={getPresetStyle(preset)}
              />
              {preset.name}
            </button>
          ))}

          {/* Custom solid toggle */}
          <button
            onClick={() => {
              setShowCustomSolid((v) => !v);
              setShowCustomGradient(false);
              onChange("custom-solid");
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
              selected === "custom-solid"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted"
            }`}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-border"
              style={{ backgroundColor: customSolidColor }}
            />
            커스텀
          </button>
        </div>
      </div>

      {/* Custom solid color picker */}
      {(showCustomSolid || selected === "custom-solid") && onCustomSolidChange && (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <input
            type="color"
            value={customSolidColor}
            onChange={(e) => onCustomSolidChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted">배경색</span>
            <span className="text-xs font-mono text-foreground">{customSolidColor}</span>
          </div>
        </div>
      )}

      {/* Gradient presets */}
      <div>
        <p className="mb-1.5 text-xs text-muted">그라데이션</p>
        <div className="flex flex-wrap gap-1.5">
          {gradientPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onChange(preset.id);
                setShowCustomGradient(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                selected === preset.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-muted"
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-border"
                style={getPresetStyle(preset)}
              />
              {preset.name}
            </button>
          ))}

          {/* Custom gradient toggle */}
          <button
            onClick={() => {
              setShowCustomGradient((v) => !v);
              onChange("custom-gradient");
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
              selected === "custom-gradient"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted"
            }`}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-border"
              style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
            />
            커스텀
          </button>
        </div>
      </div>

      {/* Custom gradient picker */}
      {(showCustomGradient || selected === "custom-gradient") && onGradientChange && (
        <div className="rounded-lg border border-border p-3">
          <GradientPicker
            from={gradientFrom}
            to={gradientTo}
            direction={gradientDirection}
            onChange={onGradientChange}
          />
        </div>
      )}
    </div>
  );
}
