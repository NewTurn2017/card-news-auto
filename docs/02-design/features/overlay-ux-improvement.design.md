# Design: Overlay & Image Controls UX Improvement

> Plan Reference: `docs/01-plan/features/overlay-ux-improvement.plan.md`

---

## 1. Architecture Overview

### 1.1 현재 데이터 흐름 (문제)

```
OverlayControls (slider onChange)
  → onUpdateOverlay (edit page)
    → updateOverlaysMutation (Convex) ← 매 틱마다 호출!
      → 서버 응답 → React 리렌더 → 프리뷰 업데이트

ImageControls (slider onChange)
  → handleImageChange (EditorPanel)
    → updateImageMutation (Convex) ← 매 틱마다 호출!
      → 서버 응답 → React 리렌더 → 프리뷰 업데이트
```

### 1.2 개선 데이터 흐름

```
OverlayControls / DraggableOverlay (slider or drag)
  → setLocalOverlays (즉시)  → 프리뷰 즉각 반영
  → debounce 300ms → updateOverlaysMutation (Convex)

ImageControls (slider onChange)
  → setLocalImage (즉시)  → 프리뷰 즉각 반영
  → debounce 300ms → updateImageMutation (Convex)
```

---

## 2. Component Design

### 2.1 edit/[id]/page.tsx — Local State 추가

#### 2.1.1 오버레이 로컬 상태

```typescript
// 새로운 state & refs
const [localOverlays, setLocalOverlays] = useState<CardSlide["overlays"] | null>(null);
const overlayPendingRef = useRef(false);
const overlayTimerRef = useRef<ReturnType<typeof setTimeout>>();

// 서버 동기화 (pending이 아닐 때만)
useEffect(() => {
  if (!overlayPendingRef.current && convexSlide) {
    setLocalOverlays(convexSlide.overlays ?? []);
  }
}, [convexSlide?.overlays]);

// 슬라이드 변경 시 리셋
useEffect(() => {
  overlayPendingRef.current = false;
  if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
  setLocalOverlays(convexSlide?.overlays ?? []);
}, [safeIndex]);
```

#### 2.1.2 이미지 로컬 상태

```typescript
const [localImage, setLocalImage] = useState<SlideImage | null | undefined>(undefined);
const imagePendingRef = useRef(false);
const imageTimerRef = useRef<ReturnType<typeof setTimeout>>();

// 서버 동기화
useEffect(() => {
  if (!imagePendingRef.current && convexSlide) {
    setLocalImage(convexSlide.image ? mapImage(convexSlide.image) : null);
  }
}, [convexSlide?.image]);
```

#### 2.1.3 Debounced Update 핸들러

```typescript
const handleOverlayUpdate = useCallback((index: number, partial: Partial<Overlay>) => {
  setLocalOverlays(prev => {
    const updated = [...(prev ?? [])];
    updated[index] = { ...updated[index], ...partial };
    return updated;
  });
  overlayPendingRef.current = true;

  if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
  overlayTimerRef.current = setTimeout(() => {
    // flush: localOverlays를 mutation으로 전송
    // 주의: setTimeout 콜백에서 최신 localOverlays를 참조해야 하므로
    // flushOverlays 함수를 별도로 분리
    flushOverlays();
  }, 300);
}, []);

const handleImageUpdate = useCallback((image: SlideImage | undefined) => {
  setLocalImage(image ?? null);
  imagePendingRef.current = true;

  if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
  imageTimerRef.current = setTimeout(() => {
    flushImage(image);
  }, 300);
}, []);
```

#### 2.1.4 프리뷰에 로컬 상태 전달

```typescript
// allSlides 빌드 시 로컬 상태 적용
const allSlides: CardSlide[] = slides.map((s, i) => {
  const mapped = mapConvexSlide(s);
  if (i === safeIndex) {
    return {
      ...mapped,
      content: ...,
      style: ...,
      overlays: localOverlays ?? s.overlays,      // ← 추가
      image: localImage !== undefined ? (localImage ?? undefined) : mapped.image, // ← 추가
    };
  }
  return mapped;
});
```

---

### 2.2 ImageControls — 로컬 우선 업데이트

**변경 사항:** 컴포넌트 자체는 변경 없음. `edit/[id]/page.tsx`에서 `handleImageChange` → `handleImageUpdate`로 교체하여 debounce 적용.

**EditorPanel 연결:**
```typescript
// EditorPanel props에 추가
localImage?: SlideImage;  // 로컬 이미지 상태 전달
onImageChange: (image: SlideImage | undefined) => void;  // debounced handler
```

EditorPanel의 `ImageControls`에 `localImage`를 전달하여 슬라이더가 로컬 값을 표시하도록 변경:

```typescript
{section.id === "image" && (
  <ImageControls
    image={localImage ?? mappedImage}   // 로컬 우선
    onChange={onImageChange}            // debounced handler
  />
)}
```

