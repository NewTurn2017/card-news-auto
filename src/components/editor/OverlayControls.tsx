"use client";

import { Trash2 } from "lucide-react";

interface Overlay {
  assetId: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
}

interface OverlayControlsProps {
  overlays: Overlay[];
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  onUpdate: (index: number, partial: Partial<Overlay>) => void;
  onRemove: (index: number) => void;
}

const sliderClass = "w-full h-1.5 accent-accent cursor-pointer";
const labelRowClass = "flex justify-between text-[11px] text-muted mb-1";

export default function OverlayControls({
  overlays,
  selectedIndex,
  onSelect,
  onUpdate,
  onRemove,
}: OverlayControlsProps) {
  if (overlays.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
        오버레이 ({overlays.length}/5)
      </label>
      {overlays.map((overlay, idx) => (
        <div
          key={idx}
          className={`flex flex-col gap-2 rounded-lg border p-2.5 transition-colors cursor-pointer ${
            selectedIndex === idx
              ? "border-accent bg-accent/5"
              : "border-border hover:border-muted"
          }`}
          onClick={() => onSelect?.(idx)}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-foreground">
              오버레이 #{idx + 1}
            </span>
            <button
              onClick={() => onRemove(idx)}
              className="rounded-md p-1 text-muted transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div>
            <div className={labelRowClass}>
              <span>X 위치</span>
              <span>{overlay.x}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={overlay.x}
              onChange={(e) => onUpdate(idx, { x: Number(e.target.value) })}
              className={sliderClass}
            />
          </div>
          <div>
            <div className={labelRowClass}>
              <span>Y 위치</span>
              <span>{overlay.y}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={overlay.y}
              onChange={(e) => onUpdate(idx, { y: Number(e.target.value) })}
              className={sliderClass}
            />
          </div>
          <div>
            <div className={labelRowClass}>
              <span>크기</span>
              <span>{overlay.width}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={overlay.width}
              onChange={(e) => onUpdate(idx, { width: Number(e.target.value) })}
              className={sliderClass}
            />
          </div>
          <div>
            <div className={labelRowClass}>
              <span>불투명도</span>
              <span>{overlay.opacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={overlay.opacity}
              onChange={(e) =>
                onUpdate(idx, { opacity: Number(e.target.value) })
              }
              className={sliderClass}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
