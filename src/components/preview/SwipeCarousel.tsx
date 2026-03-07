"use client";

import { useRef, useEffect, useCallback } from "react";
import CardSlideRenderer from "./CardSlideRenderer";
import type { CardSlide } from "@/types";

interface SwipeCarouselProps {
  slides: CardSlide[];
  currentIndex: number;
  onIndexChange: (i: number) => void;
  cardWidth: number;
  cardHeight: number;
  scale: number;
  slideRefs: React.RefObject<(HTMLDivElement | null)[]>;
  onSlideClick?: (e: React.PointerEvent) => void;
  // Overlay interaction props (passed through to CardSlideRenderer)
  resolvedOverlayUrls?: Record<string, { url: string; name: string }>;
  selectedOverlayIndex?: number;
  isInteractive?: boolean;
  onOverlaySelect?: (index: number) => void;
  onOverlayMove?: (index: number, x: number, y: number) => void;
  onOverlayResize?: (index: number, width: number) => void;
  onOverlayDeselect?: () => void;
  onSwipeStart?: () => void;
  selectedTextField?: string;
  onTextFieldSelect?: (field: string) => void;
  onTextFieldMove?: (field: string, x: number, y: number) => void;
  onTextFieldDeselect?: () => void;
  onTextFieldDoubleClick?: (clientX: number, clientY: number) => void;
}

// Spring physics constants
const SPRING_STIFFNESS = 300;
const SPRING_DAMPING = 30;
const VELOCITY_THRESHOLD = 0.3; // px/ms — flick detection
const DRAG_THRESHOLD = 5; // px — minimum to count as drag

