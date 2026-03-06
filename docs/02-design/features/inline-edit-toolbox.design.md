# Inline Edit Toolbox — Design Document

> Reference: [Plan](../../01-plan/features/inline-edit-toolbox.plan.md)

## 1. Component Architecture

```
EditPage (edit/[id]/page.tsx)
├── EditorPanel (기존 사이드 패널 — 변경 없음)
└── Preview Area (relative container)
    ├── PhoneMockup > InstagramFrame > SwipeCarousel > CardSlideRenderer
    └── InlineEditLayer (NEW — absolute overlay)
        ├── ClickZone × N (제목, 부제, 본문 클릭 영역)
        └── InlineToolbox (선택 시 플로팅 도구상자)
            └── SnippetChips (텍스트 스니펫)
```

### 핵심 결정

| Decision | Choice | Reason |
|----------|--------|--------|
| 오버레이 방식 | DOM querySelector 기반 동적 위치 계산 | 레이아웃 종류가 12+개라 정적 영역 매핑 불가 |
| CardSlideRenderer 수정 | `data-field` 속성만 추가 | export용 렌더러 최소 변경, DOM 탐색 안정화 |
| 도구상자 위치 | 선택 요소 우측 (공간 없으면 좌측 flip) | 미리보기를 가리지 않는 최적 위치 |
| 스와이프/클릭 구분 | SwipeCarousel의 `hasDragged` 활용, 클릭 이벤트 버블링 | 기존 스와이프 로직 수정 최소화 |

## 2. Data Flow

```
[InlineEditLayer] 클릭 감지
  → selectedField: "title" | "subtitle" | "body" | null
  → getBoundingClientRect()로 요소 위치 계산
  → InlineToolbox 렌더

[InlineToolbox] 값 변경
  ├── 텍스트 변경 → onContentChange(content) — EditPage 기존 핸들러
  ├── 스타일 변경 → onStyleChange(style) — EditPage 기존 핸들러
  └── 스니펫 삽입 → 텍스트 필드에 append 후 onContentChange

[TextSnippets] CRUD
  → Convex: textSnippets 테이블 (userId, label, text, order)
```

## 3. Component Specifications

### 3.1 CardSlideRenderer 변경 (최소)

각 텍스트 요소에 `data-field` 속성 추가:

```tsx
// 기존
<h2 className='slide-title' style={...}>

// 변경
<h2 className='slide-title' data-field="title" style={...}>
```

추가할 요소:
- `.slide-title` → `data-field="title"`
- `.slide-subtitle` → `data-field="subtitle"`
- `.slide-body` → `data-field="body"`

split 레이아웃과 일반 레이아웃 양쪽 모두 적용 (총 6곳).

### 3.2 InlineEditLayer

```tsx
interface InlineEditLayerProps {
  containerRef: RefObject<HTMLDivElement>;     // 미리보기 컨테이너
  slideRef: RefObject<HTMLDivElement>;         // 현재 CardSlideRenderer DOM
  scale: number;                               // previewScale
  currentStyle: SlideStyle;
  currentContent: SlideContent;
  onStyleChange: (style: Partial<SlideStyle>) => void;
  onContentChange: (content: SlideContent) => void;
}

// State
selectedField: "title" | "subtitle" | "body" | null
toolboxPosition: { top: number; left: number }
```

**위치 계산 로직:**

```
1. slideRef에서 querySelector(`[data-field="${selectedField}"]`)
2. element.getBoundingClientRect() → 원본 좌표
3. containerRef.getBoundingClientRect() → 컨테이너 기준으로 상대 변환
4. 도구상자 위치 = 요소 우측 + 8px gap
5. 화면 밖 overflow → 좌측 flip
6. 상하 overflow → 컨테이너 경계에 clamp
```

**클릭 처리:**

```
- InlineEditLayer는 position: absolute, inset: 0, z-index: 20
- pointer-events: none (기본) → SwipeCarousel 스와이프 유지
- 클릭 감지: SwipeCarousel의 pointerUp에서 hasDragged===false일 때
  → 커스텀 이벤트 dispatch 또는 onClick 콜백으로 전달
```

**선택 하이라이트:**

```css
/* 선택된 요소 */
outline: 2px solid var(--accent);
outline-offset: 4px;
border-radius: 4px;
/* 호버 (도구상자 열린 상태에서) */
outline: 1px dashed var(--accent) / 50%;
```

하이라이트는 별도 div를 absolute로 겹쳐서 렌더 (CardSlideRenderer 직접 수정 대신).

### 3.3 InlineToolbox

```tsx
interface InlineToolboxProps {
  field: "title" | "subtitle" | "body";
  position: { top: number; left: number };
  style: SlideStyle;
  content: SlideContent;
  onStyleChange: (style: Partial<SlideStyle>) => void;
  onContentChange: (content: SlideContent) => void;
  onClose: () => void;
}
```

**레이아웃:**

```
┌─────────────────────────────────┐
│ ✎ 제목                    [✕]  │  ← 헤더 (필드명 + 닫기)
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 텍스트 입력 (textarea)      │ │  ← 2줄 textarea
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 크기  ──●──────────── 52px     │  ← range slider
│ 행간  ──────●──────── 1.3      │
│ 자간  ────●────────── 0px      │
│ 색상  [■ #ffffff]              │  ← color input
├─────────────────────────────────┤
│ 스니펫                  [+ 저장]│
│ ┌──────┐ ┌──────┐ ┌──────┐    │  ← chip buttons
│ │브랜드명│ │@출처 │ │ CTA │    │
│ └──────┘ └──────┘ └──────┘    │
└─────────────────────────────────┘
```

