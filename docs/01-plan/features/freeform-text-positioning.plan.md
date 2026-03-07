# Plan: Freeform Text Positioning & Selection Bug Fix

## Executive Summary

| Item | Detail |
|------|--------|
| Feature | 슬라이드 간 선택 border 버그 수정 + 텍스트 자율 배치 모드 |
| Start Date | 2026-03-07 |
| Estimated Scope | Medium (버그 1건 + 신규 기능 1건) |

### Value Delivered

| Perspective | Description |
|-------------|-------------|
| Problem | 슬라이드 전환 시 선택 border가 잔존하여 UX 혼란 발생. 텍스트 위치가 레이아웃 프리셋에 고정되어 자유로운 디자인 불가 |
| Solution | 슬라이드 전환 시 모든 선택 상태를 즉시 초기화. DraggableOverlay 패턴을 텍스트에 확장하여 자율 배치 모드 제공 |
| Function UX Effect | 선택 상태 전환이 깔끔해지고, 개별 텍스트를 드래그로 자유 배치하여 캔바 수준의 편집 자유도 확보 |
| Core Value | 레이아웃 프리셋의 편의성과 자율 배치의 유연성을 동시에 제공하는 하이브리드 편집 시스템 |

---

## 1. Bug Fix: 슬라이드 간 선택 border 잔존

### 1.1 현상
- 슬라이드 A에서 텍스트 필드를 선택(InlineEditLayer highlight)하거나 오버레이를 선택한 후
- 다른 슬라이드 B로 이동하면 선택 border가 그대로 남아 있음

### 1.2 원인 분석

**InlineEditLayer 선택 잔존:**
- `InlineEditLayer.tsx:106-108`: `slideRef` 변경 시 `selectedField`를 초기화
- 하지만 `slideRef`는 `allSlideRefs.current[safeIndex]`이며, SwipeCarousel이 모든 슬라이드를 동시에 렌더링
- **핵심 문제**: `selectedField` 초기화가 `useEffect` (비동기)로 처리되어, 렌더링 사이클 동안 새 슬라이드의 같은 `data-field` 요소에 highlight가 일시적으로 적용
- 또한 `highlightRect` 상태가 `selectedField` null 이전에 새 슬라이드 기준으로 재계산될 수 있음

**Overlay 선택 잔존:**
- `page.tsx:161`: `safeIndex` 변경 시 `setSelectedOverlayIndex(null)` 호출
- `SwipeCarousel.tsx:309`: `i === currentIndex`일 때만 `selectedOverlayIndex` 전달
- 하지만 `currentIndex`가 업데이트된 후 `selectedOverlayIndex`가 아직 null이 아닌 한 프레임 동안 새 슬라이드의 오버레이에 선택 border가 표시됨

### 1.3 수정 방안

1. **`page.tsx` - 슬라이드 전환 시 slideClickInfo도 초기화**
   - `safeIndex` useEffect에서 `setSlideClickInfo(null)` 추가

2. **`InlineEditLayer.tsx` - safeIndex/slideRef 변경 시 즉시 초기화 강화**
   - `highlightRect`도 함께 null로 초기화
   - `slideRef` 변경 시 `updateHighlight`를 건너뛰도록 guard

3. **`SwipeCarousel.tsx` - 현재 슬라이드 외에는 선택 상태 절대 전달하지 않음** (이미 구현됨, 확인만)

### 1.4 영향 범위
- `src/app/(app)/edit/[id]/page.tsx`
- `src/components/preview/InlineEditLayer.tsx`

---

## 2. Feature: 텍스트 자율 배치 모드 (Freeform Text Positioning)

### 2.1 컨셉

현재 DraggableOverlay가 에셋(로고, 워터마크)에 대해 자유 이동/리사이즈를 지원하는 방식을 텍스트 필드에도 적용.
레이아웃 모드와 자율 모드를 전환할 수 있는 하이브리드 시스템.

| 모드 | 설명 | 텍스트 위치 |
|------|------|-------------|
| 레이아웃 모드 (기본) | CSS flex/grid 기반 9방향 + 특수 레이아웃 | 프리셋 자동 배치 |
| 자율 모드 | 개별 텍스트 필드를 드래그로 자유 배치 | 퍼센트 좌표 (x, y) |

### 2.2 접근 방식 비교

| 방식 | 장점 | 단점 | 채택 |
|------|------|------|------|
| A. 텍스트를 오버레이처럼 완전 absolute | 기존 DraggableOverlay 재사용 | 텍스트 정렬/레이아웃 상실, 복잡 | X |
| B. 레이아웃 컨테이너에 offset 추가 | 레이아웃 유지하면서 미세 조정 | 드래그 범위 제한적 | X |
| **C. 자율 모드 토글 + 필드별 absolute positioning** | **레이아웃/자율 공존, DraggableOverlay 패턴 재사용** | **모드 전환 UI 필요** | **O** |

