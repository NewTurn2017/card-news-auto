# Plan: AI 카드뉴스 자동 생성 웹 플랫폼

**기반 리서치**: .vibe/001_card_news_auto_platform.md
**생성일**: 2026-03-05
**상태**: APPROVED
**승인 여부**: ✓ 승인 (2026-03-05)

---

## 0. 목표 & 비목표
<!-- MEMO: -->

### 목표
- 텍스트를 입력하면 Gemini 3.1 Flash-Lite가 카드뉴스 HTML을 자동 생성
- 4:5 비율 실시간 프리뷰 (인스타그램 스타일 iPhone 목업)
- 9종 CSS 레이아웃 템플릿 선택 & 편집
- PNG 이미지 내보내기
- 프로젝트 저장/목록 관리 (localStorage MVP)

### 비목표 (MVP에서 제외)
- 멀티유저/인증 (개인 도구로 시작)
- 서버 DB (Supabase/Convex는 향후)
- AI 이미지 생성 (이미지는 첨부/검색만)
- 모바일 반응형 (데스크톱 전용)
- 다국어 지원

---

## 1. 변경 파일 목록 (생성할 파일)
<!-- MEMO: -->

### Phase 1: 프로젝트 초기화 & 기반
```
card-news-auto/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.local                          # GEMINI_API_KEY
├── .gitignore
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # 루트 레이아웃 (다크 테마, 폰트, 사이드바)
│   │   ├── globals.css                 # Tailwind + 커스텀 CSS 변수
│   │   ├── page.tsx                    # 메인 (카드뉴스 만들기 빈 상태)
│   │   ├── create/
│   │   │   └── page.tsx                # 입력 폼 (텍스트/URL/피드)
│   │   ├── edit/
│   │   │   └── [id]/
│   │   │       └── page.tsx            # 편집기 (좌: 컨트롤, 우: 프리뷰)
│   │   ├── projects/
│   │   │   └── page.tsx                # 작업 목록 그리드
│   │   └── api/
│   │       ├── generate/
│   │       │   └── route.ts            # Gemini 카드뉴스 생성 (SSE)
│   │       ├── crawl/
│   │       │   └── route.ts            # URL 본문 크롤링
│   │       └── feed/
│   │           └── route.ts            # RSS 피드 파싱
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx             # 좌측 네비게이션
│   │   ├── create/
│   │   │   ├── TextInput.tsx           # 텍스트 붙여넣기
│   │   │   ├── UrlInput.tsx            # URL 입력
│   │   │   └── NewsFeedList.tsx        # 뉴스 피드 목록
│   │   ├── generate/
│   │   │   └── GenerationProgress.tsx  # 2단계 진행 표시
│   │   ├── editor/
│   │   │   ├── EditorPanel.tsx         # 좌측 편집 패널
│   │   │   ├── SlideNavigation.tsx     # 슬라이드 이전/다음
│   │   │   ├── ContentFields.tsx       # 카테고리/제목/부제
│   │   │   ├── ColorPresets.tsx        # 밝은/어두운 토글
│   │   │   ├── LayoutSelector.tsx      # 9종 레이아웃 그리드
│   │   │   ├── ImageControls.tsx       # 이미지 첨부/검색 + 조절
│   │   │   └── SlideActions.tsx        # 슬라이드 개선/삭제
│   │   ├── preview/
│   │   │   ├── PhoneMockup.tsx         # iPhone 프레임
│   │   │   ├── InstagramFrame.tsx      # 인스타그램 UI 장식
│   │   │   ├── CardSlideRenderer.tsx   # HTML 슬라이드 렌더링
│   │   │   └── SlideIndicator.tsx      # 도트 인디케이터
│   │   └── projects/
│   │       ├── ProjectGrid.tsx         # 프로젝트 카드 그리드
│   │       └── ProjectCard.tsx         # 개별 카드
│   │
│   ├── lib/
│   │   ├── gemini.ts                   # Gemini SDK 래퍼
│   │   ├── prompts.ts                  # 프롬프트 템플릿 (기획/HTML 생성)
│   │   ├── storage.ts                  # localStorage CRUD
│   │   ├── export-png.ts              # html-to-image 래퍼
│   │   └── sanitize.ts                # DOMPurify HTML sanitize
│   │
│   ├── store/
│   │   └── card-news-store.ts         # Zustand 전역 상태
│   │
│   ├── types/
│   │   └── index.ts                    # CardNewsProject, CardSlide, LayoutTemplate 등
│   │
│   └── data/
│       ├── layouts.ts                  # 9종 레이아웃 정의 (id, name, CSS)
│       └── presets.ts                  # 색상 프리셋 정의
│
└── public/
    └── fonts/                          # Pretendard 웹폰트 (셀프 호스팅)
```