---

### 2.3 OverlayImage → DraggableOverlay (리팩토링)

현재 `OverlayImage`를 인터랙티브 드래그/리사이즈 지원 컴포넌트로 확장.

#### 2.3.1 Props Interface

```typescript
interface DraggableOverlayProps {
  url: string;           // 부모에서 resolve한 URL (useQuery 제거)
  name: string;
  x: number;             // % position
  y: number;
  width: number;         // % size
  opacity: number;
  isSelected: boolean;
  isInteractive: boolean; // 에디터 모드 vs 내보내기 모드
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number) => void;
  onDeselect: () => void;
}
```

#### 2.3.2 드래그 구현

```typescript
function DraggableOverlay({ url, x, y, width, opacity, isSelected, isInteractive, ... }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isInteractive) return;
    e.stopPropagation();  // SwipeCarousel 드래그 방지
    e.preventDefault();

    isDragging.current = true;
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      origX: x, origY: y,
    };

    onSelect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const parentRect = overlayRef.current?.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    // 픽셀 이동량을 % 단위로 변환
    const dx = ((e.clientX - dragStart.current.x) / parentRect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / parentRect.height) * 100;

    const newX = Math.max(0, Math.min(100, dragStart.current.origX + dx));
    const newY = Math.max(0, Math.min(100, dragStart.current.origY + dy));

    onMove(Math.round(newX), Math.round(newY));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={overlayRef}
      className={`absolute z-20 ${isInteractive ? 'cursor-move' : 'pointer-events-none'}`}
      style={{
        left: `${x}%`, top: `${y}%`,
        width: `${width}%`,
        opacity: opacity / 100,
        transform: 'translate(-50%, -50%)',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img src={url} alt={name} className="w-full h-auto pointer-events-none" draggable={false} />

      {/* Selection border + resize handles */}
      {isSelected && isInteractive && (
        <>
          <div className="absolute inset-0 border-2 border-accent rounded pointer-events-none" />
          {/* 4 corner resize handles */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => (
            <div
              key={corner}
              className={`absolute w-3 h-3 bg-white border-2 border-accent rounded-full cursor-nwse-resize ${cornerPositionClass(corner)}`}
              onPointerDown={(e) => handleResizeStart(e, corner)}
            />
          ))}
        </>
      )}
    </div>
  );
}
```

#### 2.3.3 리사이즈 구현

```typescript
const handleResizeStart = (e: React.PointerEvent, corner: string) => {
  e.stopPropagation();
  const parentRect = overlayRef.current?.parentElement?.getBoundingClientRect();
  if (!parentRect) return;

  const startX = e.clientX;
  const startWidth = width;

  const onPointerMove = (ev: PointerEvent) => {
    // 좌측 핸들: dx를 반전
    const sign = corner.includes('left') ? -1 : 1;
    const dx = ((ev.clientX - startX) / parentRect.width) * 100 * sign;
    const newWidth = Math.max(5, Math.min(100, startWidth + dx));
    onResize(Math.round(newWidth));
  };

  const onPointerUp = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
};
```

---

### 2.4 CardSlideRenderer 수정

#### 2.4.1 Asset URL Resolution (쿼리 최적화)

기존: `OverlayImage`가 각각 `useQuery(api.userAssets.listAssets)` 호출
개선: `CardSlideRenderer`에 `resolvedOverlayUrls` prop 추가

```typescript
// CardSlideRenderer props 확장
interface CardSlideRendererProps {
  slide: CardSlide;
  scale?: number;
  resolvedOverlayUrls?: Record<string, { url: string; name: string }>;
  selectedOverlayIndex?: number;
  isInteractive?: boolean;
  onOverlaySelect?: (index: number) => void;
  onOverlayMove?: (index: number, x: number, y: number) => void;
  onOverlayResize?: (index: number, width: number) => void;
  onOverlayDeselect?: () => void;
}
```

#### 2.4.2 오버레이 렌더링 변경

```typescript
{/* Overlays */}
{slide.overlays?.map((overlay, idx) => {
  const resolved = resolvedOverlayUrls?.[overlay.assetId];
  if (!resolved) return null;

  return isInteractive ? (
    <DraggableOverlay
      key={idx}
      url={resolved.url}
      name={resolved.name}
      x={overlay.x}
      y={overlay.y}
      width={overlay.width}
      opacity={overlay.opacity}
      isSelected={selectedOverlayIndex === idx}
      isInteractive={true}
      onSelect={() => onOverlaySelect?.(idx)}
      onMove={(x, y) => onOverlayMove?.(idx, x, y)}
      onResize={(w) => onOverlayResize?.(idx, w)}
      onDeselect={() => onOverlayDeselect?.()}
    />
  ) : (
    <img
      key={idx}
      src={resolved.url}
      alt={resolved.name}
      className="pointer-events-none absolute z-20"
      style={{
        left: `${overlay.x}%`, top: `${overlay.y}%`,
        width: `${overlay.width}%`,
        opacity: overlay.opacity / 100,
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
})}
```

