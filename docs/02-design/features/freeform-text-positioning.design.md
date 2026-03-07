# Design: Freeform Text Positioning & Selection Bug Fix

> Plan Reference: `docs/01-plan/features/freeform-text-positioning.plan.md`

---

## Part 1: Bug Fix - 슬라이드 간 선택 border 잔존

### 1.1 Root Cause

**InlineEditLayer 텍스트 선택:**
- `selectedField` 초기화가 `useEffect`로 비동기 처리 → 렌더 사이클 간 1프레임 지연
- 새 슬라이드에도 동일한 `data-field` 속성 존재 → `updateHighlight`가 새 슬라이드 요소 기준으로 rect 재계산
- `highlightRect`가 `selectedField` null 이전에 업데이트됨

**Overlay 선택:**
- `page.tsx:161`에서 `setSelectedOverlayIndex(null)` 호출하지만, `useEffect` 비동기 처리로 1프레임 지연
- `SwipeCarousel`이 이미 `i === currentIndex` 가드를 하지만, `currentIndex`가 업데이트된 직후 `selectedOverlayIndex`가 아직 null이 아닌 상태에서 새 슬라이드 오버레이에 선택 표시

### 1.2 Fix Design

#### Fix A: InlineEditLayer - 즉시 초기화 (Primary Fix)

**파일**: `src/components/preview/InlineEditLayer.tsx`

```diff
// 기존: useEffect에서 slideRef 변경 감지
- useEffect(() => {
-   setSelectedField(null);
- }, [slideRef]);

// 변경: slideRef 변경 시 selectedField + highlightRect 동시 초기화
+ useEffect(() => {
+   setSelectedField(null);
+   setHighlightRect(null);
+ }, [slideRef]);
```

#### Fix B: page.tsx - slideClickInfo 초기화

**파일**: `src/app/(app)/edit/[id]/page.tsx`

```diff
// safeIndex 변경 시 초기화 블록에 추가
  useEffect(() => {
    if (convexSlide) {
      ...
      setSelectedOverlayIndex(null);
+     setSlideClickInfo(null);
      ...
    }
  }, [safeIndex]);
```

#### Fix C: SwipeCarousel - 스와이프 시작 시 부모에 통지

**파일**: `src/components/preview/SwipeCarousel.tsx`

스와이프가 시작되는 순간(hasDragged가 true가 되는 시점) 부모에 통지하여 선택 상태를 즉시 해제.

```diff
  // SwipeCarouselProps에 추가
+ onSwipeStart?: () => void;

  // handlePointerMove에서 드래그 시작 감지 시
  if (!hasDragged.current && Math.abs(dx) > DRAG_THRESHOLD) {
    hasDragged.current = true;
+   onSwipeStart?.();
  }
```

**page.tsx에서 연결:**
```tsx
<SwipeCarousel
  ...
  onSwipeStart={() => {
    setSelectedOverlayIndex(null);
    setSlideClickInfo(null);
  }}
/>
```

### 1.3 영향 파일

| File | Change |
|------|--------|
| `src/components/preview/InlineEditLayer.tsx` | `highlightRect`도 null 초기화 |
| `src/app/(app)/edit/[id]/page.tsx` | `slideClickInfo` 초기화 + `onSwipeStart` 핸들러 |
| `src/components/preview/SwipeCarousel.tsx` | `onSwipeStart` prop 추가 |

---

## Part 2: Feature - 텍스트 자율 배치 모드

### 2.1 Architecture Overview

```
[EditorPanel]                     [CardSlideRenderer]
  |                                    |
  |-- FreeformToggle ------>  style.freeformMode
  |                                    |
  |                           freeformMode ?
  |                           /              \
  |                    [Layout Mode]    [Freeform Mode]
  |                    CSS flex/grid    absolute positioning
  |                                    |
  |                           [DraggableTextField] x N
  |                           (category, title, subtitle, body)
  |                                    |
  |                           onTextMove(field, x, y)
  |                                    |
  [page.tsx] <---- debounced save ----->  [Convex]
```

### 2.2 Data Model Extension

#### 2.2.1 TypeScript Types (`src/types/index.ts`)

