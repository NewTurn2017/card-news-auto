"use client";

import { useRef, useCallback } from "react";

interface DraggableOverlayProps {
  url: string;
  name: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
  isSelected: boolean;
  isInteractive: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number) => void;
  onDeselect: () => void;
}

const CORNER_POSITIONS: Record<string, string> = {
  "top-left": "-top-1.5 -left-1.5 cursor-nwse-resize",
  "top-right": "-top-1.5 -right-1.5 cursor-nesw-resize",
  "bottom-left": "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  "bottom-right": "-bottom-1.5 -right-1.5 cursor-nwse-resize",
};

export default function DraggableOverlay({
  url,
  name,
  x,
  y,
  width,
  opacity,
  isSelected,
  isInteractive,
  onSelect,
  onMove,
  onResize,
  onDeselect,
}: DraggableOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  const getParentRect = useCallback(() => {
    return overlayRef.current?.parentElement?.getBoundingClientRect();
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isInteractive || isResizing.current) return;
      e.stopPropagation();
      e.preventDefault();

      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, origX: x, origY: y };
      onSelect();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isInteractive, x, y, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const parentRect = getParentRect();
      if (!parentRect) return;

      const dx = ((e.clientX - dragStart.current.x) / parentRect.width) * 100;
      const dy = ((e.clientY - dragStart.current.y) / parentRect.height) * 100;

      const newX = Math.max(0, Math.min(100, dragStart.current.origX + dx));
      const newY = Math.max(0, Math.min(100, dragStart.current.origY + dy));
      onMove(Math.round(newX), Math.round(newY));
    },
    [getParentRect, onMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    },
    []
  );

  const handleResizeStart = useCallback(
    (e: React.PointerEvent, corner: string) => {
      e.stopPropagation();
      e.preventDefault();
      isResizing.current = true;

      const parentRect = getParentRect();
      if (!parentRect) return;

      const startX = e.clientX;
      const startWidth = width;
      const isLeft = corner.includes("left");

      const onPointerMove = (ev: PointerEvent) => {
        const sign = isLeft ? -1 : 1;
        const dx = ((ev.clientX - startX) / parentRect.width) * 100 * sign;
        const newWidth = Math.max(5, Math.min(100, startWidth + dx));
        onResize(Math.round(newWidth));
      };

      const onPointerUp = () => {
        isResizing.current = false;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [getParentRect, width, onResize]
  );

  // Click outside deselect: handled by parent
  void onDeselect;

  return (
    <div
      ref={overlayRef}
      className={`absolute z-20 ${isInteractive ? "cursor-move" : "pointer-events-none"}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        opacity: opacity / 100,
        transform: "translate(-50%, -50%)",
        touchAction: isInteractive ? "none" : "auto",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={url}
        alt={name}
        className="pointer-events-none h-auto w-full"
        draggable={false}
      />

      {/* Selection border + resize handles */}
      {isSelected && isInteractive && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded border-2 border-accent" />
          {Object.entries(CORNER_POSITIONS).map(([corner, className]) => (
            <div
              key={corner}
              className={`absolute h-3 w-3 rounded-full border-2 border-accent bg-white ${className}`}
              onPointerDown={(e) => handleResizeStart(e, corner)}
            />
          ))}
        </>
      )}
    </div>
  );
}