**총 파일 수**: ~40개

---

## 2. 파일별 수정 내용 (Phase별 구현 순서)
<!-- MEMO: -->

### Phase 1: 프로젝트 셋업 + 핵심 타입 (작업 1-3)

#### 작업 1: Next.js 프로젝트 초기화
- `npx create-next-app@latest` (App Router, TypeScript, Tailwind, src/)
- shadcn/ui 초기화 (`npx shadcn@latest init`)
- 다크 테마 기본 설정
- 의존성 설치: `@google/genai`, `zustand`, `html-to-image`, `dompurify`

#### 작업 2: 타입 & 데이터 정의
- `src/types/index.ts` — CardNewsProject, CardSlide, LayoutTemplate, ColorPreset
- `src/data/layouts.ts` — 9종 레이아웃 (id, name, css class, slot 배치)
- `src/data/presets.ts` — light/dark 색상 프리셋

#### 작업 3: 전역 스타일 & 레이아웃
- `src/app/globals.css` — CSS 변수 (색상, 카드 크기), 다크 테마
- `src/app/layout.tsx` — Pretendard 폰트, 사이드바 레이아웃
- `src/components/layout/Sidebar.tsx` — 4개 아이콘 네비게이션

### Phase 2: Gemini 연동 + 생성 플로우 (작업 4-6)

#### 작업 4: Gemini API 백엔드
- `src/lib/gemini.ts` — GoogleGenAI 클라이언트 초기화
- `src/lib/prompts.ts` — 기획 프롬프트 + HTML 생성 프롬프트
- `src/app/api/generate/route.ts` — SSE 스트리밍 엔드포인트
  - 1단계: 텍스트 → JSON 구조화 (Structured Output)
  - 2단계: 각 슬라이드 → HTML 생성
  - 실시간 progress 이벤트 전송

#### 작업 5: 카드뉴스 만들기 페이지
- `src/app/page.tsx` — 빈 상태 CTA ("+ 새 카드뉴스 만들기")
- `src/app/create/page.tsx` — 텍스트 입력 폼
  - `src/components/create/TextInput.tsx` — textarea + "카드뉴스 만들기" 버튼
- `src/components/generate/GenerationProgress.tsx` — 2단계 진행 표시
  - 카드뉴스 기획 (분석중/완료) → 카드 작성 (대기중/작성중/완료)
  - 프로그레스 바 + 취소 버튼

#### 작업 6: Zustand 상태 관리
- `src/store/card-news-store.ts`
  - project, currentSlideIndex, generationStatus
  - updateSlide, setLayout, setColorPreset, addSlide, removeSlide
  - saveProject (localStorage), loadProject

### Phase 3: 편집기 + 프리뷰 (작업 7-10) ← 핵심

#### 작업 7: 카드 슬라이드 렌더러
- `src/components/preview/CardSlideRenderer.tsx`
  - 1080x1350px 원본 크기 div
  - CSS transform scale()로 프리뷰 크기 축소
  - `dangerouslySetInnerHTML` + DOMPurify sanitize
  - 레이아웃 CSS class 적용
  - 색상 프리셋 CSS 변수 적용
- `src/lib/sanitize.ts` — DOMPurify 래퍼 (허용 태그/속성 화이트리스트)

#### 작업 8: iPhone 목업 프리뷰
- `src/components/preview/PhoneMockup.tsx` — iPhone 프레임 CSS (border-radius, notch)
- `src/components/preview/InstagramFrame.tsx` — 프로필 헤더, 좋아요/댓글 바, 하단 네비게이션
- `src/components/preview/SlideIndicator.tsx` — 도트 네비게이션

#### 작업 9: 편집 패널
- `src/components/editor/EditorPanel.tsx` — 전체 좌측 패널
- `src/components/editor/SlideNavigation.tsx` — `+ ← 1/7 →` UI
- `src/components/editor/ContentFields.tsx` — 카테고리/제목/부제 input
- `src/components/editor/ColorPresets.tsx` — 밝은/어두운 버튼 토글
- `src/components/editor/LayoutSelector.tsx` — 3x3 미니 썸네일 그리드
- `src/components/editor/SlideActions.tsx` — 슬라이드 개선(AI)/삭제

#### 작업 10: 편집 페이지 조립
- `src/app/edit/[id]/page.tsx`
  - 좌측: EditorPanel (스크롤 가능)
  - 우측: PhoneMockup > InstagramFrame > CardSlideRenderer
  - 상단: 브레드크럼 + 저장/다시생성/내보내기(PNG)
  - 하단: 슬라이드 페이지네이션