```typescript
// SlideStyle에 추가
export interface SlideStyle {
  // ... 기존 필드 유지
  freeformMode?: boolean;
  textPositions?: TextPositions;
}

export interface TextPositions {
  category?: { x: number; y: number };  // 퍼센트 (0-100)
  title?: { x: number; y: number };
  subtitle?: { x: number; y: number };
  body?: { x: number; y: number };
}
```

#### 2.2.2 Convex Schema (`convex/schema.ts`)

```typescript
// slides.style 객체에 추가
freeformMode: v.optional(v.boolean()),
textPositions: v.optional(v.object({
  category: v.optional(v.object({ x: v.number(), y: v.number() })),
  title: v.optional(v.object({ x: v.number(), y: v.number() })),
  subtitle: v.optional(v.object({ x: v.number(), y: v.number() })),
  body: v.optional(v.object({ x: v.number(), y: v.number() })),
})),
```

#### 2.2.3 Convex Validator (`convex/slides.ts`)

`styleValidator`에 동일한 필드 추가.

### 2.3 Component Design

#### 2.3.1 DraggableTextField (신규)

**파일**: `src/components/preview/DraggableTextField.tsx`

DraggableOverlay와 동일한 패턴이지만 텍스트 렌더링에 특화.

```typescript
interface DraggableTextFieldProps {
  field: 'category' | 'title' | 'subtitle' | 'body';
  children: React.ReactNode;        // 텍스트 요소 (기존 <h2>, <p> 등)
  x: number;                        // 퍼센트 (0-100)
  y: number;                        // 퍼센트 (0-100)
  isInteractive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onDeselect: () => void;
}
```

**동작:**
- `position: absolute`, `left: x%`, `top: y%`
- 포인터 캡처 기반 드래그 (DraggableOverlay와 동일)
- 선택 시 accent border + 이동 커서
- `data-field` 속성 유지 → InlineEditLayer와 호환
- 리사이즈 핸들 없음 (텍스트 크기는 기존 fontSize 슬라이더 사용)

**핵심 구현:**
```tsx
<div
  className={`absolute z-10 ${isInteractive ? 'cursor-move' : ''}`}
  style={{
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
    maxWidth: '80%',   // 텍스트가 슬라이드 밖으로 넘치지 않도록
  }}
  data-field={field}
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
>
  {children}
  {isSelected && isInteractive && (
    <div className="pointer-events-none absolute inset-0 rounded border-2 border-accent"
         style={{ margin: '-4px' }} />
  )}
</div>
```

#### 2.3.2 CardSlideRenderer 변경

**파일**: `src/components/preview/CardSlideRenderer.tsx`

**새 Props 추가:**
```typescript
interface CardSlideRendererProps {
  // ... 기존 props
  selectedTextField?: string;           // 선택된 텍스트 필드
  onTextFieldSelect?: (field: string) => void;
  onTextFieldMove?: (field: string, x: number, y: number) => void;
  onTextFieldDeselect?: () => void;
}
```

**렌더링 분기:**
```tsx
const freeformMode = slide.style?.freeformMode ?? false;
const textPositions = slide.style?.textPositions;

// 기본 위치: 레이아웃 유형에 따른 초기 좌표
const defaultPositions = getDefaultPositions(layoutId);

{freeformMode ? (
  // 자율 모드: 각 필드를 개별 absolute 요소로 렌더
  <>
    {slide.content.category && (
      <DraggableTextField
        field="category"
        x={textPositions?.category?.x ?? defaultPositions.category.x}
        y={textPositions?.category?.y ?? defaultPositions.category.y}
        isInteractive={isInteractive ?? false}
        isSelected={selectedTextField === 'category'}
        onSelect={() => onTextFieldSelect?.('category')}
        onMove={(nx, ny) => onTextFieldMove?.('category', nx, ny)}
        onDeselect={() => onTextFieldDeselect?.()}
      >
        <p className="slide-category" style={...}>
          {slide.content.category}
        </p>
      </DraggableTextField>
    )}
    {/* title, subtitle, body 동일 패턴 */}
  </>
) : (
  // 기존 레이아웃 모드 (변경 없음)
  <div className="relative z-10 flex flex-col gap-4">...</div>
)}
```

