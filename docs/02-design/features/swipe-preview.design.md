# Swipe Preview - Design Document

> Reference: [Plan](../../01-plan/features/swipe-preview.plan.md)

---

## 1. Component Design

### 1.1 SwipeCarousel (NEW)

**File**: `src/components/preview/SwipeCarousel.tsx`

```tsx
interface SwipeCarouselProps {
  slides: CardSlide[];          // All mapped slides
  currentIndex: number;         // Controlled index from parent
  onIndexChange: (i: number) => void;
  cardWidth: number;            // Pixel width of each slide
  cardHeight: number;           // Pixel height of each slide
  scale: number;                // CardSlideRenderer scale factor
  slideRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  editingIndex: number;         // Which slide has localStyle applied
  localStyle?: SlideStyle;      // Optimistic style for editingIndex
}
```

**Behavior:**
- Renders a horizontal scrollable container with all slides
- CSS `scroll-snap-type: x mandatory` for snap-to-slide
- Each child has `scroll-snap-align: start` and fixed width
- `IntersectionObserver` (threshold 0.6) detects which slide is most visible → fires `onIndexChange`
- `scrollTo({ left: index * cardWidth, behavior: 'smooth' })` when `currentIndex` changes externally
- Mouse drag support via `onPointerDown/Move/Up` for desktop
- `isExternalScroll` ref prevents feedback loop between observer and programmatic scroll

### 1.2 Modified: InstagramFrame

**Changes:**
- `children` changes from single `<div>` to `<SwipeCarousel>` wrapper
- No structural changes needed — carousel replaces the fixed-size div

### 1.3 Modified: EditPage (`edit/[id]/page.tsx`)

**Changes:**
- Remove `SlideNavigation` import and usage from preview area
- Build `allSlides: CardSlide[]` array mapping all convex slides
- For `editingIndex` (safeIndex), merge `localContent` + `localStyle`
- Pass `allSlideRefs` to SwipeCarousel + ExportButton
- Two-way sync: `goToSlide` ↔ carousel `onIndexChange`

### 1.4 Modified: ExportButton/ExportModal

**Changes:**
- `slideRefs` type stays `React.RefObject<HTMLDivElement | null>[]` — compatible
- All slides now have refs (not just current) → ZIP/PDF export can iterate all
- Single PNG export uses `slideRefs[currentSlideIndex]`

---

## 2. Data Flow

```
                    EditorPanel
                    (slide picker)
                         │
                    setCurrentSlideIndex(i)
                         │
                         ▼
┌─── EditPage ───────────────────────────────────┐
│  currentSlideIndex ◄────► SwipeCarousel         │
│       │                    onIndexChange(i)     │
│       │                    (IntersectionObserver)│
│       ▼                                         │
│  localContent/localStyle                        │
│  applied to allSlides[safeIndex]                │
│       │                                         │
│       ▼                                         │
│  allSlides[] ──────► SwipeCarousel              │
│  allSlideRefs[] ───► SwipeCarousel + Export     │
└─────────────────────────────────────────────────┘
```

**Feedback loop prevention:**
- `isExternalScrollRef` = true when programmatic `scrollTo` fires
- IntersectionObserver callback checks this flag, skips if true
- Reset flag after `scrollend` event or 300ms timeout

---

## 3. CSS Design

```css
/* In globals.css or component inline styles */
.swipe-carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.swipe-carousel::-webkit-scrollbar {
  display: none;
}
.swipe-carousel > .swipe-slide {
  flex-shrink: 0;
  scroll-snap-align: start;
}
```

---

## 4. Implementation Order

| Order | Task | File(s) | Depends On |
|-------|------|---------|------------|
| 1 | Create SwipeCarousel component | `SwipeCarousel.tsx` | — |
| 2 | Integrate into EditPage | `edit/[id]/page.tsx` | Task 1 |
| 3 | Remove preview SlideNavigation | `edit/[id]/page.tsx` | Task 2 |
| 4 | Update Export refs | `edit/[id]/page.tsx`, `ExportButton.tsx` | Task 2 |
| 5 | Verify & polish | All | Task 1-4 |

---

## 5. Key Implementation Details

### 5.1 Building allSlides Array

```tsx
// In EditPage, before render:
const allSlides: CardSlide[] = (slides ?? []).map((s, i) => {
  const mapped = mapConvexSlide(s);
  if (i === safeIndex) {
    return {
      ...mapped,
      content: localContent ?? s.content ?? { title: "" },
      style: localStyle ?? s.style,
    };
  }
  return mapped;
});
```

### 5.2 Ref Array Management

```tsx
// In EditPage:
const allSlideRefs = useRef<(HTMLDivElement | null)[]>([]);

// Passed to SwipeCarousel, which assigns refs:
// <div ref={el => { slideRefs.current[i] = el; }}>

// Passed to ExportButton as array of ref-like objects:
const exportRefs = allSlideRefs.current.map(el => ({ current: el }));
```

### 5.3 IntersectionObserver Setup

```tsx
// Inside SwipeCarousel:
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (isExternalScrollRef.current) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const index = Number(entry.target.dataset.index);
          if (!isNaN(index)) onIndexChange(index);
        }
      }
    },
    { root: container, threshold: 0.6 }
  );

  container.querySelectorAll('.swipe-slide').forEach(el => observer.observe(el));
  return () => observer.disconnect();
}, [slides.length, onIndexChange]);
```

### 5.4 Programmatic Scroll (External Index Change)

```tsx
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  isExternalScrollRef.current = true;
  container.scrollTo({
    left: currentIndex * cardWidth,
    behavior: 'smooth',
  });

  // Reset flag after scroll completes
  const timer = setTimeout(() => {
    isExternalScrollRef.current = false;
  }, 350);
  return () => clearTimeout(timer);
}, [currentIndex, cardWidth]);
```

---

## 6. Edge Cases

| Case | Handling |
|------|----------|
| Slide added | `allSlides` array grows, carousel re-renders, scroll position maintained |
| Slide deleted | Array shrinks, `safeIndex` clamped, carousel adjusts |
| Style change on current slide | Only `allSlides[safeIndex]` gets localStyle, others use server data |
| Rapid swipe | IntersectionObserver naturally debounces via threshold |
| Export while swiped to middle | `allSlideRefs` has all refs, export works for any/all slides |
| Window resize | `cardWidth` updates via resize listener, carousel items resize |

---

## 7. Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/preview/SwipeCarousel.tsx` | CREATE | New swipe carousel component |
| `src/app/(app)/edit/[id]/page.tsx` | MODIFY | Integrate carousel, remove bottom nav, build allSlides |
| `src/components/export/ExportButton.tsx` | MINOR | Ref type compatible, may need array conversion |
| `src/components/editor/SlideNavigation.tsx` | KEEP | Still used in EditorPanel |
| `src/app/globals.css` | MINOR | Add swipe-carousel scrollbar-hide styles |
