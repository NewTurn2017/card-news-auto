'use client'

import { forwardRef, useEffect, useRef, useCallback } from 'react'
import type { CardSlide, EditableTextField, TextFieldEffects } from '@/types'
import { getPresetById } from '@/data/presets'
import { getFontById } from '@/data/fonts'
import { getLayoutTextAlign } from '@/data/layouts'
import { sanitizeHtml } from '@/lib/sanitize'
import type {
  BaseRect,
  CanvasItemId,
  LayoutPaddingGuides,
} from '@/lib/editorGeometry'
import { getOverlayItemId, getTextItemId } from '@/lib/editorGeometry'
import type { SnapGuide } from '@/lib/editorSnap'
import DraggableOverlay from './DraggableOverlay'
import DraggableTextField from './DraggableTextField'
import CanvasSelectionLayer from './CanvasSelectionLayer'

function buildTextEffectStyles(effects?: TextFieldEffects): React.CSSProperties {
  if (!effects) return {};
  const styles: React.CSSProperties = {};

  if (effects.fontWeight) styles.fontWeight = effects.fontWeight;
  if (effects.italic) styles.fontStyle = 'italic';

  const decorations: string[] = [];
  if (effects.underline) decorations.push('underline');
  if (effects.strikethrough) decorations.push('line-through');
  if (decorations.length > 0) styles.textDecoration = decorations.join(' ');

  if (effects.uppercase) styles.textTransform = 'uppercase';
  if (effects.opacity != null && effects.opacity < 100) styles.opacity = effects.opacity / 100;

  if (effects.shadowColor && (effects.shadowBlur || effects.shadowX || effects.shadowY)) {
    styles.textShadow = `${effects.shadowX ?? 0}px ${effects.shadowY ?? 0}px ${effects.shadowBlur ?? 0}px ${effects.shadowColor}`;
  }

  if (effects.bgColor) {
    styles.backgroundColor = effects.bgColor;
    styles.padding = `${effects.bgPadding ?? 4}px`;
    styles.borderRadius = `${effects.bgRadius ?? 4}px`;
    (styles as Record<string, unknown>).boxDecorationBreak = 'clone';
    (styles as Record<string, unknown>).WebkitBoxDecorationBreak = 'clone';
    styles.display = 'inline';
  }

  if (effects.strokeColor && effects.strokeWidth) {
    (styles as Record<string, unknown>).WebkitTextStroke = `${effects.strokeWidth}px ${effects.strokeColor}`;
    styles.paintOrder = 'stroke fill';
  }

  return styles;
}

interface CardSlideRendererProps {
  slide: CardSlide
  scale?: number
  resolvedOverlayUrls?: Record<string, { url: string; name: string }>
  selectedOverlayIndex?: number
  selectedTextField?: EditableTextField
  multiSelectedRects?: BaseRect[]
  selectionBounds?: BaseRect | null
  marqueeRect?: BaseRect | null
  snapGuides?: SnapGuide[]
  showGuideOverlay?: boolean
  guidePadding?: LayoutPaddingGuides
  isInteractive?: boolean
  allowCanvasSelection?: boolean
  onCanvasDragStart?: (options: {
    clientX: number
    clientY: number
    additive: boolean
  }) => void
  onCanvasDragMove?: (options: { clientX: number; clientY: number }) => void
  onCanvasDragEnd?: (options: { clientX: number; clientY: number }) => void
  onOverlayDragStart?: (
    itemId: CanvasItemId,
    options: { clientX: number; clientY: number; additive: boolean }
  ) => void
  onOverlayDragMove?: (
    itemId: CanvasItemId,
    options: { clientX: number; clientY: number; bypassSnap: boolean }
  ) => void
  onOverlayDragEnd?: (itemId: CanvasItemId) => void
  onOverlayResize?: (index: number, width: number) => void
  onTextFieldDragStart?: (
    field: EditableTextField,
    options: { clientX: number; clientY: number; additive: boolean }
  ) => void
  onTextFieldDragMove?: (
    field: EditableTextField,
    options: { clientX: number; clientY: number; bypassSnap: boolean }
  ) => void
  onTextFieldDragEnd?: (field: EditableTextField) => void
  onTextFieldDoubleClick?: (field: EditableTextField) => void
}

