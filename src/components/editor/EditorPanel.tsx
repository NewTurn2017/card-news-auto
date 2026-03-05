"use client";

import { useState } from "react";
import { useCardNewsStore } from "@/store/card-news-store";
import SlideNavigation from "./SlideNavigation";
import ContentFields from "./ContentFields";
import ColorPresets from "./ColorPresets";
import LayoutSelector from "./LayoutSelector";
import ImageControls from "./ImageControls";
import SlideActions from "./SlideActions";
import type { SlideContent, SlideImage } from "@/types";

export default function EditorPanel() {
  const {
    project,
    currentSlideIndex,
    updateSlide,
    setLayout,
    setColorPreset,
    addSlide,
    removeSlide,
    goToSlide,
    nextSlide,
    prevSlide,
  } = useCardNewsStore();

  const [isImproving, setIsImproving] = useState(false);

  if (!project) return null;

  const slide = project.slides[currentSlideIndex];
  if (!slide) return null;

  const handleContentChange = (content: SlideContent) => {
    updateSlide(currentSlideIndex, { content });
  };

  const handleImageChange = (image: SlideImage | undefined) => {
    updateSlide(currentSlideIndex, { image });
  };

  const handleImprove = async () => {
    setIsImproving(true);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slide: {
            ...slide.content,
            type: slide.type,
            colorPreset: slide.colorPreset,
            layoutId: slide.layoutId,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.html) {
          updateSlide(currentSlideIndex, { htmlContent: data.html });
        }
      }
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      {/* Header label */}
      <div className="text-xs text-muted">
        커버 ·{" "}
        <span className="capitalize">{slide.type}</span>
      </div>

      {/* Slide Navigation */}
      <SlideNavigation
        current={currentSlideIndex}
        total={project.slides.length}
        onPrev={prevSlide}
        onNext={nextSlide}
        onAdd={() => addSlide(currentSlideIndex)}
        onFirst={() => goToSlide(0)}
        onLast={() => goToSlide(project.slides.length - 1)}
      />

      {/* Content Fields */}
      <ContentFields content={slide.content} onChange={handleContentChange} />

      {/* Color Presets */}
      <ColorPresets
        selected={slide.colorPreset}
        onChange={(preset) => setColorPreset(currentSlideIndex, preset)}
      />

      {/* Layout Selector */}
      <LayoutSelector
        selected={slide.layoutId}
        onChange={(layoutId) => setLayout(currentSlideIndex, layoutId)}
      />

      {/* Image Controls */}
      <ImageControls image={slide.image} onChange={handleImageChange} />

      {/* Slide Actions */}
      <SlideActions
        onImprove={handleImprove}
        onDelete={() => removeSlide(currentSlideIndex)}
        canDelete={project.slides.length > 1}
        isImproving={isImproving}
      />
    </div>
  );
}