export default function SwipeCarousel({
  slides,
  currentIndex,
  onIndexChange,
  cardWidth,
  cardHeight,
  scale,
  slideRefs,
  onSlideClick,
  resolvedOverlayUrls,
  selectedOverlayIndex,
  isInteractive,
  onOverlaySelect,
  onOverlayMove,
  onOverlayResize,
  onOverlayDeselect,
  onSwipeStart,
  selectedTextField,
  onTextFieldSelect,
  onTextFieldMove,
  onTextFieldDeselect,
  onTextFieldDoubleClick,
}: SwipeCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Animation state (not React state — updated via rAF for 60fps)
  const offsetX = useRef(0); // current visual offset
  const targetX = useRef(0); // where we want to land
  const velocityX = useRef(0); // spring velocity
  const rafId = useRef(0);
  const lastTime = useRef(0);

  // Pointer tracking
  const pointerDown = useRef(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const lastPointerX = useRef(0);
  const lastPointerTime = useRef(0);
  const pointerVelocity = useRef(0);
  const hasDragged = useRef(false);

  const maxIndex = slides.length - 1;

  const clampIndex = (i: number) => Math.max(0, Math.min(i, maxIndex));

  // Apply transform directly (no React re-render)
  const applyTransform = useCallback(() => {
    const track = trackRef.current;
    if (track) {
      track.style.transform = `translateX(${offsetX.current}px)`;
    }
  }, []);

  // Spring animation loop
  const animate = useCallback(() => {
    const now = performance.now();
    const dt = Math.min((now - lastTime.current) / 1000, 0.064); // cap at ~16fps minimum
    lastTime.current = now;

    if (pointerDown.current) {
      // During drag, no spring — just apply directly
      applyTransform();
      rafId.current = requestAnimationFrame(animate);
      return;
    }

    // Spring physics: F = -k * displacement - d * velocity
    const displacement = offsetX.current - targetX.current;
    const springForce = -SPRING_STIFFNESS * displacement;
    const dampingForce = -SPRING_DAMPING * velocityX.current;
    const acceleration = springForce + dampingForce;

    velocityX.current += acceleration * dt;
    offsetX.current += velocityX.current * dt;

    applyTransform();

    // Stop when settled
    if (
      Math.abs(displacement) < 0.5 &&
      Math.abs(velocityX.current) < 0.5
    ) {
      offsetX.current = targetX.current;
      velocityX.current = 0;
      applyTransform();
      rafId.current = 0;
      return;
    }

    rafId.current = requestAnimationFrame(animate);
  }, [applyTransform]);

  // Start animation loop (safe to call if already running — updates target immediately)
  const ensureAnimating = useCallback(() => {
    if (rafId.current) return; // already running, will pick up new target
    lastTime.current = performance.now();
    rafId.current = requestAnimationFrame(animate);
  }, [animate]);

  // Snap to a specific index with spring
  const snapTo = useCallback(
    (index: number, withVelocity = 0) => {
      const clamped = clampIndex(index);
      targetX.current = -clamped * cardWidth;
      velocityX.current = withVelocity;
      ensureAnimating();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardWidth, ensureAnimating, maxIndex]
  );

  // Sync with currentIndex — position-based check instead of flag
  useEffect(() => {
    if (pointerDown.current) return; // don't interrupt active drag
    const expectedX = -currentIndex * cardWidth;
    // Only animate if target differs (avoids redundant snap after internal swipe)
    if (Math.abs(targetX.current - expectedX) > 1) {
      snapTo(currentIndex);
    }
  }, [currentIndex, cardWidth, snapTo]);

  // Initialize position on mount / cardWidth change
  useEffect(() => {
    offsetX.current = -currentIndex * cardWidth;
    targetX.current = offsetX.current;
    velocityX.current = 0;
    applyTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardWidth]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // --- Pointer handlers ---

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;

      pointerDown.current = true;
      hasDragged.current = false;
      startX.current = e.clientX;
      startOffset.current = offsetX.current;
      lastPointerX.current = e.clientX;
      lastPointerTime.current = performance.now();
      pointerVelocity.current = 0;

      // Stop any ongoing spring animation velocity
      velocityX.current = 0;

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      ensureAnimating();
    },
    [ensureAnimating]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerDown.current) return;

      const dx = e.clientX - startX.current;

      if (!hasDragged.current && Math.abs(dx) > DRAG_THRESHOLD) {
        hasDragged.current = true;
        onSwipeStart?.();
      }

      // Track velocity (exponential moving average)
      const now = performance.now();
      const dt = now - lastPointerTime.current;
      if (dt > 0) {
        const instantVelocity = (e.clientX - lastPointerX.current) / dt;
        pointerVelocity.current =
          0.7 * pointerVelocity.current + 0.3 * instantVelocity;
      }
      lastPointerX.current = e.clientX;
      lastPointerTime.current = now;

      // Apply drag with rubber-band resistance at edges
      let newOffset = startOffset.current + dx;
      const minOffset = -maxIndex * cardWidth;
      const maxOffset = 0;

      if (newOffset > maxOffset) {
        const over = newOffset - maxOffset;
        newOffset = maxOffset + over * 0.3;
      } else if (newOffset < minOffset) {
        const over = minOffset - newOffset;
        newOffset = minOffset - over * 0.3;
      }

      offsetX.current = newOffset;
    },
    [cardWidth, maxIndex, onSwipeStart]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerDown.current) return;
      pointerDown.current = false;

      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

      if (!hasDragged.current) {
        // Pointer capture redirects e.target to the capturing element,
        // so we must release capture first, then find the real element under cursor
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        onSlideClick?.(e);
        return; // Was a tap, not a swipe
      }

      const v = pointerVelocity.current; // px/ms
      const currentPos = -offsetX.current / cardWidth;

      let newIndex: number;

      if (Math.abs(v) > VELOCITY_THRESHOLD) {
        newIndex = v < 0
          ? Math.ceil(currentPos)   // flick left → next
          : Math.floor(currentPos); // flick right → prev
      } else {
        newIndex = Math.round(currentPos);
      }

      newIndex = clampIndex(newIndex);

      // Convert pointer velocity (px/ms) to spring velocity (px/s)
      const springVelocity = v * 1000 * 0.4;

      // Snap first (sets targetX), then notify parent
      snapTo(newIndex, springVelocity);

      if (newIndex !== currentIndex) {
        onIndexChange(newIndex);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardWidth, currentIndex, onIndexChange, snapTo, maxIndex, onSlideClick]
  );

  return (
    <div
      style={{
        width: cardWidth,
        height: cardHeight,
        overflow: "hidden",
        touchAction: "pan-y pinch-zoom",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={trackRef}
        style={{
          display: "flex",
          width: cardWidth * slides.length,
          height: cardHeight,
          willChange: "transform",
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            style={{
              width: cardWidth,
              height: cardHeight,
              flexShrink: 0,
            }}
          >
            <CardSlideRenderer
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              slide={slide}
              scale={scale}
              resolvedOverlayUrls={resolvedOverlayUrls}
              selectedOverlayIndex={i === currentIndex ? selectedOverlayIndex : undefined}
              isInteractive={i === currentIndex ? isInteractive : false}
              onOverlaySelect={i === currentIndex ? onOverlaySelect : undefined}
              onOverlayMove={i === currentIndex ? onOverlayMove : undefined}
              onOverlayResize={i === currentIndex ? onOverlayResize : undefined}
              onOverlayDeselect={i === currentIndex ? onOverlayDeselect : undefined}
              selectedTextField={i === currentIndex ? selectedTextField : undefined}
              onTextFieldSelect={i === currentIndex ? onTextFieldSelect : undefined}
              onTextFieldMove={i === currentIndex ? onTextFieldMove : undefined}
              onTextFieldDeselect={i === currentIndex ? onTextFieldDeselect : undefined}
              onTextFieldDoubleClick={i === currentIndex ? onTextFieldDoubleClick : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