---

### 2.5 edit/[id]/page.tsx — Asset URL Resolution

```typescript
// 한번만 쿼리하여 URL map 구성
const assets = useQuery(api.userAssets.listAssets) ?? [];
const resolvedOverlayUrls = useMemo(() => {
  const map: Record<string, { url: string; name: string }> = {};
  for (const asset of assets) {
    if (asset.url) {
      map[asset._id] = { url: asset.url, name: asset.name };
    }
  }
  return map;
}, [assets]);
```

---

### 2.6 OverlayControls — 선택 상태 연동

#### 변경된 Props

```typescript
interface OverlayControlsProps {
  overlays: Overlay[];
  selectedIndex: number | null;       // 추가
  onSelect: (index: number) => void;  // 추가
  onUpdate: (index: number, partial: Partial<Overlay>) => void;
  onRemove: (index: number) => void;
}
```

선택된 오버레이를 하이라이트하고, 슬라이더 조작 시 프리뷰의 선택 상태와 동기화.

---

## 3. SwipeCarousel 충돌 방지

### 3.1 이벤트 전파 전략

```
SwipeCarousel (onPointerDown → setPointerCapture)
  └─ CardSlideRenderer
       └─ DraggableOverlay (onPointerDown → e.stopPropagation())
```

- `DraggableOverlay`의 `onPointerDown`에서 `e.stopPropagation()` 호출
- 이벤트가 SwipeCarousel까지 도달하지 않으므로 스와이프 충돌 없음
- 오버레이 외 영역 클릭/드래그는 기존대로 SwipeCarousel이 처리

### 3.2 Export 모드 분리

- `isInteractive={false}` 전달 시: `pointer-events-none` + resize 핸들 숨김
- PNG 내보내기 시 핸들/테두리가 렌더링되지 않음

---

## 4. State Management Flow

```
┌─────────────────────────────────────────────────┐
│  edit/[id]/page.tsx (State Owner)                │
│                                                  │
│  localOverlays ←→ OverlayControls (sliders)      │
│       ↕ (양방향)                                  │
│  localOverlays ←→ DraggableOverlay (drag/resize) │
│       ↓ (debounce 300ms)                         │
│  updateOverlaysMutation → Convex DB              │
│       ↓ (서버 응답)                               │
│  convexSlide.overlays → localOverlays (sync)     │
│                                                  │
│  localImage ←→ ImageControls (sliders)           │
│       ↓ (debounce 300ms)                         │
│  updateImageMutation → Convex DB                 │
└─────────────────────────────────────────────────┘
```

---

## 5. Implementation Order

| Step | Task | Files to Modify | Files to Create | Depends |
|------|------|-----------------|-----------------|---------|
| 1 | 오버레이 로컬 상태 + debounce | `edit/[id]/page.tsx` | — | — |
| 2 | 이미지 로컬 상태 + debounce | `edit/[id]/page.tsx`, `EditorPanel.tsx` | — | — |
| 3 | DraggableOverlay 컴포넌트 | `OverlayImage.tsx` 삭제 | `DraggableOverlay.tsx` | 1 |
| 4 | Asset URL resolution | `edit/[id]/page.tsx`, `CardSlideRenderer.tsx` | — | 3 |
| 5 | 드래그 앤 드롭 연결 | `CardSlideRenderer.tsx`, `edit/[id]/page.tsx` | — | 3, 4 |
| 6 | 리사이즈 핸들 | `DraggableOverlay.tsx` | — | 5 |
| 7 | 슬라이더-프리뷰 양방향 동기화 | `OverlayControls.tsx` | — | 5, 6 |

---

## 6. Testing Checklist

- [ ] 오버레이 슬라이더 조작 시 프리뷰 즉각 반영 (버벅임 없음)
- [ ] 이미지 슬라이더 조작 시 프리뷰 즉각 반영
- [ ] Convex mutation이 300ms debounce 적용 (Network 탭에서 확인)
- [ ] 프리뷰에서 오버레이 클릭 시 선택 테두리 표시
- [ ] 프리뷰에서 오버레이 드래그 시 위치 변경 + 슬라이더 값 동기화
- [ ] 프리뷰에서 코너 핸들 드래그 시 크기 변경
- [ ] 오버레이 외 영역 드래그 시 슬라이드 스와이프 정상 동작
- [ ] 오버레이 외 영역 클릭 시 오버레이 선택 해제
- [ ] PNG 내보내기 시 드래그 핸들/테두리 미표시
- [ ] 슬라이드 전환 시 로컬 상태 정상 리셋
- [ ] 5개 오버레이 동시 존재 시 성능 정상
