# Swipe Preview - Plan Document

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 미리보기에서 슬라이드 이동이 버튼 클릭 방식이라 실제 인스타그램 사용 경험과 다르고, 모바일에서 비직관적 |
| **Solution** | 터치/마우스 스와이프로 슬라이드를 넘기는 캐러셀 구현, 하단 페이지네이션 버튼 제거 |
| **Function UX Effect** | 실제 인스타그램처럼 좌우 스와이프로 슬라이드 전환 → 즉각적이고 자연스러운 프리뷰 경험 |
| **Core Value** | 편집 중 최종 결과물을 실제 사용자 관점에서 미리 볼 수 있어 콘텐츠 품질 향상 |

---

## 1. Feature Overview

### 1.1 Feature Name
Swipe Preview (스와이프 미리보기)

### 1.2 Goal
PhoneMockup 내부에서 인스타그램 캐러셀처럼 좌우 스와이프로 슬라이드를 탐색할 수 있게 한다.

### 1.3 Scope
- **In Scope:**
  - 터치 스와이프 (모바일) + 마우스 드래그 (데스크톱) 슬라이드 전환
  - 모든 슬라이드를 한 번에 렌더링하는 수평 캐러셀
  - Instagram dot indicator 클릭으로 직접 이동
  - 하단 SlideNavigation 버튼 UI 제거 (+ 버튼은 에디터 패널로 이동)
  - 에디터 패널 슬라이드 인덱스와 프리뷰 슬라이드 인덱스 양방향 동기화
- **Out of Scope:**
  - 슬라이드 순서 드래그 재배치 (별도 기능)
  - 무한 스크롤/루프
  - 세로 스와이프 (Reels 스타일)

---

## 2. Current Architecture

### 2.1 Preview Rendering Flow
```
EditPage
  ├── EditorPanel (left)
  │     └── SlideNavigation (sticky bottom in panel)
  └── Preview (right)
        ├── PhoneMockup
        │     └── InstagramFrame
        │           ├── Profile header
        │           ├── CardSlideRenderer (1장만 렌더)  ← 현재
        │           ├── Action bar + SlideIndicator
        │           └── Bottom nav
        └── SlideNavigation (하단 별도) ← 제거 대상
```

### 2.2 Current Issues
1. **한 장만 렌더링**: `CardSlideRenderer`가 `currentSlide` 1장만 렌더 → 스와이프 불가
2. **버튼 의존**: `SlideNavigation`(◀◀ ◀ 1/7 ▶ ▶▶)으로만 이동 가능
3. **모바일 UX 열악**: 작은 화면에서 페이지네이션 버튼이 공간 차지
4. **Export 단일 ref**: `slideRef`가 하나의 ref만 보관 → 전체 export 시 순회 필요

---

## 3. Target Architecture

### 3.1 Swipe Carousel Component
```
EditPage
  ├── EditorPanel (left)
  │     └── (+ 버튼만 유지)
  └── Preview (right)
        └── PhoneMockup
              └── InstagramFrame
                    ├── Profile header
                    ├── SwipeCarousel ← NEW
                    │     ├── CardSlideRenderer[0]
                    │     ├── CardSlideRenderer[1]
                    │     ├── ...
                    │     └── CardSlideRenderer[n]
                    ├── Action bar + SlideIndicator
                    └── Bottom nav
```

### 3.2 SwipeCarousel Spec
| Property | Value |
|----------|-------|
| 방향 | 수평 (X축) |
| 스냅 | CSS scroll-snap-type: x mandatory |
| 터치 | touch-action: pan-y로 수평 스와이프만 캡처 |
| 마우스 드래그 | pointer events로 데스크톱 드래그 지원 |
| 애니메이션 | scroll-behavior: smooth (CSS native) |
| 인덱스 동기화 | IntersectionObserver 또는 scroll event로 현재 슬라이드 감지 |

### 3.3 Implementation Strategy: CSS Scroll Snap
외부 라이브러리 없이 **CSS scroll-snap** + **pointer events**로 구현:

