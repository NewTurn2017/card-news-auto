"use client";

import { layouts } from "@/data/layouts";

interface LayoutSelectorProps {
  selected: string;
  onChange: (layoutId: string) => void;
}

// Simple visual representation of each layout
const layoutIcons: Record<string, string[]> = {
  "center-title": ["", "▬", "▬", ""],
  "bottom-heavy": ["", "", "▬", "▬"],
  "top-title": ["▬", "▬", "", ""],
  "left-align": ["", "▬▬", "▬", ""],
  "bottom-center": ["", "", "▬", "▬"],
  "top-left": ["▬▬", "▬", "", ""],
  "minimal-center": ["", "▬▬▬", "", ""],
  "bottom-left": ["", "", "▬▬", "▬"],
  "split-center": ["▬", "", "▬▬", "▬"],
};

export default function LayoutSelector({
  selected,
  onChange,
}: LayoutSelectorProps) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-muted">레이아웃</label>
      <div className="grid grid-cols-3 gap-2">
        {layouts.map((layout) => (
          <button
            key={layout.id}
            onClick={() => onChange(layout.id)}
            className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border text-[8px] leading-tight transition-colors ${
              selected === layout.id
                ? "border-accent bg-accent/10"
                : "border-border hover:border-muted"
            }`}
            title={layout.name}
          >
            {(layoutIcons[layout.id] || ["", "▬", "", ""]).map((line, i) => (
              <span key={i} className="text-muted">
                {line || "\u00A0"}
              </span>
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}