#### 2.3.3 레이아웃별 기본 좌표 매핑

자율 모드 최초 진입 시, 현재 레이아웃의 텍스트 위치를 퍼센트 좌표로 변환.

```typescript
// src/data/layouts.ts 또는 CardSlideRenderer 내부 유틸리티
const LAYOUT_DEFAULT_POSITIONS: Record<string, TextPositions> = {
  'top-left':      { category: {x:15,y:10}, title: {x:30,y:25}, subtitle: {x:25,y:40}, body: {x:30,y:55} },
  'top-center':    { category: {x:50,y:10}, title: {x:50,y:25}, subtitle: {x:50,y:40}, body: {x:50,y:55} },
  'center':        { category: {x:50,y:30}, title: {x:50,y:45}, subtitle: {x:50,y:60}, body: {x:50,y:70} },
  'center-left':   { category: {x:15,y:30}, title: {x:30,y:45}, subtitle: {x:25,y:60}, body: {x:30,y:70} },
  'bottom-center': { category: {x:50,y:55}, title: {x:50,y:65}, subtitle: {x:50,y:78}, body: {x:50,y:88} },
  'split':         { category: {x:50,y:10}, title: {x:50,y:45}, subtitle: {x:50,y:85}, body: {x:50,y:65} },
  // ... 나머지 레이아웃
};
```

### 2.4 State Management (page.tsx)

#### 2.4.1 새 상태

```typescript
const [selectedTextField, setSelectedTextField] = useState<string | null>(null);
```

#### 2.4.2 텍스트 이동 핸들러

```typescript
const handleTextFieldMove = useCallback((field: string, x: number, y: number) => {
  const currentStyle: SlideStyle = localStyle ?? convexSlide.style ?? DEFAULT_STYLE;
  const newStyle: SlideStyle = {
    ...currentStyle,
    textPositions: {
      ...currentStyle.textPositions,
      [field]: { x, y },
    },
  };
  setLocalStyle(newStyle);

  // 디바운스 저장 (기존 styleTimerRef 재사용)
  if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
  styleTimerRef.current = setTimeout(() => {
    updateStyleMutation({ slideId: convexSlide._id, style: newStyle });
  }, 300);
}, [localStyle, convexSlide, updateStyleMutation]);
```

#### 2.4.3 SwipeCarousel/CardSlideRenderer Props 전달

```tsx
<SwipeCarousel
  ...
  selectedTextField={selectedTextField ?? undefined}
  onTextFieldSelect={(f) => setSelectedTextField(f)}
  onTextFieldMove={handleTextFieldMove}
  onTextFieldDeselect={() => setSelectedTextField(null)}
/>
```

SwipeCarousel은 `i === currentIndex` 가드를 적용하여 현재 슬라이드에만 전달.

### 2.5 EditorPanel - 모드 토글 UI

#### 2.5.1 토글 위치

EditorPanel의 레이아웃 선택 영역 상단에 배치:

```
┌─────────────────────────┐
│  레이아웃      [자율모드] │  ← 토글 버튼
│  ┌──┐ ┌──┐ ┌──┐        │
│  │TL│ │TC│ │TR│        │  ← 레이아웃 모드일 때만 표시
│  └──┘ └──┘ └──┘        │
│  ┌──┐ ┌──┐ ┌──┐        │
│  │CL│ │ C│ │CR│        │
│  └──┘ └──┘ └──┘        │
└─────────────────────────┘
```

#### 2.5.2 토글 동작

```typescript
// 자율 모드 활성화 시
const handleFreeformToggle = (enabled: boolean) => {
  const currentStyle = localStyle ?? convexSlide.style ?? DEFAULT_STYLE;
  const newStyle: SlideStyle = {
    ...currentStyle,
    freeformMode: enabled,
    // 자율 모드 최초 활성화 시, textPositions가 없으면 레이아웃 기본값으로 초기화
    textPositions: enabled && !currentStyle.textPositions
      ? LAYOUT_DEFAULT_POSITIONS[layoutId]
      : currentStyle.textPositions,
  };
  onLocalStyleChange(newStyle);
};
```

