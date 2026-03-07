# Plan: Overlay & Image Controls UX Improvement

## Executive Summary

| Item | Detail |
|------|--------|
| Feature | overlay-ux-improvement |
| Created | 2026-03-07 |
| Level | Dynamic |

### Value Delivered

| Perspective | Description |
|-------------|-------------|
| Problem | 오버레이/이미지 슬라이더 조작 시 매 틱마다 Convex mutation이 즉시 호출되어 UI가 버벅이며, 슬라이더 전용 포지셔닝으로 직관성이 부족함 |
| Solution | 로컬 상태 + 디바운싱 패턴 적용, 프리뷰 위 드래그 앤 드롭 포지셔닝 도입 |
| Function UX Effect | 슬라이더 조작이 즉각 반영되고, 프리뷰에서 직접 드래그로 위치 조정 가능 |
| Core Value | Canva 수준의 직관적 이미지/오버레이 편집 경험 제공 |

---

## 1. Problem Analysis

### 1.1 Current State

현재 이미지/오버레이 컨트롤의 문제점:

#### Performance (버벅임)
- **오버레이**: `onUpdateOverlay`가 슬라이더 매 틱마다 `updateOverlaysMutation` 직접 호출 (debounce 없음)
- **이미지**: `ImageControls`의 `onChange`가 매 틱마다 `updateImageMutation` 직접 호출 (debounce 없음)
- **비교**: 스타일 변경은 `localStyle` + `300ms debounce` 패턴이 적용되어 부드럽게 동작
- **OverlayImage**: 각 오버레이 컴포넌트가 `useQuery(api.userAssets.listAssets)`를 개별 호출하여 불필요한 쿼리 발생

#### UX (직관성)
- 슬라이더 전용 위치 조정 — 프리뷰에서 직접 드래그 불가
- 오버레이 선택/활성화 상태가 없어 어떤 오버레이를 편집 중인지 불명확
- 오버레이 크기 조절도 슬라이더 전용 — 핸들 드래그로 리사이즈 불가

### 1.2 Affected Files

| File | Role | Issue |
|------|------|-------|
| `src/app/(app)/edit/[id]/page.tsx` | Edit page | overlay/image onChange에 debounce 없음 |
| `src/components/editor/OverlayControls.tsx` | Overlay sliders | 슬라이더 전용 UI |
| `src/components/editor/ImageControls.tsx` | Image sliders | 슬라이더 전용 UI, debounce 없음 |
| `src/components/preview/OverlayImage.tsx` | Overlay render | 개별 useQuery 호출 |
| `src/components/editor/EditorPanel.tsx` | Editor panel | overlay props 전달 |

---

## 2. Goals

| # | Goal | Priority | Complexity |
|---|------|----------|------------|
| G1 | 오버레이/이미지 슬라이더 조작 시 버벅임 제거 (debounce + local state) | P0 | Low |
| G2 | 프리뷰 위 오버레이 드래그 앤 드롭 포지셔닝 | P1 | Medium |
| G3 | 프리뷰 위 오버레이 리사이즈 핸들 | P1 | Medium |
| G4 | 이미지 컨트롤 슬라이더 debounce 적용 | P0 | Low |
| G5 | OverlayImage 쿼리 최적화 (prop으로 URL 전달) | P2 | Low |

---

## 3. Solution Design

### 3.1 G1+G4: Debounce + Local State Pattern

스타일 변경에서 이미 검증된 패턴을 오버레이/이미지에 동일 적용:

```
[슬라이더 조작] → [로컬 상태 즉시 업데이트] → [프리뷰 즉각 반영]
                                              → [300ms debounce] → [Convex mutation]
```

**구현 포인트:**
- `edit/[id]/page.tsx`: 오버레이/이미지용 로컬 상태 (`localOverlays`, `localImage`) 추가
- 로컬 상태를 프리뷰에 전달하여 즉각 반영
- debounce timer로 mutation 호출 지연
- 서버 응답 시 로컬 상태 sync (pending이 아닐 때만)

### 3.2 G2+G3: Preview Drag & Resize

프리뷰 캔버스 위에서 오버레이를 직접 드래그/리사이즈:

```
[오버레이 클릭] → [선택 상태 활성화 + 테두리 표시]
[드래그] → [로컬 좌표 업데이트] → [debounce → mutation]
[코너 핸들 드래그] → [로컬 크기 업데이트] → [debounce → mutation]
```

**구현 포인트:**
- `OverlayImage`를 인터랙티브하게 변경: `pointer-events-none` 제거, 클릭/드래그 이벤트 추가
- 선택된 오버레이에 resize 핸들 표시 (4코너)
- 드래그 좌표를 % 단위로 변환 (부모 컨테이너 기준)
- 슬라이더 패널과 양방향 동기화

### 3.3 G5: Query Optimization

- `OverlayImage`에서 `useQuery` 제거
- 부모에서 asset URL을 한번 resolve하여 prop으로 전달

---

## 4. Implementation Order

| Step | Task | Files | Depends |
|------|------|-------|---------|
| 1 | 오버레이 로컬 상태 + debounce 적용 | `edit/[id]/page.tsx` | - |
| 2 | 이미지 컨트롤 로컬 상태 + debounce 적용 | `edit/[id]/page.tsx`, `ImageControls.tsx` | - |
| 3 | OverlayImage 쿼리 최적화 | `OverlayImage.tsx`, `CardSlideRenderer.tsx` | 1 |
| 4 | 오버레이 드래그 앤 드롭 구현 | `OverlayImage.tsx`, `edit/[id]/page.tsx` | 1, 3 |
| 5 | 오버레이 리사이즈 핸들 구현 | `OverlayImage.tsx` | 4 |
| 6 | 슬라이더-프리뷰 양방향 동기화 | `OverlayControls.tsx`, `OverlayImage.tsx` | 4, 5 |

---

## 5. Risk & Constraints

| Risk | Impact | Mitigation |
|------|--------|------------|
| 드래그 이벤트가 SwipeCarousel 스와이프와 충돌 | High | `e.stopPropagation()` + 오버레이 영역에서만 드래그 활성화 |
| 로컬 상태와 서버 상태 불일치 | Medium | pending 플래그 패턴 (기존 content/style과 동일) |
| PNG 내보내기 시 드래그 핸들 노출 | Medium | 내보내기 모드에서 핸들 숨김 처리 |
| 모바일 터치 드래그 호환성 | Low | touchstart/touchmove 이벤트 함께 처리 |

---

## 6. Success Criteria

- [ ] 슬라이더 조작 시 프리뷰가 즉각 반영 (버벅임 없음)
- [ ] Convex mutation 호출이 debounce 적용 (300ms 이내 중복 호출 없음)
- [ ] 프리뷰에서 오버레이 드래그로 위치 조정 가능
- [ ] 프리뷰에서 오버레이 코너 드래그로 크기 조정 가능
- [ ] 슬라이더 값과 프리뷰 위치가 양방향 동기화
