# Plan: Editor UX V2 - Premium Light Theme + Editor Overhaul

## Executive Summary

| Item | Detail |
|------|--------|
| Feature | Editor UX V2 - 밝은 프리미엄 테마 + 에디터 구조 전면 개편 |
| Created | 2026-03-06 |
| Theme | Light Warm (#F0EEE6 bg, #D97757 accent) |

### Value Delivered

| Perspective | Description |
|-------------|-------------|
| Problem | 다크 테마 단조로움, 에디터 섹션 평면적 나열, 자동저장 지연, 내보내기 에러, 모바일 미지원 |
| Solution | Warm Light 프리미엄 테마 + Accordion 에디터 + Optimistic UI + 반응형 전면 개편 |
| Function UX Effect | 고급스러운 편집 경험, 즉각적 미리보기 반응, 모바일 완전 지원 |
| Core Value | 프로덕션 레벨 에디터 완성도 - 사용자가 "이거 잘 만들었다"고 느끼는 수준 |

---

## Design Direction

### Color System - Warm Light

```
Background:     #F0EEE6  (warm cream)
Surface:        #FFFFFF  (pure white cards)
Surface Hover:  #F7F5EF  (slightly darker cream)
Border:         #E2DFD5  (warm gray border)
Border Active:  #D97757  (accent border)
Foreground:     #1A1A1A  (near black text)
Muted:          #8C8578  (warm gray text)
Accent:         #D97757  (terracotta orange)
Accent Hover:   #C4674A  (darker terracotta)
Accent Light:   #D97757/10  (accent 10% for backgrounds)
Danger:         #E5534B  (soft red)
```

### Typography
- 본문/UI: Pretendard (현행 유지)
- Weight 체계: Regular(400), Medium(500), Semibold(600), Bold(700)
- 에디터 라벨: 11px uppercase tracking-wide (#8C8578)

### Component Style
- 카드형 섹션: `bg-white rounded-xl shadow-sm border border-[#E2DFD5]`
- 버튼: `rounded-lg` with subtle shadow on hover
- Input: `bg-[#F7F5EF] border-[#E2DFD5] focus:border-[#D97757] focus:ring-1 focus:ring-[#D97757]/20`
- Range slider: accent-[#D97757] with custom thumb
- 전환 애니메이션: `transition-all duration-200 ease-out`

---

## Tasks

### TASK-1: Global Theme - Dark to Warm Light

**Scope**: CSS 변수 전체 교체 + Tailwind theme 업데이트

**Changes**:
- `src/app/globals.css`: `:root` 변수 전면 교체
  ```css
  :root {
    --background: #F0EEE6;
    --foreground: #1A1A1A;
    --accent: #D97757;
    --accent-hover: #C4674A;
    --surface: #FFFFFF;
    --surface-hover: #F7F5EF;
    --border: #E2DFD5;
    --muted: #8C8578;
  }
  ```
- 스크롤바 스타일 라이트 모드 대응
- `card-slide` 내부 스타일은 그대로 유지 (슬라이드 자체 색상은 프리셋으로 관리)

**Files**: `src/app/globals.css`

---

### TASK-2: Editor Panel Restructure - Accordion + Card Sections

**현재 문제**: EditorPanel이 6개 섹션을 평면적으로 나열 → 스크롤 길고 어디가 뭔지 파악 어려움

**새 구조** (Accordion 카드):
```
[Slide Nav] ─── 항상 상단 고정
┌─ Section: 콘텐츠 ─────── [펼쳐짐 기본]
│  카테고리 / 제목 / 부제 / 본문
└────────────────────────────────
┌─ Section: 스타일 ─────── [접힘]
│  폰트 선택 / 색상 프리셋 / 그라데이션
└────────────────────────────────
┌─ Section: 레이아웃 ───── [접힘]
│  9개 레이아웃 그리드
└────────────────────────────────
┌─ Section: 이미지 ─────── [접힘]
│  첨부/검색/슬라이더
└────────────────────────────────
[Slide Actions] ─── 항상 하단 고정
```

**구현 Detail**:
- Accordion state: `useState<string>("content")` (하나만 열림)
- 각 섹션 헤더: Lucide 아이콘 + 라벨 + ChevronDown 회전 애니메이션
- 열린 섹션: `max-height` transition으로 부드러운 펼침
- 슬라이드 네비게이션: sticky top, 액션 버튼: sticky bottom
- 에디터 카드: `bg-white rounded-xl p-4 shadow-sm`

**Files**: `src/components/editor/EditorPanel.tsx` (대폭 수정)

---

### TASK-3: Content Fields - Textarea + 줄바꿈 지원

**Changes**:
- `subtitle`를 `<input>` → `<textarea rows={2}>` 변경
- 모든 textarea: `resize-y` 허용 (자유로운 높이 조절)
- `category` 필드 동작 확인 및 수정 (빈 문자열 → undefined 변환 방지)
- Input 스타일: `bg-[#F7F5EF] rounded-lg border-[#E2DFD5]`

**미리보기 줄바꿈 반영**:
- CardSlideRenderer에서 `white-space: pre-line` 적용
- `.slide-title`, `.slide-subtitle`, `.slide-body` 모두 적용

**Files**: `src/components/editor/ContentFields.tsx`, `src/components/preview/CardSlideRenderer.tsx`, `src/app/globals.css`

---

### TASK-4: Text Size Tuning

**현재 → 변경** (1080x1350 캔버스 기준):
| Element | Before | After |
|---------|--------|-------|
| `.slide-category` | 14px | 20px |
| `.slide-title` | 52px | 52px (유지) |
| `.slide-subtitle` | 22px | 30px |
| `.slide-body` | 24px | 24px (유지) |

**Files**: `src/app/globals.css`

---

### TASK-5: Optimistic UI + Debounced Mutations

**핵심 전략**: 편집 시 로컬 state가 즉시 미리보기에 반영, Convex mutation은 debounce

**구현**:
1. `EditPage`에서 `localSlideOverrides` state 관리
2. ContentFields onChange → 즉시 localSlideOverrides 업데이트
3. `useDebounce` 커스텀 훅 (500ms)으로 Convex mutation 호출
4. Convex의 실시간 subscription은 유지 → 서버 확정 시 local override 제거
5. 컴포넌트 unmount 시 pending mutation flush

**미리보기 데이터 흐름**:
```
User types → localState (instant) → CardSlideRenderer (instant render)
                ↓ (500ms debounce)
            Convex mutation → Convex subscription → merge with local
```

**이미지/스타일 변경**: 빈도가 낮으므로 기존 즉시 mutation 유지

**Files**: `src/app/(app)/edit/[id]/page.tsx`, `src/components/editor/EditorPanel.tsx`

---

### TASK-6: Export SecurityError Fix

**원인**: `html-to-image`의 `toPng`가 DOM clone 시 Google Fonts CDN `<link>` stylesheet의 `cssRules` 접근 → CORS 차단

**해결**:
```typescript
const SLIDE_OPTIONS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  cacheBust: true,
  filter: (node: HTMLElement) => {
    // cross-origin stylesheet link 제외
    if (node.tagName === 'LINK' && node.getAttribute('rel') === 'stylesheet') {
      const href = node.getAttribute('href') || '';
      if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        return false;
      }
    }
    return true;
  },
};
```
- 추가: 폰트를 `@font-face`로 inline embed하여 export 시에도 폰트 유지
- fallback: filter 방식 실패 시 `skipFonts: true` 옵션

**Files**: `src/lib/export-png.ts`

---

### TASK-7: Lucide Icons - 전면 교체

**교체 대상**:

| Component | Before | After (Lucide) |
|-----------|--------|----------------|
| SlideActions | `✨` / `🗑` | `Sparkles` / `Trash2` |
| InstagramFrame action bar | `♡💬➤` | `Heart` / `MessageCircle` / `Send` |
| InstagramFrame bookmark | `☐` | `Bookmark` |
| InstagramFrame bottom nav | `⌂◎⊞▶◉` | `Home` / `Search` / `Grid3X3` / `Play` / `CircleUserRound` |
| PhoneMockup status bar | `▂▄▆█🔋` | `Signal` / `Battery` |
| Edit page top bar | `🔄 다시 생성` | `RefreshCw` |
| SlideNavigation | `+«‹›»` | `Plus` / `ChevronsLeft` / `ChevronLeft` / `ChevronRight` / `ChevronsRight` |
| ExportModal close | `✕` | `X` |
| EditorPanel accordion | (신규) | `Type` / `Palette` / `LayoutGrid` / `Image` / `ChevronDown` |

**Files**: 위 표의 모든 컴포넌트 파일

---

### TASK-8: Phone Mockup + Navigation Touch Optimization

**PhoneMockup**:
- 고정 360px → `max-w-[360px] w-full` 반응형
- 라운딩, 노치, 상태바를 더 리얼하게 (Dynamic Island 스타일)
- 배경을 라이트 테마에 맞게 조정 (외곽 그림자 강화)

**SlideNavigation (미리보기 하단)**:
- 버튼 최소 크기: `min-w-11 min-h-11` (44px 터치 타겟)
- Lucide 아이콘 사용 (TASK-7과 연동)
- 현재 슬라이드 번호: 더 눈에 띄는 pill badge 형태
- 슬라이드 추가 버튼: accent 색상 강조

**Files**: `src/components/preview/PhoneMockup.tsx`, `src/components/editor/SlideNavigation.tsx`

---

### TASK-9: Mobile Responsive Layout

**Breakpoint**: `md` (768px)

**모바일 (< 768px)**:
```
[Top Bar] ─── 간소화 (아이콘만)
[Tab: 편집 | 미리보기] ─── 탭 전환
┌─────────────────────┐
│  활성 탭 콘텐츠      │
│  (전체 너비)         │
└─────────────────────┘
[Bottom: Slide Nav]   ─── 고정 하단
```

**데스크톱 (>= 768px)**:
```
[Top Bar]
[Editor 400px | Preview flex-1]
```

**상단바 모바일 대응**:
- 프로젝트 타이틀: 말줄임
- 버튼: 아이콘만 (텍스트 숨김)
- "자동 저장" 텍스트 → 저장 상태 아이콘

**Files**: `src/app/(app)/edit/[id]/page.tsx`

---

## Implementation Order

```
Phase 1 - Foundation (독립 작업, 병렬 가능)
├── TASK-1: Global Theme (CSS 변수)
├── TASK-6: Export Fix
└── TASK-4: Text Size

Phase 2 - Editor Core
├── TASK-7: Lucide Icons (전면 교체)
├── TASK-3: Textarea + 줄바꿈
└── TASK-2: Accordion Editor

Phase 3 - Performance + Polish
├── TASK-5: Optimistic UI + Debounce
├── TASK-8: Mockup + Touch
└── TASK-9: Mobile Responsive
```

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| 라이트 테마 전환 시 카드 슬라이드 색상 충돌 | 높음 | 카드 내부는 독립 스타일 (프리셋) 유지, UI 테마만 변경 |
| Export font inline화 복잡도 | 중간 | filter 방식 우선, inline은 phase 2 |
| Accordion 접힘으로 편집 흐름 방해 | 낮음 | 콘텐츠 섹션 기본 펼침, 마지막 열린 섹션 기억 |
| Debounce 중 unmount 시 데이터 유실 | 낮음 | cleanup에서 flush |

## Out of Scope
- 대시보드/설정 페이지 테마 변경 (이번은 편집 페이지 + globals만)
- 드래그앤드롭 슬라이드 재정렬
- 슬라이드 썸네일 스트립
- 다크/라이트 테마 토글 (라이트 고정)
