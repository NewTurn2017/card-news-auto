"use client";

const DIRECTIONS = [
  { label: "↘", value: "135deg" },
  { label: "→", value: "90deg" },
  { label: "↓", value: "180deg" },
  { label: "↗", value: "45deg" },
];

interface GradientPickerProps {
  from: string;
  to: string;
  direction: string;
  onChange: (from: string, to: string, direction: string) => void;
}

export default function GradientPicker({ from, to, direction, onChange }: GradientPickerProps) {
  const preview = `linear-gradient(${direction}, ${from}, ${to})`;

  return (
    <div className="flex flex-col gap-3">
      {/* Live preview */}
      <div
        className="h-10 w-full rounded-lg border border-border"
        style={{ background: preview }}
      />

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-muted">시작색</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={from}
              onChange={(e) => onChange(e.target.value, to, direction)}
              className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
            <span className="text-xs text-muted">{from}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-muted">끝색</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={to}
              onChange={(e) => onChange(from, e.target.value, direction)}
              className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
            <span className="text-xs text-muted">{to}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">방향</label>
        <div className="flex gap-1.5">
          {DIRECTIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => onChange(from, to, d.value)}
              className={`flex h-8 w-8 items-center justify-center rounded border text-sm transition-colors ${
                direction === d.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-muted hover:text-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