**스타일:**
- 배경: `bg-surface` with `border border-border`
- 너비: `280px` 고정
- 모서리: `rounded-xl`
- 그림자: `shadow-xl`
- z-index: 30 (하이라이트 위)

**필드 → 스타일 속성 매핑:**

| Field | fontSize | lineHeight | letterSpacing | color |
|-------|----------|------------|---------------|-------|
| title | `titleSize` (24-80) | `titleLineHeight` (0.8-2.5) | `titleLetterSpacing` (-2~10) | `titleColor` |
| subtitle | `subtitleSize` (14-50) | `subtitleLineHeight` (0.8-2.5) | `subtitleLetterSpacing` (-2~10) | `subtitleColor` |
| body | `bodySize` (12-40) | `bodyLineHeight` (0.8-2.5) | `bodyLetterSpacing` (-2~10) | `bodyColor` |

**색상 기본값:**

| Field | Fallback |
|-------|----------|
| title | `currentStyle.textColor` |
| subtitle | `currentStyle.subtextColor ?? rgba(255,255,255,0.7)` |
| body | `currentStyle.subtextColor ?? rgba(255,255,255,0.7)` |

### 3.4 TextSnippets

**Convex Schema:**

```typescript
textSnippets: defineTable({
  userId: v.id("users"),
  label: v.string(),        // 표시 이름 (최대 20자)
  text: v.string(),          // 삽입할 텍스트 (최대 200자)
  order: v.number(),
  createdAt: v.number(),
}).index("by_userId", ["userId"])
```

**Convex API (`convex/textSnippets.ts`):**

| API | Type | Description |
|-----|------|-------------|
| `list` | query | 사용자의 스니펫 목록 (order 정렬) |
| `save` | mutation | 새 스니펫 저장 (최대 20개 제한) |
| `remove` | mutation | 스니펫 삭제 |
| `reorder` | mutation | 순서 변경 |

**삽입 동작:**
- chip 클릭 → 현재 textarea의 커서 위치에 `snippet.text` 삽입
- 커서 없으면 텍스트 끝에 append
- 삽입 후 `onContentChange` 호출

**저장 동작:**
- [+ 저장] 클릭 → 인라인 입력 (label + 현재 선택된 텍스트가 text로 자동 입력)
- 20개 초과 시 "스니펫 최대 20개" 토스트

## 4. SwipeCarousel 연동

SwipeCarousel에서 "클릭"(스와이프가 아닌)을 감지하여 상위로 전달해야 합니다.

**수정 방법:** `onSlideClick` 콜백 추가

```tsx
// SwipeCarousel props 추가
onSlideClick?: (e: React.PointerEvent) => void;

// handlePointerUp 내부
if (!hasDragged.current) {
  onSlideClick?.(e);
  return;
}
```

EditPage에서 `onSlideClick`을 받아 InlineEditLayer에 전달:

```tsx
const handleSlideClick = (e: React.PointerEvent) => {
  // slideRef에서 클릭된 data-field 요소 탐색
  const target = e.target as HTMLElement;
  const fieldEl = target.closest('[data-field]');
  if (fieldEl) {
    setSelectedField(fieldEl.getAttribute('data-field') as FieldType);
  } else {
    setSelectedField(null); // 빈 영역 → 닫기
  }
};
```

## 5. File Changes Summary

### New Files (3)

| File | Lines (est.) | Description |
|------|-------------|-------------|
| `src/components/preview/InlineEditLayer.tsx` | ~150 | 오버레이 + 하이라이트 + 위치 계산 |
| `src/components/preview/InlineToolbox.tsx` | ~200 | 플로팅 도구상자 UI |
| `convex/textSnippets.ts` | ~80 | 스니펫 CRUD API |

### Modified Files (4)

| File | Change |
|------|--------|
| `convex/schema.ts` | `textSnippets` 테이블 추가 |
| `src/components/preview/CardSlideRenderer.tsx` | `data-field` 속성 추가 (6곳) |
| `src/components/preview/SwipeCarousel.tsx` | `onSlideClick` 콜백 prop 추가 |
| `src/app/(app)/edit/[id]/page.tsx` | InlineEditLayer 통합, selectedField 상태 |

## 6. Implementation Order

```
Phase 1: 기반 (클릭 감지)
  1. CardSlideRenderer — data-field 속성 추가
  2. SwipeCarousel — onSlideClick 콜백 추가
  3. InlineEditLayer — 클릭 감지 + 하이라이트
  4. EditPage — InlineEditLayer 통합

Phase 2: 도구상자
  5. InlineToolbox — 슬라이더 + 색상 + 텍스트 편집
  6. EditPage — 도구상자 ↔ 기존 핸들러 연결

Phase 3: 스니펫
  7. convex/schema.ts + convex/textSnippets.ts
  8. InlineToolbox — 스니펫 UI 통합
```

## 7. Edge Cases

| Case | Handling |
|------|----------|
| 요소가 없는 슬라이드 (body 없음) | 해당 필드는 클릭 영역 없음 — null 처리 |
| 도구상자가 화면 밖으로 나감 | `Math.min(top, containerHeight - toolboxHeight)` clamp |
| 스와이프 중 클릭 오감지 | `hasDragged` 5px 이상이면 무시 (기존 로직) |
| 모바일 화면 | Phase 1에서 데스크톱만 (md 이상), 모바일은 기존 패널 |
| 슬라이드 전환 시 | `selectedField = null` 초기화 |
| 도구상자 열린 채 사이드 패널 수정 | 양방향 동기화 (같은 상태 공유하므로 자동) |
| export 시 data-field 잔류 | data-* 속성은 렌더링에 영향 없음, html-to-image도 무시 |
