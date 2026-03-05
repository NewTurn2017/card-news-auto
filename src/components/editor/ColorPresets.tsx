"use client";

import { colorPresets } from "@/data/presets";

interface ColorPresetsProps {
  selected: "light" | "dark";
  onChange: (preset: "light" | "dark") => void;
}

export default function ColorPresets({ selected, onChange }: ColorPresetsProps) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-muted">색상 프리셋</label>
      <div className="flex gap-2">
        {colorPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onChange(preset.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
              selected === preset.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted"
            }`}
          >
            <span
              className="h-4 w-4 rounded-full border border-border"
              style={{ backgroundColor: preset.bgColor }}
            />
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