### Phase 4: PNG 내보내기 + 저장 (작업 11-12)

#### 작업 11: PNG 내보내기
- `src/lib/export-png.ts`
  - html-to-image의 `toPng()` 사용
  - 1080x1350px 원본 크기로 캡처
  - 웹폰트 사전 로드 확인 후 캡처
  - 다운로드 트리거 (a tag + blob URL)

#### 작업 12: 프로젝트 저장 & 목록
- `src/lib/storage.ts` — localStorage CRUD (projects 배열)
  - saveProject, loadProject, listProjects, deleteProject
- `src/app/projects/page.tsx` — 프로젝트 그리드
- `src/components/projects/ProjectGrid.tsx` — 카드 그리드 (3열)
- `src/components/projects/ProjectCard.tsx` — 썸네일 + 제목 + 날짜

### Phase 5: URL 크롤링 + 뉴스 피드 (작업 13-14)

#### 작업 13: URL 크롤링
- `src/app/api/crawl/route.ts` — fetch → Readability 파싱 → 본문 텍스트 반환
- `src/components/create/UrlInput.tsx` — URL 입력 + "가져오기" 버튼

#### 작업 14: 뉴스 피드
- `src/app/api/feed/route.ts` — RSS 파싱 (rss-parser)
- `src/components/create/NewsFeedList.tsx` — 피드 아이템 목록
- 기본 RSS 소스: 매일경제, 조선일보, IT 뉴스 등 (하드코딩 MVP)

### Phase 6: 이미지 관리 (작업 15)

#### 작업 15: 이미지 첨부 & 조절
- `src/components/editor/ImageControls.tsx`
  - 첨부 이미지: file input → base64/blob URL
  - 검색 이미지: Unsplash API 연동 (향후)
  - 이미지 조절: opacity slider, position, size, object-fit

---

## 3. 타입/인터페이스 변경
<!-- MEMO: -->

### 핵심 타입 (`src/types/index.ts`)

```typescript
// 카드뉴스 프로젝트
export interface CardNewsProject {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceText: string;
  sourceUrl?: string;
  slides: CardSlide[];
  settings: ProjectSettings;
}

// 개별 슬라이드
export interface CardSlide {
  id: string;
  order: number;
  type: 'cover' | 'content' | 'ending';
  layoutId: string;
  colorPreset: 'light' | 'dark';
  content: SlideContent;
  image?: SlideImage;
  htmlContent: string;
}

export interface SlideContent {
  category?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  source?: string;
}

export interface SlideImage {
  url: string;
  opacity: number;        // 0-100
  position: { x: number; y: number };
  size: number;            // percentage
  fit: 'cover' | 'contain' | 'fill';
}

// 프로젝트 설정
export interface ProjectSettings {
  profileName: string;
  profileAvatar?: string;
}

// 레이아웃 템플릿
export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  // CSS class name (Tailwind/custom)
  className: string;
  // 텍스트 배치 정보
  textPosition: 'top' | 'center' | 'bottom' | 'left' | 'right';
  textAlign: 'left' | 'center' | 'right';
}

// 색상 프리셋
export interface ColorPreset {
  id: 'light' | 'dark';
  name: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  subtextColor: string;
}

// Gemini 생성 요청/응답
export interface GenerateRequest {
  sourceText: string;
  slideCount?: number;
}

export interface GenerateEvent {
  type: 'phase' | 'slide' | 'complete' | 'error';
  phase?: 'planning' | 'writing';
  progress?: number;
  slideIndex?: number;
  data?: any;
}
```

---

## 4. 마이그레이션 & 호환성
<!-- MEMO: -->

- **그린필드 프로젝트** → 마이그레이션 불필요
- Node.js >= 20 (Next.js 15 요구)
- `@google/genai` SDK — preview 모델이므로 API 변경 가능성 있음
  - 완화: `src/lib/gemini.ts`에 래퍼를 두어 모델 교체 용이하게

---

## 5. 테스트 전략
<!-- MEMO: -->

### MVP 테스트 (수동)
- [ ] 텍스트 입력 → Gemini 생성 → 7장 슬라이드 생성 확인
- [ ] 각 슬라이드 프리뷰 4:5 비율 정확한지 확인
- [ ] 레이아웃 변경 시 프리뷰 즉시 반영
- [ ] 색상 프리셋 변경 시 반영
- [ ] 텍스트 편집 후 프리뷰 반영
- [ ] PNG 내보내기 → 1080x1350px 이미지 확인
- [ ] 프로젝트 저장 → 새로고침 → 목록에서 로드
- [ ] XSS 테스트: Gemini 출력에 `<script>` 포함 시 sanitize 확인

