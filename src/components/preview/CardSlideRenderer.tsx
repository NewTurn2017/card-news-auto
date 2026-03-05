"use client";

import { forwardRef } from "react";
import type { CardSlide } from "@/types";
import { colorPresets } from "@/data/presets";
import { sanitizeHtml } from "@/lib/sanitize";

interface CardSlideRendererProps {
  slide: CardSlide;
  scale?: number;
}

const CardSlideRenderer = forwardRef<HTMLDivElement, CardSlideRendererProps>(
  ({ slide, scale }, ref) => {
    const preset = colorPresets.find((p) => p.id === slide.colorPreset) ?? colorPresets[0];

    const hasCustomHtml = slide.htmlContent && slide.htmlContent.trim().length > 0;

    const bgStyle: React.CSSProperties = {
      backgroundColor: preset.bgColor,
      color: preset.textColor,
    };

    if (slide.image) {
      bgStyle.backgroundImage = `url(${slide.image.url})`;
      bgStyle.backgroundSize =
        slide.image.fit === "fill" ? "100% 100%" : slide.image.fit;
      bgStyle.backgroundPosition = `${slide.image.position.x}% ${slide.image.position.y}%`;
    }

    const containerStyle: React.CSSProperties = scale
      ? { transform: `scale(${scale})`, transformOrigin: "top left" }
      : {};

    return (
      <div style={containerStyle}>
        <div
          ref={ref}
          className={`card-slide ${slide.layoutId ? `layout-${slide.layoutId.replace("layout-", "")}` : "layout-center-title"}`}
          style={bgStyle}
        >
          {/* Image overlay */}
          {slide.image && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: preset.bgColor,
                opacity: 1 - slide.image.opacity / 100,
              }}
            />
          )}

          {hasCustomHtml ? (
            <div
              className="relative z-10 h-full w-full"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(slide.htmlContent),
              }}
            />
          ) : (
            <div className="relative z-10 flex flex-col gap-4">
              {slide.content.category && (
                <p
                  className="slide-category"
                  style={{ color: preset.accentColor }}
                >
                  {slide.content.category}
                </p>
              )}
              {slide.content.title && (
                <h2 className="slide-title">{slide.content.title}</h2>
              )}
              {slide.content.subtitle && (
                <p
                  className="slide-subtitle"
                  style={{ color: preset.subtextColor }}
                >
                  {slide.content.subtitle}
                </p>
              )}
              {slide.content.body && (
                <p className="slide-body" style={{ color: preset.subtextColor }}>
                  {slide.content.body}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

CardSlideRenderer.displayName = "CardSlideRenderer";

export default CardSlideRenderer;
