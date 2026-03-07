"use client";

import { useEffect, useCallback, useState } from "react";
import InlineToolbox, { type EditableField } from "./InlineToolbox";
import type { EditableTextField, SlideStyle, SlideContent, TextFieldEffects } from "@/types";

interface InlineEditLayerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  slideRef: HTMLDivElement | null;
  currentStyle: SlideStyle;
  currentContent: SlideContent;
  selectedField: EditableTextField | null;
  onStyleChange: (style: Partial<SlideStyle>) => void;
  onFontChange: (fontId: string) => void;
  onContentChange: (content: SlideContent) => void;
  onClose: () => void;
  textEffects?: {
    category?: TextFieldEffects;
    title?: TextFieldEffects;
    subtitle?: TextFieldEffects;
    body?: TextFieldEffects;
  };
  onTextEffectsChange: (field: EditableTextField, effects: Partial<TextFieldEffects>) => void;
  originalContent?: SlideContent;
  onResetField?: (field: EditableTextField) => void;
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
  selectedField,
  onStyleChange,
  onFontChange,
  onContentChange,
  onClose,
  textEffects,
  onTextEffectsChange,
  originalContent,
  onResetField,
}: InlineEditLayerProps) {
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [anchorTopViewport, setAnchorTopViewport] = useState(0);
  const [containerRight, setContainerRight] = useState(0);

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

  const updateHighlight = useCallback(() => {
    if (!selectedField || !slideRef) {
      setHighlightRect(null);
      return;
    }

    const element = slideRef.querySelector(`[data-field="${selectedField}"]`);
    if (!element) {
      setHighlightRect(null);
      return;
    }

    const rect = getRelativeRect(element);
    if (!rect) {
      setHighlightRect(null);
      return;
    }

    setHighlightRect(rect);

    const container = containerRef.current;
    if (container) {
      const containerBounds = container.getBoundingClientRect();
      setAnchorTopViewport(containerBounds.top + containerBounds.height / 2);
      setContainerRight(containerBounds.right);
    }
  }, [containerRef, getRelativeRect, selectedField, slideRef]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      updateHighlight();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [updateHighlight, currentContent, currentStyle]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setHighlightRect(null);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [slideRef]);

  return (
    <>
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

      {selectedField && containerRight > 0 && (
        <InlineToolbox
          field={selectedField as EditableField}
          anchorTop={anchorTopViewport}
          anchorLeft={containerRight + 12}
          style={currentStyle}
          content={currentContent}
          onStyleChange={onStyleChange}
          onFontChange={onFontChange}
          onContentChange={onContentChange}
          onClose={onClose}
          textEffects={textEffects}
          onTextEffectsChange={onTextEffectsChange}
          originalContent={originalContent}
          onResetField={onResetField}
        />
      )}
    </>
  );
}
