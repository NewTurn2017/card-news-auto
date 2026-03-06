# Inline Edit Toolbox (미리보기 인라인 편집 도구상자)

## Executive Summary

| Item | Detail |
|------|--------|
| Feature | 미리보기에서 텍스트 요소 클릭 시 플로팅 도구상자로 즉시 편집 |
| Date | 2026-03-07 |
| Estimated Scope | Medium (신규 컴포넌트 2~3개 + 기존 파일 3개 수정) |

### Value Delivered

| Perspective | Description |
|-------------|-------------|
| Problem | 사이드 패널에 스타일 설정이 밀집되어 원하는 항목을 찾기 어렵고, 미리보기와 편집 간 시선 이동이 큼 |
| Solution | 미리보기에서 제목/부제/본문을 클릭하면 해당 요소 옆에 플로팅 도구상자가 나타나 글씨 크기, 행간, 자간, 색상을 바로 조절 |
| Function UX Effect | 편집 단계가 4단계 → 1단계로 단축. 텍스트 스니펫(네이밍) 저장/삽입으로 반복 입력 제거 |
| Core Value | "보이는 곳에서 바로 고친다" — 직관적 WYSIWYG 편집 경험 |

---

## 1. Background & Problem

현재 에디터 구조:
- **사이드 패널 (420px)**: 콘텐츠, 스타일, 레이아웃, 이미지 4개 아코디언
- **스타일 섹션**: 폰트, 글씨 크기(4개), 행간(3개), 자간(3개), 색상(4개), 배경, 프리셋 — 총 14+ 슬라이더/피커
- **미리보기**: 읽기 전용, 클릭 불가

문제점:
1. 스타일 슬라이더가 많아 원하는 항목을 찾기 어렵다
2. 사이드 패널에서 조절 → 미리보기 확인의 시선 왕복이 비효율적
3. "이 제목의 행간만 바꾸고 싶다" 같은 단일 작업에 전체 스타일 패널을 열어야 함
4. 자주 쓰는 텍스트(브랜드명, 출처 등)를 매번 새로 입력해야 함

## 2. Goal

- 미리보기에서 텍스트 요소(제목/부제/본문) 클릭 시 **플로팅 도구상자** 표시
- 도구상자에서 해당 요소의 핵심 속성(텍스트 편집, 크기, 행간, 자간, 색상)을 즉시 조절
- **텍스트 스니펫 라이브러리**: 자주 쓰는 텍스트를 저장하고 원클릭 삽입
- 기존 사이드 패널은 유지 (고급 설정용), 도구상자는 빠른 접근용

## 3. Scope

### 3.1 In Scope

| # | Item | Description |
|---|------|-------------|
| 1 | InteractiveSlideOverlay | 미리보기 위에 클릭 가능한 투명 오버레이 레이어 |
| 2 | InlineToolbox 컴포넌트 | 선택된 요소 옆에 뜨는 플로팅 도구상자 |
| 3 | TextSnippets 시스템 | 자주 쓰는 텍스트 저장/삽입 (Convex DB + UI) |
| 4 | EditPage 통합 | 미리보기 영역에 오버레이 + 도구상자 연결 |

### 3.2 Out of Scope (Phase 1)

- 드래그로 텍스트 위치 이동
- 미리보기에서 직접 타이핑 (contentEditable) — 복잡도 높음, Phase 2 고려
- 이미지 관련 인라인 편집
- 모바일 대응 (데스크톱 우선)

## 4. UX Design

### 4.1 인터랙션 플로우

```
[미리보기] 제목 영역 클릭
  → 제목에 선택 하이라이트 (파란색 테두리)
  → 제목 옆에 플로팅 도구상자 표시
    ┌─────────────────────────────┐
    │ 📝 제목                     │
    │ ┌─────────────────────────┐ │
    │ │ 텍스트 입력 필드         │ │
    │ └─────────────────────────┘ │
    │ 크기: ──●──────── 52px      │
    │ 행간: ──────●──── 1.3       │
    │ 자간: ────●────── 0px       │
    │ 색상: [■] #ffffff           │
    │                             │
    │ 📋 스니펫  [+ 저장]         │
    │ ┌───────┐ ┌───────┐        │
    │ │브랜드명│ │ @출처 │ ...    │
    │ └───────┘ └───────┘        │
    └─────────────────────────────┘

[빈 영역 클릭] → 도구상자 닫힘
[다른 요소 클릭] → 해당 요소로 전환
```

### 4.2 도구상자 구성

| Section | Controls | Description |
|---------|----------|-------------|
| 텍스트 | textarea | 현재 텍스트 인라인 수정 |
| 크기 | range slider | 해당 요소의 fontSize |
| 행간 | range slider | lineHeight |
| 자간 | range slider | letterSpacing |
| 색상 | color picker | 해당 요소 색상 |
| 스니펫 | chip buttons + 저장 | 저장된 텍스트 원클릭 삽입/추가 |

### 4.3 선택 상태 표시