```css
.swipe-carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* hide scrollbar */
}
.swipe-carousel::-webkit-scrollbar { display: none; }
.swipe-carousel > * {
  flex-shrink: 0;
  scroll-snap-align: start;
}
```

장점: Zero dependency, 네이티브 성능, 접근성 내장

---

## 4. Implementation Tasks

### TASK-1: SwipeCarousel 컴포넌트 생성
- `src/components/preview/SwipeCarousel.tsx`
- Props: `slides`, `currentIndex`, `onIndexChange`, `slideWidth`, `slideHeight`, `scale`, `slideRef`
- CSS scroll-snap 기반 수평 스크롤
- 데스크톱 마우스 드래그 지원 (pointerdown/move/up)
- IntersectionObserver로 현재 보이는 슬라이드 인덱스 감지 → `onIndexChange` 호출

### TASK-2: EditPage 통합
- `InstagramFrame`의 children을 SwipeCarousel로 교체
- 모든 슬라이드 데이터를 SwipeCarousel에 전달
- `currentSlideIndex` 양방향 바인딩:
  - 에디터에서 변경 → `scrollTo`로 캐러셀 이동
  - 스와이프로 변경 → `setCurrentSlideIndex` 업데이트
- `slideRef` 배열로 변경하여 export 호환

### TASK-3: SlideNavigation 제거/간소화
- 프리뷰 하단의 `SlideNavigation` 완전 제거
- EditorPanel 내부 SlideNavigation은 유지 (에디터 측 탐색용)
- `+` (슬라이드 추가) 버튼은 EditorPanel에 이미 존재

### TASK-4: Export 호환
- `slideRef`를 배열(`slideRefs`)로 변환
- 각 CardSlideRenderer에 개별 ref 할당
- ExportButton/ExportModal이 전체 슬라이드 ref 배열 접근 가능하도록 수정

### TASK-5: Optimistic Style 로직 조정
- 현재 `localStyle`은 1장 기준 → 모든 슬라이드 렌더 시 현재 편집 중인 슬라이드만 localStyle 적용
- 나머지 슬라이드는 서버 데이터 사용

---

## 5. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 스와이프 라이브러리 | CSS scroll-snap (네이티브) | Zero dependency, 60fps, 접근성 |
| 인덱스 감지 | IntersectionObserver | scroll event throttle보다 정확하고 성능 우수 |
| 슬라이드 렌더링 | 전체 렌더 | 슬라이드 7~11장, 각각 가벼운 DOM → lazy 불필요 |
| 프로그래밍 스크롤 | `scrollTo({ left, behavior: 'smooth' })` | 에디터 인덱스 변경 시 자연스러운 이동 |

---

## 6. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| 모든 슬라이드 동시 렌더 → 성능 | Medium | 슬라이드 최대 11장, 이미지는 CSS background → 큰 부담 없음 |
| Export ref 배열 변경 | Medium | 기존 `slideRefs[0]` 패턴 → 인덱스 기반으로 리팩터 |
| 에디터↔프리뷰 인덱스 순환 참조 | High | `isUserSwiping` flag로 방향 구분, effect dependency 주의 |
| scroll-snap 브라우저 호환성 | Low | 모든 주요 브라우저 지원 (Can I Use 97%+) |

---

## 7. Acceptance Criteria

- [ ] 모바일: 터치 스와이프로 슬라이드 이동
- [ ] 데스크톱: 마우스 드래그로 슬라이드 이동
- [ ] Instagram dot indicator 클릭으로 직접 이동
- [ ] 에디터 패널에서 슬라이드 선택 시 프리뷰 자동 스크롤
- [ ] 프리뷰 스와이프 시 에디터 패널 슬라이드 인덱스 동기화
- [ ] 하단 SlideNavigation 버튼 UI 제거
- [ ] PNG/ZIP/PDF 내보내기 정상 동작
- [ ] 스타일 변경이 현재 편집 슬라이드에만 적용 (localStyle 격리)
