"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import type { CanvasItemId } from "@/lib/editorGeometry";

interface DraggableOverlayProps {
  itemId: CanvasItemId;
  url: string;
  name: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
  isSelected: boolean;
  isInteractive: boolean;
  onDragStart: (
    itemId: CanvasItemId,
    options: { clientX: number; clientY: number; additive: boolean }
  ) => void;
  onDragMove: (
    itemId: CanvasItemId,
    options: { clientX: number; clientY: number; bypassSnap: boolean }
  ) => void;
  onDragEnd: (itemId: CanvasItemId) => void;
  onResize: (width: number) => void;
}

const CORNER_POSITIONS: Record<string, string> = {
  "top-left": "-top-1.5 -left-1.5 cursor-nwse-resize",
  "top-right": "-top-1.5 -right-1.5 cursor-nesw-resize",
  "bottom-left": "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  "bottom-right": "-bottom-1.5 -right-1.5 cursor-nwse-resize",
};

export default function DraggableOverlay({
  itemId,
  url,
  name,
  x,
  y,
  width,
  opacity,
  isSelected,
  isInteractive,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResize,
}: DraggableOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);

  const getParentRect = useCallback(() => {
    return overlayRef.current?.parentElement?.getBoundingClientRect();
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isInteractive || isResizing.current) return;
      e.stopPropagation();
      e.preventDefault();

      isDragging.current = true;
      onDragStart(itemId, {
        clientX: e.clientX,
        clientY: e.clientY,
        additive: e.shiftKey || e.metaKey || e.ctrlKey,
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isInteractive, itemId, onDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      onDragMove(itemId, {
        clientX: e.clientX,
        clientY: e.clientY,
        bypassSnap: e.altKey,
      });
    },
    [itemId, onDragMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      onDragEnd(itemId);
    },
    [itemId, onDragEnd]
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
    [getParentRect, onResize, width]
  );

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
      data-canvas-item-id={itemId}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Image
        src={url}
        alt={name}
        width={1200}
        height={1200}
        unoptimized
        className="pointer-events-none h-auto w-full"
        draggable={false}
      />

      {isSelected && isInteractive && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded border-2 border-accent" />
          {Object.entries(CORNER_POSITIONS).map(([corner, className]) => (
            <div
              key={corner}
              className={`absolute h-3 w-3 rounded-full border-2 border-accent bg-white ${className}`}
              onPointerDown={(event) => handleResizeStart(event, corner)}
            />
          ))}
        </>
      )}
    </div>
  );
}
