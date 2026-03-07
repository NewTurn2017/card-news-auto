"use client";

import { useRef, useCallback } from "react";

interface DraggableTextFieldProps {
  field: string;
  children: React.ReactNode;
  offsetX: number;  // pixel offset at 1080-base resolution
  offsetY: number;  // pixel offset at 1350-base resolution
  scale?: number;   // current render scale (cardWidth / 1080)
  isInteractive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (offsetX: number, offsetY: number) => void;
  onDeselect: () => void;
  onDoubleClick?: (clientX: number, clientY: number) => void;
}

const DRAG_THRESHOLD = 5;

export default function DraggableTextField({
  field,
  children,
  offsetX,
  offsetY,
  scale = 1,
  isInteractive,
  isSelected,
  onSelect,
  onMove,
  onDeselect,
  onDoubleClick,
}: DraggableTextFieldProps) {
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  void onDeselect;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isInteractive) return;
      e.stopPropagation();
      e.preventDefault();

      isDragging.current = true;
      hasDragged.current = false;
      dragStart.current = { x: e.clientX, y: e.clientY, origX: offsetX, origY: offsetY };
      onSelect();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isInteractive, offsetX, offsetY, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      if (!hasDragged.current && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        hasDragged.current = true;
      }

      if (!hasDragged.current) return;

      // Convert screen pixels to base-resolution pixels
      const baseDx = dx / scale;
      const baseDy = dy / scale;

      const newX = Math.round(dragStart.current.origX + baseDx);
      const newY = Math.round(dragStart.current.origY + baseDy);
      onMove(newX, newY);
    },
    [scale, onMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      hasDragged.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    },
    []
  );

  const hasOffset = offsetX !== 0 || offsetY !== 0;

  return (
    <div
      className={`relative ${isInteractive ? "cursor-move" : ""}`}
      style={{ width: "fit-content", touchAction: isInteractive ? "none" : "auto", ...(hasOffset ? { transform: `translate(${offsetX}px, ${offsetY}px)` } : {}) }}
      data-field={field}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        if (isInteractive && onDoubleClick) {
          onDoubleClick(e.clientX, e.clientY);
        }
      }}
    >
      {children}

      {isSelected && isInteractive && (
        <div
          className="pointer-events-none absolute rounded border-2 border-accent"
          style={{ inset: -4, boxShadow: "0 0 12px rgba(74, 227, 192, 0.2)" }}
        />
      )}
    </div>
  );
}