### 2.3 방식 C 상세 설계

#### 2.3.1 데이터 모델 확장

```typescript
// SlideStyle에 추가
interface SlideStyle {
  // ... 기존 필드
  freeformMode?: boolean;  // 자율 모드 활성화 여부
  textPositions?: {
    category?: { x: number; y: number };  // 퍼센트 좌표
    title?: { x: number; y: number };
    subtitle?: { x: number; y: number };
    body?: { x: number; y: number };
  };
}
```

#### 2.3.2 Schema 확장 (Convex)

```typescript
// slides.style에 추가
freeformMode: v.optional(v.boolean()),
textPositions: v.optional(v.object({
  category: v.optional(v.object({ x: v.number(), y: v.number() })),
  title: v.optional(v.object({ x: v.number(), y: v.number() })),
  subtitle: v.optional(v.object({ x: v.number(), y: v.number() })),
  body: v.optional(v.object({ x: v.number(), y: v.number() })),
})),
```

#### 2.3.3 렌더링 로직

**레이아웃 모드** (기본): 현재와 동일 - CSS 클래스 기반 배치
**자율 모드**: 각 텍스트 필드를 `position: absolute`로 전환, `textPositions` 좌표 사용

```tsx
// CardSlideRenderer 내부
{freeformMode ? (
  // 각 필드를 개별 absolute 요소로 렌더
  <DraggableTextField field="title" x={pos.x} y={pos.y} ... />
) : (
  // 기존 레이아웃 컨테이너
  <div className="relative z-10 flex flex-col gap-4">...</div>
)}
```

#### 2.3.4 DraggableTextField 컴포넌트

DraggableOverlay와 동일한 패턴:
- `position: absolute` + `left/top` 퍼센트
- 포인터 이벤트로 드래그
- 선택 시 accent border + 이동 핸들
- 부모 컨테이너 대비 퍼센트 좌표 계산

#### 2.3.5 UI 토글

EditorPanel에 모드 전환 버튼:
- 레이아웃 아이콘 (Grid) ↔ 자율 아이콘 (Move)
- 자율 모드 전환 시 현재 레이아웃의 텍스트 위치를 초기 좌표로 자동 계산

#### 2.3.6 자율 모드 → 레이아웃 모드 전환

- 자율 모드에서 레이아웃 모드로 돌아가면 `textPositions`는 보존 (다시 자율 모드 시 복원)
- 레이아웃 선택 시 자율 모드 자동 해제 + 확인 dialog

### 2.4 영향 범위

| 파일 | 변경 내용 |
|------|----------|
| `convex/schema.ts` | slides.style에 `freeformMode`, `textPositions` 추가 |
| `convex/slides.ts` | updateSlideStyle validator 업데이트 |
| `src/types/index.ts` | SlideStyle 타입 확장 |
| `src/components/preview/CardSlideRenderer.tsx` | 자율 모드 렌더링 분기 |
| `src/components/preview/DraggableTextField.tsx` | **신규** - DraggableOverlay 패턴 기반 텍스트 드래그 컴포넌트 |
| `src/components/editor/EditorPanel.tsx` | 모드 토글 UI |
| `src/app/(app)/edit/[id]/page.tsx` | 텍스트 위치 상태 관리 + 디바운스 저장 |

---

## 3. Implementation Order

1. **[Bug Fix]** 선택 border 잔존 버그 수정 (1단계)
2. **[Schema]** Convex schema + TypeScript 타입 확장 (2단계)
3. **[Component]** DraggableTextField 컴포넌트 개발 (3단계)
4. **[Renderer]** CardSlideRenderer 자율 모드 렌더링 (4단계)
5. **[Integration]** EditorPanel 모드 토글 + page.tsx 상태 관리 (5단계)
6. **[Polish]** 레이아웃↔자율 전환 UX, 초기 좌표 계산 (6단계)

---

## 4. Risk & Considerations

| Risk | Mitigation |
|------|-----------|
| 자율 모드에서 텍스트 겹침 | 드래그 중 시각적 가이드라인 제공 (향후) |
| 내보내기(PNG)에서 자율 모드 렌더링 불일치 | CardSlideRenderer 하나로 통일하여 WYSIWYG 보장 |
| 기존 데이터 호환성 | `freeformMode` 기본값 false, `textPositions` optional |
| 모바일 터치 드래그 충돌 | SwipeCarousel과 동일한 포인터 캡처 패턴 적용 |

---

## 5. Out of Scope

- 텍스트 회전 (rotation)
- 텍스트 리사이즈 (드래그로 크기 조절) - 기존 fontSize 슬라이더 유지
- 스냅 가이드라인 (자석 정렬)
- 멀티 선택 (여러 텍스트 동시 이동)