#### 2.5.3 레이아웃 선택과의 관계

- **레이아웃 모드**: 레이아웃 그리드 표시, 클릭으로 레이아웃 변경 가능
- **자율 모드**: 레이아웃 그리드 비활성화 (dimmed), "드래그로 텍스트를 이동하세요" 안내

### 2.6 Export 호환성

CardSlideRenderer가 WYSIWYG 원칙으로 동작하므로 별도 처리 불필요.
- `freeformMode`일 때 absolute positioning으로 렌더 → html-to-image가 그대로 캡처
- `DraggableTextField`의 선택 border는 `isInteractive={false}`일 때 숨김 → export 안전

### 2.7 InlineEditLayer 호환성

자율 모드에서도 `data-field` 속성 유지 → InlineEditLayer의 클릭 기반 필드 감지 동작.
단, 자율 모드에서 텍스트 클릭 시:
1. **짧은 클릭**: InlineEditLayer 텍스트 편집 툴박스 열기
2. **드래그**: DraggableTextField 이동

이 구분은 DraggableOverlay와 동일한 패턴 (`DRAG_THRESHOLD` 사용)으로 처리.

```tsx
// DraggableTextField 내부
const handlePointerUp = () => {
  if (!hasDragged.current) {
    // 클릭 → InlineEditLayer가 처리하도록 이벤트 전파 허용
    return;
  }
  // 드래그 → 위치 업데이트 완료
};
```

---

## Part 3: Implementation Checklist

### Step 1: Bug Fix (선택 border)
- [ ] `InlineEditLayer.tsx`: `highlightRect`도 null 초기화
- [ ] `page.tsx`: `safeIndex` useEffect에 `setSlideClickInfo(null)` 추가
- [ ] `SwipeCarousel.tsx`: `onSwipeStart` prop 추가
- [ ] `page.tsx`: `onSwipeStart` 핸들러 연결
- [ ] 테스트: 슬라이드 전환 시 선택 border 소멸 확인

### Step 2: Schema & Types
- [ ] `convex/schema.ts`: `freeformMode`, `textPositions` 추가
- [ ] `convex/slides.ts`: styleValidator 업데이트
- [ ] `src/types/index.ts`: `SlideStyle` 타입 확장
- [ ] `npx convex dev` → 스키마 반영 확인

### Step 3: DraggableTextField
- [ ] `src/components/preview/DraggableTextField.tsx` 생성
- [ ] DraggableOverlay 패턴 적용 (포인터 캡처, 퍼센트 좌표)
- [ ] 선택 border, 클릭/드래그 구분 구현
- [ ] `data-field` 속성 유지

### Step 4: CardSlideRenderer
- [ ] Props 확장 (`selectedTextField`, `onTextFieldSelect`, `onTextFieldMove`, `onTextFieldDeselect`)
- [ ] `freeformMode` 분기 렌더링 구현
- [ ] 레이아웃별 기본 좌표 매핑 (`LAYOUT_DEFAULT_POSITIONS`)
- [ ] 기존 레이아웃 모드 렌더링 변경 없음 확인

### Step 5: SwipeCarousel & page.tsx
- [ ] SwipeCarousel: 텍스트 관련 props 전달 (`i === currentIndex` 가드)
- [ ] page.tsx: `selectedTextField` 상태 + `handleTextFieldMove` 핸들러
- [ ] page.tsx: 슬라이드 전환 시 `selectedTextField` 초기화

### Step 6: EditorPanel 토글
- [ ] 자율 모드 토글 버튼 추가
- [ ] 자율 모드 시 레이아웃 그리드 비활성화
- [ ] 초기 좌표 자동 계산 로직

### Step 7: 통합 테스트
- [ ] `npm run build` 성공 확인
- [ ] 레이아웃 모드 ↔ 자율 모드 전환
- [ ] 텍스트 드래그 → 위치 저장 → 새로고침 복원
- [ ] PNG export에서 자율 모드 정상 렌더
- [ ] 슬라이드 간 전환 시 선택 상태 초기화
