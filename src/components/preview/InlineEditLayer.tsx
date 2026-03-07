"use client";

import { useState, useEffect, useCallback } from "react";
import InlineToolbox, { type EditableField } from "./InlineToolbox";
import type { SlideStyle, SlideContent, TextFieldEffects } from "@/types";

export interface SlideClickInfo {
  clientX: number;
  clientY: number;
  timestamp: number;
}

interface InlineEditLayerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  slideRef: HTMLDivElement | null;
  currentStyle: SlideStyle;
  currentContent: SlideContent;
  onStyleChange: (style: Partial<SlideStyle>) => void;
  onFontChange: (fontId: string) => void;
  onContentChange: (content: SlideContent) => void;
  clickInfo: SlideClickInfo | null;
  textEffects?: {
    category?: TextFieldEffects;
    title?: TextFieldEffects;
    subtitle?: TextFieldEffects;
    body?: TextFieldEffects;
  };
  onTextEffectsChange: (field: string, effects: Partial<TextFieldEffects>) => void;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function InlineEditLayer({
  containerRef,
  slideRef,
  currentStyle,
  currentContent,
  onStyleChange,
  onFontChange,
  onContentChange,
  clickInfo,
  textEffects,
  onTextEffectsChange,
}: InlineEditLayerProps) {
  const [selectedField, setSelectedField] = useState<EditableField | null>(null);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  // anchorTop in viewport coordinates for fixed positioning
  const [anchorTopViewport, setAnchorTopViewport] = useState(0);

  // Calculate element position relative to container (for highlight)
  const getRelativeRect = useCallback(
    (element: Element): HighlightRect | null => {
      const container = containerRef.current;
      if (!container) return null;

      const containerBounds = container.getBoundingClientRect();
      const elBounds = element.getBoundingClientRect();

      return {
        top: elBounds.top - containerBounds.top,
        left: elBounds.left - containerBounds.left,
        width: elBounds.width,
        height: elBounds.height,
      };
    },
    [containerRef]
  );

  // Update highlight when selected field changes or content/style updates
  const updateHighlight = useCallback(() => {
    if (!selectedField || !slideRef) {
      setHighlightRect(null);
      return;
    }

    const element = slideRef.querySelector(`[data-field="${selectedField}"]`);
    if (!element) {
      setSelectedField(null);
      setHighlightRect(null);
      return;
    }

    const rect = getRelativeRect(element);
    const elBounds = element.getBoundingClientRect();
    if (rect) {
      setHighlightRect(rect);
      // Use viewport coordinates for fixed toolbox positioning
      setAnchorTopViewport(elBounds.top);
    }
  }, [selectedField, slideRef, getRelativeRect]);

  useEffect(() => {
    updateHighlight();
  }, [updateHighlight, currentContent, currentStyle]);

  // Close on slide change
  useEffect(() => {
    setSelectedField(null);
  }, [slideRef]);

  // React to click events from SwipeCarousel
  useEffect(() => {
    if (!clickInfo || !slideRef) return;
    const realTarget = document.elementFromPoint(
      clickInfo.clientX,
      clickInfo.clientY
    ) as HTMLElement | null;
    if (!realTarget) {
      setSelectedField(null);
      return;
    }
    const fieldEl = realTarget.closest("[data-field]");
    if (fieldEl) {
      setSelectedField(fieldEl.getAttribute("data-field") as EditableField);
    } else {
      setSelectedField(null);
    }
  }, [clickInfo, slideRef]);

  const handleClose = useCallback(() => {
    setSelectedField(null);
  }, []);

  // Calculate toolbox left position: right edge of phone mockup container
  const container = containerRef.current;
  const containerRight = container
    ? container.getBoundingClientRect().right
    : 0;

  return (
    <>
      {/* Highlight overlay */}
      {highlightRect && selectedField && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            outline: "2px solid var(--accent, #4ae3c0)",
            outlineOffset: "0px",
            borderRadius: 4,
            boxShadow: "0 0 12px rgba(74, 227, 192, 0.2)",
          }}
        />
      )}

      {/* Toolbox — fixed positioned to the right of the phone mockup */}
      {selectedField && containerRight > 0 && (
        <InlineToolbox
          field={selectedField}
          anchorTop={anchorTopViewport}
          anchorLeft={containerRight + 12}
          style={currentStyle}
          content={currentContent}
          onStyleChange={onStyleChange}
          onFontChange={onFontChange}
          onContentChange={onContentChange}
          onClose={handleClose}
          textEffects={textEffects}
          onTextEffectsChange={onTextEffectsChange}
        />
      )}
    </>
  );
}
