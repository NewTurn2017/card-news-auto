"use client";

import {
  BASE_SLIDE_HEIGHT,
  BASE_SLIDE_WIDTH,
  type BaseRect,
  type LayoutPaddingGuides,
} from "@/lib/editorGeometry";
import type { SnapGuide } from "@/lib/editorSnap";

interface CanvasSelectionLayerProps {
  selectedRects: BaseRect[];
  selectionBounds: BaseRect | null;
  marqueeRect: BaseRect | null;
  activeGuides: SnapGuide[];
  showGuides: boolean;
  padding: LayoutPaddingGuides;
}

function renderRectBox(rect: BaseRect, className: string, dashed = false) {
  return (
    <div
      className={`absolute rounded border ${className} ${dashed ? "border-dashed" : ""}`}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}

function renderCenterCrosshair() {
  const crosshairSize = 84;
  const crosshairHalf = crosshairSize / 2;
  const centerX = BASE_SLIDE_WIDTH / 2;
  const centerY = BASE_SLIDE_HEIGHT / 2;

  return (
    <>
      <div
        className="absolute border-l border-dashed border-white/20"
        style={{ left: centerX, top: centerY - crosshairHalf, height: crosshairSize }}
      />
      <div
        className="absolute border-t border-dashed border-white/20"
        style={{ left: centerX - crosshairHalf, top: centerY, width: crosshairSize }}
      />
    </>
  );
}

export default function CanvasSelectionLayer({
  selectedRects,
  selectionBounds,
  marqueeRect,
  activeGuides,
  showGuides,
  padding,
}: CanvasSelectionLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {showGuides && (
        <>
          {renderCenterCrosshair()}
          <div
            className="absolute rounded border border-dashed border-white/15"
            style={{
              left: padding.left,
              top: padding.top,
              width: BASE_SLIDE_WIDTH - padding.left - padding.right,
              height: BASE_SLIDE_HEIGHT - padding.top - padding.bottom,
            }}
          />
        </>
      )}

      {selectedRects.map((rect, index) => (
        <div key={`${rect.left}-${rect.top}-${index}`}>
          {renderRectBox(rect, "border-accent/60 bg-accent/5")}
        </div>
      ))}

      {selectionBounds && selectedRects.length > 1 && (
        <>
          {renderRectBox(selectionBounds, "border-accent shadow-[0_0_0_1px_rgba(217,119,87,0.15)]", true)}
          <div
            className="absolute h-2.5 w-2.5 rounded-full border border-accent bg-surface"
            style={{
              left: selectionBounds.right - 5,
              top: selectionBounds.bottom - 5,
            }}
          />
        </>
      )}

      {marqueeRect && (
        <div
          className="absolute rounded border border-accent/80 bg-accent/10"
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}

      {activeGuides.map((guide, index) =>
        guide.orientation === "vertical" ? (
          <div
            key={`${guide.orientation}-${guide.position}-${index}`}
            className="absolute border-l border-accent/90"
            style={{
              left: guide.position,
              top: guide.start,
              height: Math.max(guide.end - guide.start, 0),
            }}
          />
        ) : (
          <div
            key={`${guide.orientation}-${guide.position}-${index}`}
            className="absolute border-t border-accent/90"
            style={{
              left: guide.start,
              top: guide.position,
              width: Math.max(guide.end - guide.start, 0),
            }}
          />
        )
      )}
    </div>
  );
}
