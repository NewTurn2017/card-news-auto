"use client";

import { useEffect, useState } from "react";
import { KOREAN_FONTS, FONT_CATEGORIES, DEFAULT_FONT_ID } from "@/data/fonts";

interface FontSelectorProps {
  selected?: string;
  onChange: (fontFamily: string) => void;
}

export default function FontSelector({ selected = DEFAULT_FONT_ID, onChange }: FontSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>("sans");

  // Load CDN font stylesheets as needed
  useEffect(() => {
    KOREAN_FONTS.forEach((font) => {
      if (!font.cdnUrl) return;
      const id = `font-cdn-${font.id}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = font.cdnUrl;
        document.head.appendChild(link);
      }
    });
  }, []);

  const filteredFonts = KOREAN_FONTS.filter((f) => f.category === activeCategory);

  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-muted">
        글씨체
      </label>

      {/* Category tabs */}
      <div className="mb-2 flex gap-1">
        {FONT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              activeCategory === cat.id
                ? "bg-accent/10 text-accent font-medium"
                : "text-muted hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Font grid */}
      <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
        {filteredFonts.map((font) => (
          <button
            key={font.id}
            onClick={() => onChange(font.id)}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
              selected === font.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted hover:text-foreground"
            }`}
            style={{ fontFamily: font.family }}
          >
            {font.name}
          </button>
        ))}
      </div>
    </div>
  );
}
