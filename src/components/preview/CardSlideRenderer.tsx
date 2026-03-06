'use client'

import { forwardRef, useEffect } from 'react'
import type { CardSlide } from '@/types'
import { getPresetById } from '@/data/presets'
import { getFontById } from '@/data/fonts'
import { sanitizeHtml } from '@/lib/sanitize'

interface CardSlideRendererProps {
  slide: CardSlide
  scale?: number
}

const CardSlideRenderer = forwardRef<HTMLDivElement, CardSlideRendererProps>(
  ({ slide, scale }, ref) => {
    const preset = getPresetById(slide.colorPreset)
    const font = getFontById(slide.fontFamily ?? 'pretendard')

    // Load only the font actually used by this slide
    useEffect(() => {
      if (!font.cdnUrl) return
      const id = `font-cdn-${font.id}`
      if (document.getElementById(id)) return
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = font.cdnUrl
      document.head.appendChild(link)
    }, [font])

    const hasCustomHtml = slide.htmlContent && slide.htmlContent.trim().length > 0

    // Build background style
    const bgStyle: React.CSSProperties = {
      color: slide.style?.textColor ?? preset.textColor,
      fontFamily: slide.style?.fontFamily ?? font.family,
    }

    // Determine background (style override > preset)
    const bgType = slide.style?.bgType ?? preset.bgType
    if (bgType === 'gradient') {
      const from = slide.style?.gradientFrom ?? preset.gradientFrom ?? '#667eea'
      const to = slide.style?.gradientTo ?? preset.gradientTo ?? '#764ba2'
      const dir = slide.style?.gradientDirection ?? preset.gradientDirection ?? '135deg'
      bgStyle.background = `linear-gradient(${dir}, ${from}, ${to})`
    } else {
      bgStyle.backgroundColor = slide.style?.bgColor ?? preset.bgColor ?? '#0f0f0f'
    }

    // Image styles (applied via overlay divs below, not on the container)
    const imageStyle: React.CSSProperties | undefined = slide.image
      ? {
          backgroundImage: `url(${slide.image.url})`,
          backgroundSize: slide.image.fit === 'fill' ? '100% 100%' : slide.image.fit,
          backgroundPosition: `${slide.image.position.x}% ${slide.image.position.y}%`,
          backgroundRepeat: 'no-repeat',
        }
      : undefined

    const containerStyle: React.CSSProperties = scale
      ? { transform: `scale(${scale})`, transformOrigin: 'top left' }
      : {}

    const accentColor = slide.style?.accentColor ?? preset.accentColor
    const subtextColor = preset.subtextColor ?? 'rgba(255,255,255,0.7)'
    const layoutId = slide.layoutId?.replace('layout-', '') ?? 'center'
    const isSplitLayout = layoutId === 'split'

    return (
      <div style={containerStyle}>
        <div
          ref={ref}
          className={`card-slide ${slide.layoutId ? `layout-${slide.layoutId.replace('layout-', '')}` : 'layout-center'}`}
          style={bgStyle}
        >
          {/* Image overlay */}
          {slide.image && imageStyle && (
            <>
              <div
                className='absolute inset-0'
                style={{
                  ...imageStyle,
                  opacity: slide.image.opacity / 100,
                }}
              />
              {/* Tint overlay for solid bg to control image visibility */}
              {bgType !== 'gradient' && (
                <div
                  className='absolute inset-0'
                  style={{
                    backgroundColor: slide.style?.bgColor ?? preset.bgColor ?? '#0f0f0f',
                    opacity: 1 - slide.image.opacity / 100,
                  }}
                />
              )}
            </>
          )}

          {hasCustomHtml ? (
            <div
              className='relative z-10 flex h-full w-full flex-col items-center justify-center'
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(slide.htmlContent),
              }}
            />
          ) : isSplitLayout ? (
            /* Split layout: elements are direct flex children for space-between */
            <>
              {slide.content.category ? (
                <p
                  className='relative z-10 slide-category'
                  data-field="category"
                  style={{
                    color: slide.style?.categoryColor ?? accentColor,
                    ...(slide.style?.categorySize
                      ? { fontSize: `${slide.style.categorySize}px` }
                      : {}),
                  }}
                >
                  {slide.content.category}
                </p>
              ) : <span className='relative z-10' />}
              <div className='relative z-10 flex flex-col gap-4'>
                {slide.content.title && (
                  <h2
                    className='slide-title'
                    data-field="title"
                    style={{
                      ...(slide.style?.titleColor ? { color: slide.style.titleColor } : {}),
                      ...(slide.style?.titleSize ? { fontSize: `${slide.style.titleSize}px` } : {}),
                      ...(slide.style?.titleLineHeight != null ? { lineHeight: slide.style.titleLineHeight } : {}),
                      ...(slide.style?.titleLetterSpacing != null ? { letterSpacing: `${slide.style.titleLetterSpacing}px` } : {}),
                    }}
                  >
                    {slide.content.title}
                  </h2>
                )}
                {slide.content.body && (
                  <p
                    className='slide-body'
                    data-field="body"
                    style={{
                      color: slide.style?.bodyColor ?? subtextColor,
                      ...(slide.style?.bodySize ? { fontSize: `${slide.style.bodySize}px` } : {}),
                      ...(slide.style?.bodyLineHeight != null ? { lineHeight: slide.style.bodyLineHeight } : {}),
                      ...(slide.style?.bodyLetterSpacing != null ? { letterSpacing: `${slide.style.bodyLetterSpacing}px` } : {}),
                    }}
                  >
                    {slide.content.body}
                  </p>
                )}
              </div>
              {slide.content.subtitle ? (
                <p
                  className='relative z-10 slide-subtitle'
                  data-field="subtitle"
                  style={{
                    color: slide.style?.subtitleColor ?? subtextColor,
                    ...(slide.style?.subtitleSize
                      ? { fontSize: `${slide.style.subtitleSize}px` }
                      : {}),
                    ...(slide.style?.subtitleLineHeight != null ? { lineHeight: slide.style.subtitleLineHeight } : {}),
                    ...(slide.style?.subtitleLetterSpacing != null ? { letterSpacing: `${slide.style.subtitleLetterSpacing}px` } : {}),
                  }}
                >
                  {slide.content.subtitle}
                </p>
              ) : <span className='relative z-10' />}
            </>
          ) : (
            <div className='relative z-10 flex flex-col gap-4'>
              {slide.content.category && (
                <p
                  className='slide-category'
                  data-field="category"
                  style={{
                    color: slide.style?.categoryColor ?? accentColor,
                    ...(slide.style?.categorySize
                      ? { fontSize: `${slide.style.categorySize}px` }
                      : {}),
                  }}
                >
                  {slide.content.category}
                </p>
              )}
              {slide.content.title && (
                <h2
                  className='slide-title'
                  data-field="title"
                  style={{
                    ...(slide.style?.titleColor ? { color: slide.style.titleColor } : {}),
                    ...(slide.style?.titleSize ? { fontSize: `${slide.style.titleSize}px` } : {}),
                    ...(slide.style?.titleLineHeight != null ? { lineHeight: slide.style.titleLineHeight } : {}),
                    ...(slide.style?.titleLetterSpacing != null ? { letterSpacing: `${slide.style.titleLetterSpacing}px` } : {}),
                  }}
                >
                  {slide.content.title}
                </h2>
              )}
              {slide.content.subtitle && (
                <p
                  className='slide-subtitle'
                  data-field="subtitle"
                  style={{
                    color: slide.style?.subtitleColor ?? subtextColor,
                    ...(slide.style?.subtitleSize
                      ? { fontSize: `${slide.style.subtitleSize}px` }
                      : {}),
                    ...(slide.style?.subtitleLineHeight != null ? { lineHeight: slide.style.subtitleLineHeight } : {}),
                    ...(slide.style?.subtitleLetterSpacing != null ? { letterSpacing: `${slide.style.subtitleLetterSpacing}px` } : {}),
                  }}
                >
                  {slide.content.subtitle}
                </p>
              )}
              {slide.content.body && (
                <p
                  className='slide-body'
                  data-field="body"
                  style={{
                    color: slide.style?.bodyColor ?? subtextColor,
                    ...(slide.style?.bodySize ? { fontSize: `${slide.style.bodySize}px` } : {}),
                    ...(slide.style?.bodyLineHeight != null ? { lineHeight: slide.style.bodyLineHeight } : {}),
                    ...(slide.style?.bodyLetterSpacing != null ? { letterSpacing: `${slide.style.bodyLetterSpacing}px` } : {}),
                  }}
                >
                  {slide.content.body}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

CardSlideRenderer.displayName = 'CardSlideRenderer'

export default CardSlideRenderer
