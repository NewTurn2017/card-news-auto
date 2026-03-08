"use client";

import { useRef, useCallback } from "react";
import type { CanvasItemId } from "@/lib/editorGeometry";
import type { EditableTextField } from "@/types";

interface DraggableTextFieldProps {
  field: EditableTextField;
  itemId: CanvasItemId;
  children: React.ReactNode;
  offsetX: number;
  offsetY: number;
  widthMode?: "fit-content" | "full";
  contentAlign?: React.CSSProperties["textAlign"];
  isInteractive: boolean;
  isSelected: boolean;
  onDragStart: (
    field: EditableTextField,
    options: { clientX: number; clientY: number; additive: boolean }
  ) => void;
  onDragMove: (
    field: EditableTextField,
    options: { clientX: number; clientY: number; bypassSnap: boolean }
  ) => void;
  onDragEnd: (field: EditableTextField) => void;
  onDoubleClick?: (field: EditableTextField) => void;
}

const DRAG_THRESHOLD = 5;

export default function DraggableTextField({
  field,
  itemId,
  children,
  offsetX,
  offsetY,
  widthMode = "fit-content",
  contentAlign,
  isInteractive,
  isSelected,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDoubleClick,
}: DraggableTextFieldProps) {
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isInteractive) return;
      e.stopPropagation();
      e.preventDefault();

      isDragging.current = true;
      hasDragged.current = false;
      dragStart.current = { x: e.clientX, y: e.clientY };
      onDragStart(field, {
        clientX: e.clientX,
        clientY: e.clientY,
        additive: e.shiftKey || e.metaKey || e.ctrlKey,
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [field, isInteractive, onDragStart]
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

      onDragMove(field, {
        clientX: e.clientX,
        clientY: e.clientY,
        bypassSnap: e.altKey,
      });
    },
    [field, onDragMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      hasDragged.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      onDragEnd(field);
    },
    [field, onDragEnd]
  );

  const hasOffset = offsetX !== 0 || offsetY !== 0;

  return (
    <div
      className={`relative z-20 ${isInteractive ? "cursor-move" : ""}`}
      style={{
        width: widthMode === "full" ? "100%" : "fit-content",
        maxWidth: "100%",
        textAlign: contentAlign,
        touchAction: isInteractive ? "none" : "auto",
        ...(hasOffset ? { transform: `translate(${offsetX}px, ${offsetY}px)` } : {}),
      }}
      data-field={field}
      data-canvas-item-id={itemId}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (isInteractive && onDoubleClick) {
          onDoubleClick(field);
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