const CardSlideRenderer = forwardRef<HTMLDivElement, CardSlideRendererProps>(
  ({
    slide,
    scale,
    resolvedOverlayUrls,
    selectedOverlayIndex,
    selectedTextField,
    multiSelectedRects = [],
    selectionBounds = null,
    marqueeRect = null,
    snapGuides = [],
    showGuideOverlay = false,
    guidePadding,
    isInteractive,
    allowCanvasSelection,
    onCanvasDragStart,
    onCanvasDragMove,
    onCanvasDragEnd,
    onOverlayDragStart,
    onOverlayDragMove,
    onOverlayDragEnd,
    onOverlayResize,
    onTextFieldDragStart,
    onTextFieldDragMove,
    onTextFieldDragEnd,
    onTextFieldDoubleClick,
  }, ref) => {
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
          backgroundSize: slide.image.fit === 'fill'
            ? '100% 100%'
            : slide.image.fit === 'free'
              ? `${slide.image.size}%`
              : slide.image.fit,
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
    const textEffects = slide.style?.textEffects
    const tp = slide.style?.textPositions
    const defaultTextAlign = getLayoutTextAlign(layoutId)
    const resolveTextAlign = (field: EditableTextField): React.CSSProperties['textAlign'] =>
      slide.style?.textAlignments?.[field] ?? defaultTextAlign

    // Helper to build a text style for category
    const categoryStyle: React.CSSProperties = {
      color: slide.style?.categoryColor ?? accentColor,
      ...(slide.style?.categorySize ? { fontSize: `${slide.style.categorySize}px` } : {}),
      textAlign: resolveTextAlign('category'),
      ...buildTextEffectStyles(textEffects?.category),
    }
    const titleStyle: React.CSSProperties = {
      ...(slide.style?.titleColor ? { color: slide.style.titleColor } : {}),
      ...(slide.style?.titleSize ? { fontSize: `${slide.style.titleSize}px` } : {}),
      ...(slide.style?.titleLineHeight != null ? { lineHeight: slide.style.titleLineHeight } : {}),
      ...(slide.style?.titleLetterSpacing != null ? { letterSpacing: `${slide.style.titleLetterSpacing}px` } : {}),
      textAlign: resolveTextAlign('title'),
      ...buildTextEffectStyles(textEffects?.title),
    }
    const subtitleStyle: React.CSSProperties = {
      color: slide.style?.subtitleColor ?? subtextColor,
      ...(slide.style?.subtitleSize ? { fontSize: `${slide.style.subtitleSize}px` } : {}),
      ...(slide.style?.subtitleLineHeight != null ? { lineHeight: slide.style.subtitleLineHeight } : {}),
      ...(slide.style?.subtitleLetterSpacing != null ? { letterSpacing: `${slide.style.subtitleLetterSpacing}px` } : {}),
      textAlign: resolveTextAlign('subtitle'),
      ...buildTextEffectStyles(textEffects?.subtitle),
    }
    const bodyStyle: React.CSSProperties = {
      color: slide.style?.bodyColor ?? subtextColor,
      ...(slide.style?.bodySize ? { fontSize: `${slide.style.bodySize}px` } : {}),
      ...(slide.style?.bodyLineHeight != null ? { lineHeight: slide.style.bodyLineHeight } : {}),
      ...(slide.style?.bodyLetterSpacing != null ? { letterSpacing: `${slide.style.bodyLetterSpacing}px` } : {}),
      textAlign: resolveTextAlign('body'),
      ...buildTextEffectStyles(textEffects?.body),
    }

    const isCanvasDragging = useRef(false)

    const handleCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
      if (!isInteractive || !allowCanvasSelection) return
      const target = event.target as HTMLElement
      if (target.closest('[data-canvas-item-id]')) return

      isCanvasDragging.current = true
      event.stopPropagation()
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      onCanvasDragStart?.({
        clientX: event.clientX,
        clientY: event.clientY,
        additive: event.shiftKey || event.metaKey || event.ctrlKey,
      })
    }, [allowCanvasSelection, isInteractive, onCanvasDragStart])

    const handleCanvasPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
      if (!isCanvasDragging.current) return
      onCanvasDragMove?.({
        clientX: event.clientX,
        clientY: event.clientY,
      })
    }, [onCanvasDragMove])

    const handleCanvasPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
      if (!isCanvasDragging.current) return
      isCanvasDragging.current = false
      event.currentTarget.releasePointerCapture(event.pointerId)
      onCanvasDragEnd?.({
        clientX: event.clientX,
        clientY: event.clientY,
      })
    }, [onCanvasDragEnd])

    return (
      <div style={containerStyle}>
        <div
          ref={ref}
          className={`card-slide ${slide.layoutId ? `layout-${slide.layoutId.replace('layout-', '')}` : 'layout-center'}`}
          style={bgStyle}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
        >
          {/* Image overlay — explicit z-[1] keeps these below text (z-10) */}
          {slide.image && imageStyle && (
            <>
              <div
                className='absolute inset-0 z-[1]'
                style={{
                  ...imageStyle,
                  opacity: slide.image.opacity / 100,
                }}
              />
              {/* Tint overlay for solid bg to control image visibility */}
              {bgType !== 'gradient' && (
                <div
                  className='absolute inset-0 z-[1]'
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
                <DraggableTextField
                  field="category"
                  itemId={getTextItemId('category')}
                  offsetX={tp?.category?.x ?? 0} offsetY={tp?.category?.y ?? 0}
                  contentAlign={resolveTextAlign('category')}
                  isInteractive={isInteractive ?? false}
                  isSelected={selectedTextField === 'category'}
                  onDragStart={(field, options) => onTextFieldDragStart?.(field, options)}
                  onDragMove={(field, options) => onTextFieldDragMove?.(field, options)}
                  onDragEnd={(field) => onTextFieldDragEnd?.(field)}
                  onDoubleClick={(field) => onTextFieldDoubleClick?.(field)}
                >
                  <p className='relative z-10 slide-category' style={categoryStyle}>
                    {slide.content.category}
                  </p>
                </DraggableTextField>
              ) : <span className='relative z-10' />}
              <div className='relative z-10 flex flex-col gap-4 [align-items:inherit]'>
                {slide.content.title && (
                  <DraggableTextField
                    field="title"
                    itemId={getTextItemId('title')}
                    offsetX={tp?.title?.x ?? 0} offsetY={tp?.title?.y ?? 0}
                    contentAlign={resolveTextAlign('title')}
                    isInteractive={isInteractive ?? false}
                    isSelected={selectedTextField === 'title'}
                    onDragStart={(field, options) => onTextFieldDragStart?.(field, options)}
                    onDragMove={(field, options) => onTextFieldDragMove?.(field, options)}
                    onDragEnd={(field) => onTextFieldDragEnd?.(field)}
                    onDoubleClick={(field) => onTextFieldDoubleClick?.(field)}
                  >
                    <h2 className='slide-title' style={titleStyle}>
                      {slide.content.title}
                    </h2>
                  </DraggableTextField>
                )}
                {slide.content.body && (
                  <DraggableTextField
                    field="body"
                    itemId={getTextItemId('body')}
                    offsetX={tp?.body?.x ?? 0} offsetY={tp?.body?.y ?? 0}
                    contentAlign={resolveTextAlign('body')}
                    isInteractive={isInteractive ?? false}
                    isSelected={selectedTextField === 'body'}
                    onDragStart={(field, options) => onTextFieldDragStart?.(field, options)}
                    onDragMove={(field, options) => onTextFieldDragMove?.(field, options)}
                    onDragEnd={(field) => onTextFieldDragEnd?.(field)}
                    onDoubleClick={(field) => onTextFieldDoubleClick?.(field)}
                  >
                    <p className='slide-body' style={bodyStyle}>
                      {slide.content.body}
                    </p>
                  </DraggableTextField>
                )}
              </div>
              {slide.content.subtitle ? (
                <DraggableTextField
                  field="subtitle"
                  itemId={getTextItemId('subtitle')}
                  offsetX={tp?.subtitle?.x ?? 0} offsetY={tp?.subtitle?.y ?? 0}
                  contentAlign={resolveTextAlign('subtitle')}
                  isInteractive={isInteractive ?? false}
                  isSelected={selectedTextField === 'subtitle'}
                  onDragStart={(field, options) => onTextFieldDragStart?.(field, options)}
                  onDragMove={(field, options) => onTextFieldDragMove?.(field, options)}
                  onDragEnd={(field) => onTextFieldDragEnd?.(field)}
                  onDoubleClick={(field) => onTextFieldDoubleClick?.(field)}
                >
                  <p className='relative z-10 slide-subtitle' style={subtitleStyle}>
                    {slide.content.subtitle}
                  </p>
                </DraggableTextField>
              ) : <span className='relative z-10' />}
            </>
          ) : (
            <div className='relative z-10 flex flex-col gap-4 [align-items:inherit]'>
              {slide.content.category && (
                <DraggableTextField
                  field="category"
                  itemId={getTextItemId('category')}
                  offsetX={tp?.category?.x ?? 0} offsetY={tp?.category?.y ?? 0}
                  contentAlign={resolveTextAlign('category')}
                  isInteractive={isInteractive ?? false}
                  isSelected={selectedTextField === 'category'}
                  onDragStart={(field, options) => onTextFieldDragStart?.(field, options)}
                  onDragMove={(field, options) => onTextFieldDragMove?.(field, options)}
                  onDragEnd={(field) => onTextFieldDragEnd?.(field)}
                  onDoubleClick={(field) => onTextFieldDoubleClick?.(field)}
                >
                  <p className='slide-category' style={categoryStyle}>
                    {slide.content.category}
                  </p>
                </DraggableTextField>
              )}
              {slide.content.title && (
                <DraggableTextField
                  field="title"
                  itemId={getTextItemId('title')}
                  offsetX={tp?.title?.x ?? 0} offsetY={tp?.title?.y ?? 0}
                  contentAlign={resolveTextAlign('title')}
                  isInteractive={isInteractive ?? false}
                  isSelected={selectedTextField === 'title'}
                  onDragStart={(field, options) => onTextFieldDragStart?.(field, options)}
                  onDragMove={(field, options) => onTextFieldDragMove?.(field, options)}
                  onDragEnd={(field) => onTextFieldDragEnd?.(field)}
                  onDoubleClick={(field) => onTextFieldDoubleClick?.(field)}
                >
                  <h2 className='slide-title' style={titleStyle}>
                    {slide.content.title}
                  </h2>
                </DraggableTextField>
              )}
              {slide.content.subtitle && (
                <DraggableTextField
                  field="subtitle"
                  itemId={getTextItemId('subtitle')}
                  offsetX={tp?.subtitle?.x ?? 0} offsetY={tp?.subtitle?.y ?? 0}
                  contentAlign={resolveTextAlign('subtitle')}
                  isInteractive={isInteractive ?? false}
                  isSelected={selectedTextField === 'subtitle'}
                  onDragStart={(field, options) => onTextFieldDragStart?.(field, options)}
                  onDragMove={(field, options) => onTextFieldDragMove?.(field, options)}
                  onDragEnd={(field) => onTextFieldDragEnd?.(field)}
                  onDoubleClick={(field) => onTextFieldDoubleClick?.(field)}
                >
                  <p className='slide-subtitle' style={subtitleStyle}>
                    {slide.content.subtitle}
                  </p>
                </DraggableTextField>
              )}
              {slide.content.body && (
                <DraggableTextField
                  field="body"
                  itemId={getTextItemId('body')}
                  offsetX={tp?.body?.x ?? 0} offsetY={tp?.body?.y ?? 0}
                  contentAlign={resolveTextAlign('body')}
                  isInteractive={isInteractive ?? false}
                  isSelected={selectedTextField === 'body'}
                  onDragStart={(field, options) => onTextFieldDragStart?.(field, options)}
                  onDragMove={(field, options) => onTextFieldDragMove?.(field, options)}
                  onDragEnd={(field) => onTextFieldDragEnd?.(field)}
                  onDoubleClick={(field) => onTextFieldDoubleClick?.(field)}
                >
                  <p className='slide-body' style={bodyStyle}>
                    {slide.content.body}
                  </p>
                </DraggableTextField>
              )}
            </div>
          )}

          {/* Overlays */}
          {slide.overlays?.map((overlay, idx) => {
            const resolved = resolvedOverlayUrls?.[overlay.assetId];
            if (!resolved) {
              // Fallback: render static img without drag (e.g. export mode without resolved URLs)
              return null;
            }
            return (
              <DraggableOverlay
                itemId={getOverlayItemId(idx)}
                key={`${overlay.assetId}-${idx}`}
                url={resolved.url}
                name={resolved.name}
                x={overlay.x}
                y={overlay.y}
                width={overlay.width}
                opacity={overlay.opacity}
                isSelected={selectedOverlayIndex === idx}
                isInteractive={isInteractive ?? false}
                onDragStart={(itemId, options) => onOverlayDragStart?.(itemId, options)}
                onDragMove={(itemId, options) => onOverlayDragMove?.(itemId, options)}
                onDragEnd={(itemId) => onOverlayDragEnd?.(itemId)}
                onResize={(w) => onOverlayResize?.(idx, w)}
              />
            );
          })}
          <CanvasSelectionLayer
            selectedRects={multiSelectedRects}
            selectionBounds={selectionBounds}
            marqueeRect={marqueeRect}
            activeGuides={snapGuides}
            showGuides={showGuideOverlay}
            padding={guidePadding ?? { top: 60, right: 60, bottom: 60, left: 60 }}
          />
        </div>
      </div>
    )
  }
)

CardSlideRenderer.displayName = 'CardSlideRenderer'

export default CardSlideRenderer