### 향후 자동화
- Vitest: 유틸 함수 (sanitize, storage, prompts)
- Playwright: E2E (생성 → 편집 → 내보내기 플로우)

---

## 6. 롤백 전략
<!-- MEMO: -->

- **그린필드** → git commit 단위로 롤백
- 각 Phase 완료 시 커밋
- Gemini API 장애 시: 에러 메시지 + 재시도 버튼으로 대응
- localStorage 데이터 손실: 내보내기(JSON) 기능 추가 고려 (P2)

---

## 7. 대안 & 트레이드오프
<!-- MEMO: -->

### 결정 1: HTML 렌더링 vs Canvas 렌더링
| | HTML (선택) | Canvas |
|--|------------|--------|
| 장점 | CSS로 스타일링 자유, 웹폰트 자연스러움, Gemini가 직접 생성 가능 | 픽셀 단위 제어, PNG 변환 확실 |
| 단점 | html-to-image 변환 시 불일치 가능 | LLM이 Canvas API 생성 어려움, 개발 복잡 |
| **결론** | HTML이 LLM 친화적이고 CSS 레이아웃 시스템과 자연스럽게 결합 |

### 결정 2: Gemini 2단계 vs 1단계 생성
| | 2단계 (선택) | 1단계 |
|--|-------------|-------|
| 장점 | 구조화 품질 높음, 에러 격리, 편집 유연성 | API 호출 1회, 빠름 |
| 단점 | API 2회 호출, 시간 소요 | 출력 불안정, 편집 어려움 |
| **결론** | 2단계가 편집기 UX에 필수 (구조화 데이터 → 개별 필드 편집) |

### 결정 3: 레이아웃 시스템 — CSS class vs Gemini HTML 직접 생성
| | CSS class (선택) | Gemini HTML 직접 |
|--|-----------------|------------------|
| 장점 | 레이아웃 변경 시 HTML 재생성 불필요, 예측 가능 | 더 다양한 표현 |
| 단점 | 레이아웃 수 제한적 | 레이아웃 변경 = 재생성 필요, 불안정 |
| **결론** | CSS class 방식이 편집 UX에 적합. Gemini는 콘텐츠만 생성. |

### 결정 4: 저장소 — localStorage vs 서버 DB
| | localStorage (선택) | Supabase/Convex |
|--|---------------------|-----------------|
| 장점 | 즉시 구현, 서버 불필요, 개인 도구 | 멀티디바이스, 백업 |
| 단점 | 용량 제한 (~5MB), 브라우저 종속 | 인증 필요, 복잡도 증가 |
| **결론** | MVP는 localStorage. 이미지 base64가 크면 IndexedDB 전환 고려. |

---

## 8. 핵심 의사결정 질문
<!-- MEMO: -->

### Q1: 카드뉴스 레이아웃 — Gemini가 HTML을 직접 생성할까, 구조화 데이터만 생성할까?

**확정: C) 하이브리드 (최대 유연성)**
1. Gemini 1단계: **구조화 JSON** 생성 (category, title, subtitle, body)
2. 프론트엔드: **CSS 레이아웃 템플릿**에 데이터 주입 → 즉시 렌더링
3. "슬라이드 개선" 버튼: Gemini가 **HTML을 직접 재생성**하여 더 자유로운 표현 가능
4. 레이아웃 변경 = CSS class 교체 (즉시), AI 개선 = HTML 재생성 (API 호출)

### Q2: 프리뷰 스케일

**제안**: 원본 1080x1350px div를 `transform: scale(0.3)` 정도로 축소하여 iPhone 프레임 안에 표시
- 편집 시에는 원본 크기 유지, CSS transform으로만 시각적 축소

### Q3: 슬라이드 수 기본값

**제안**: 7장 (커버 1 + 본문 5 + 마무리 1)
- 사용자가 생성 시 슬라이드 수 조절 가능

### Q4: Gemini API 키 관리

**제안**: `.env.local`에 `GEMINI_API_KEY` 저장, Next.js API Route에서만 사용
- 클라이언트에는 절대 노출하지 않음

---

## 승인 체크리스트

- [x] research.md 최신화 완료
- [x] 목표/비목표 명시 완료
- [x] 변경 파일 경로 확정
- [x] 테스트 전략 확정
- [x] 롤백 전략 확정
- [x] 핵심 의사결정 질문 모두 응답 (Q1: 하이브리드 확정)
- [ ] **개발자 최종 승인**: ☐

**승인 후 `/vibe-implement` 로 구현 시작**