- 선택된 요소: `outline: 2px solid accent` + 약간의 glow
- 호버 상태: `outline: 1px dashed accent/50`
- 비선택: 변화 없음

## 5. Technical Approach

### 5.1 Architecture

```
EditPage
├── EditorPanel (기존, 변경 최소)
└── Preview Area
    ├── PhoneMockup
    │   └── InstagramFrame
    │       └── SwipeCarousel
    │           └── CardSlideRenderer (export용 — 변경 없음)
    └── InteractiveSlideOverlay (NEW - 클릭 감지 레이어)
        └── InlineToolbox (NEW - 플로팅 도구상자)
```

**핵심 설계 결정**: `CardSlideRenderer`는 PNG export에도 사용되므로 수정하지 않는다. 대신 미리보기 위에 투명한 `InteractiveSlideOverlay`를 absolute positioning으로 겹쳐 놓고, 각 텍스트 영역의 위치를 계산하여 클릭 영역을 매핑한다.

### 5.2 InteractiveSlideOverlay

- 미리보기 컨테이너 위에 `position: absolute` + `inset: 0`으로 배치
- 레이아웃별로 제목/부제/본문의 대략적 영역을 CSS로 정의
- 클릭 시 `selectedElement: "title" | "subtitle" | "body" | null` 상태 변경
- `pointer-events: none`은 기본, 각 영역만 `pointer-events: auto`

### 5.3 InlineToolbox

- `position: absolute` — 선택된 요소 옆에 배치
- 방향: 요소 위치에 따라 자동 결정 (위/아래/좌/우)
- 슬라이더/색상 변경 → 기존 `handleStyleChange` 호출 (EditorPanel과 동일 로직)
- 텍스트 변경 → 기존 `handleContentChange` 호출
- 바깥 클릭 시 닫힘 (`useClickOutside`)

### 5.4 TextSnippets 시스템

**Convex Schema 추가:**
```typescript
textSnippets: defineTable({
  userId: v.id("users"),
  label: v.string(),      // 표시 이름 ("브랜드명", "@출처")
  text: v.string(),        // 삽입할 텍스트
  order: v.number(),       // 정렬 순서
  createdAt: v.number(),
}).index("by_userId", ["userId"])
```

**기능:**
- 도구상자 하단에 저장된 스니펫 chip 표시
- chip 클릭 → 현재 선택된 텍스트 필드에 삽입 (append 또는 replace 선택)
- [+ 저장] → 현재 텍스트를 스니펫으로 저장
- 스니펫 관리 (삭제/순서 변경)는 설정 페이지 또는 도구상자 내 편집 모드

### 5.5 New Files

| File | Description |
|------|-------------|
| `src/components/preview/InteractiveSlideOverlay.tsx` | 클릭 감지 오버레이 |
| `src/components/preview/InlineToolbox.tsx` | 플로팅 도구상자 UI |
| `convex/textSnippets.ts` | 스니펫 CRUD mutations/queries |

### 5.6 Modified Files

| File | Change |
|------|--------|
| `convex/schema.ts` | `textSnippets` 테이블 추가 |
| `src/app/(app)/edit/[id]/page.tsx` | 오버레이+도구상자 상태 관리, Preview 영역에 오버레이 추가 |
| `src/types/index.ts` | TextSnippet 타입 추가 (optional) |

## 6. Implementation Order

1. `convex/schema.ts` + `convex/textSnippets.ts` — 스니펫 DB
2. `src/components/preview/InlineToolbox.tsx` — 도구상자 컴포넌트
3. `src/components/preview/InteractiveSlideOverlay.tsx` — 클릭 감지 오버레이
4. `src/app/(app)/edit/[id]/page.tsx` — 통합 및 상태 관리
5. 빌드 검증 + 수동 테스트

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| 텍스트 영역 위치 계산이 레이아웃별로 다름 | 레이아웃 CSS 클래스 기반으로 영역 매핑, 또는 getBoundingClientRect 동적 계산 |
| 도구상자가 미리보기 영역을 벗어남 | 화면 경계 감지 + 방향 자동 전환 |
| scale된 미리보기에서 좌표 변환 | previewScale을 역으로 적용하여 보정 |
| 스와이프 제스처와 클릭 이벤트 충돌 | pointerdown → pointermove 감지로 swipe vs click 구분 |
| CardSlideRenderer 수정 없이 요소 위치 감지 | ref를 통한 DOM querySelector 또는 data-* 속성 활용 |

## 8. Phase 2 고려사항 (Future)

- **contentEditable 직접 편집**: 도구상자 텍스트 필드 대신 미리보기에서 직접 타이핑
- **드래그 이동**: 텍스트 요소 위치 커스터마이징
- **이미지 인라인 편집**: 이미지 클릭 시 opacity/position 도구상자
- **모바일 대응**: 하단 시트 형태의 도구상자
- **키보드 단축키**: Esc 닫기, Tab 다음 요소, 방향키 미세 조절
