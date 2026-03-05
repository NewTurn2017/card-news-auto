# Research: AI 카드뉴스 자동 생성 웹 플랫폼

**생성일**: 2026-03-05
**인덱스**: 001
**상태**: research-only (코드 변경 없음)

---

## 1. 프로젝트 개요 & 참조 UI 분석

### 1.1 핵심 컨셉
- 텍스트/URL/뉴스피드를 입력하면 **Gemini 3.1 Flash** LLM이 카드뉴스용 HTML 콘텐츠를 자동 생성
- 생성된 카드뉴스를 **4:5 비율** (인스타그램 규격) 실시간 프리뷰로 확인
- 미리 만들어진 **다양한 CSS 레이아웃 템플릿** 중 선택하여 적용
- 텍스트, 색상, 이미지, 레이아웃 등을 편집기에서 수정 가능
- 최종 결과물을 **PNG 이미지**로 내보내기

### 1.2 참조 UI 스크린샷 분석 (8장)

#### 화면 1: 편집 화면 (Edit View)
- **좌측 패널**: 편집 컨트롤
  - 상단: 브레드크럼 (목록 > 카드뉴스 만들기 > 편집)
  - 저장 / 다시 생성 / 내보내기(PNG) 버튼
  - 슬라이드 네비게이션: `+ ← 1/7 →`
  - 필드: 카테고리, 제목, 부제
  - 색상 프리셋 (밝은 배경 / 어두운 배경)
  - 레이아웃 선택 (3x3 그리드 형태, 9가지 배치 옵션)
  - 이미지: 첨부 이미지 / 자동 이미지 / 검색 이미지
  - 슬라이드 개선 / 슬라이드 삭제 버튼
- **우측 패널**: iPhone 목업 프레임 안에 4:5 인스타그램 스타일 프리뷰
  - 상단: 프로필 (아바타 + 계정명)
  - 카드뉴스 본문 (4:5 비율)
  - 하단: 좋아요/댓글/공유 아이콘 + "좋아요 1,234개"
  - 슬라이드 인디케이터 도트
  - 인스타그램 하단 네비게이션 바
- **하단**: 슬라이드 페이지네이션 `« ← 1/7 → »`

#### 화면 2: 작업 목록 (List View)
- 카드 그리드 레이아웃 (3열)
- 각 카드: 썸네일 이미지 + 제목 (말줄임) + 날짜
- 우측에 선택된 카드의 iPhone 프리뷰
- 좌측 사이드바: + 새로 만들기, 작업목록, 카드뉴스, 설정 아이콘

#### 화면 3: 카드뉴스 만들기 (빈 상태)
- 중앙 정렬: "카드뉴스 만들기" 제목
- 부제: "텍스트를 입력하면 AI가 자동으로 카드뉴스를 만들어드립니다"
- CTA 버튼: "+ 새 카드뉴스 만들기" (민트/시안 색상)

#### 화면 4: 카드뉴스 만들기 (입력 옵션)
- **텍스트 붙여넣기**: 블로그 글, 기사, 메모 등 긴본 텍스트를 붙여넣기
- **카드뉴스 만들기** 버튼 (민트색, 전체 폭)
- **에시로 시작하기**: 샘플 카드뉴스 불러오기
- **오늘의 뉴스 가져오기**: 접기/펼치기, "피드 수집 중..." 로딩
- **피드에서 선택**: RSS 피드 선택
- **URL 가져오기**: (하단에 일부 보임)

#### 화면 5: 뉴스 피드 목록
- 매일경제 등 뉴스 소스에서 가져온 기사 목록
- 각 항목: 소스명 + 날짜 + 제목 + 요약 2줄
- 클릭하여 선택 → 카드뉴스 생성 소스로 사용

#### 화면 6: AI 생성 진행 화면
- "AI가 카드뉴스를 만들고 있어요"
- "잠시만 기다려주세요"
- 2단계 진행 표시:
  1. 카드뉴스 기획 → "분석중" (활성)
  2. 카드 작성 → "대기중"
- 프로그레스 바
- 취소 버튼
- "GPU 로그 보기" 링크

#### 화면 7: 편집 화면 (커버 슬라이드)
- 화면 1과 동일 구조
- 카드뉴스 커버: 어두운 배경에 큰 제목 텍스트

#### 화면 8: 편집 화면 (이미지 적용)
- 배경 이미지가 적용된 카드
- 이미지 컨트롤: 투명도 슬라이더, 위치 조절
- "채우기" 옵션, 이미지 크기 100%

---

## 2. 기능 요구사항 맵

### 2.1 콘텐츠 입력 (Content Input)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 텍스트 직접 입력 | textarea에 긴 텍스트 붙여넣기 | P0 |
| URL 가져오기 | URL에서 기사/블로그 본문 크롤링 | P1 |
| 뉴스 피드 | RSS/API로 오늘의 뉴스 목록 불러오기 | P1 |
| 피드 선택 | 등록된 RSS 피드 소스 선택 | P2 |
| 샘플/예시 | 데모용 샘플 카드뉴스 로드 | P2 |

### 2.2 AI 생성 (AI Generation)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 텍스트 → 카드뉴스 구조화 | Gemini 3.1 Flash로 슬라이드 분할 + HTML 생성 | P0 |
| 진행 상태 표시 | 2단계 (기획→작성) 프로그레스 | P0 |
| 다시 생성 | 같은 입력으로 재생성 | P1 |
| 취소 | 생성 중 취소 | P1 |

### 2.3 편집기 (Editor)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 슬라이드 네비게이션 | 1/N 형태, 이전/다음/처음/끝 | P0 |
| 텍스트 편집 | 카테고리, 제목, 부제 수정 | P0 |
| 색상 프리셋 | 밝은/어두운 배경 토글 | P0 |
| 레이아웃 선택 | 9가지 배치 템플릿 중 선택 | P0 |
| 이미지 관리 | 첨부/자동생성/검색 이미지 | P1 |
| 이미지 조절 | 투명도, 위치, 크기, 채우기 모드 | P1 |
| 슬라이드 추가/삭제 | +버튼으로 추가, 삭제 버튼 | P1 |
| 슬라이드 개선 | AI로 개별 슬라이드 개선 요청 | P2 |

### 2.4 프리뷰 (Preview)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 4:5 실시간 프리뷰 | 편집 내용 즉시 반영 | P0 |
| iPhone 목업 프레임 | 인스타그램 UI 모방 | P1 |
| 슬라이드 인디케이터 | 도트 네비게이션 | P1 |

### 2.5 내보내기 & 저장 (Export & Save)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| PNG 내보내기 | 슬라이드를 이미지로 변환 | P0 |
| 프로젝트 저장 | 작업 상태 저장 | P0 |
| 작업 목록 | 저장된 프로젝트 그리드 뷰 | P1 |

---

## 3. 기술 아키텍처 분석

### 3.1 추천 기술 스택

```
Frontend:
├── Next.js 15 (App Router)        # React 프레임워크
├── TypeScript                      # 타입 안정성
├── Tailwind CSS 4                  # 유틸리티 CSS
├── shadcn/ui                       # UI 컴포넌트
├── Zustand                         # 상태 관리 (편집기 상태)
└── html-to-image (dom-to-image-more) # HTML→PNG 변환

Backend (Next.js API Routes):
├── Google Generative AI SDK        # Gemini 3.1 Flash 호출
├── Cheerio / Mozilla Readability   # URL 본문 크롤링
└── RSS Parser                      # 뉴스 피드 파싱

Storage:
├── localStorage / IndexedDB        # 클라이언트 저장 (MVP)
└── (향후) Supabase / Convex        # 서버 저장소
```

### 3.2 핵심 데이터 모델

```typescript
// 카드뉴스 프로젝트
interface CardNewsProject {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceText: string;           // 원본 입력 텍스트
  sourceUrl?: string;           // 원본 URL (있으면)
  slides: CardSlide[];
  settings: ProjectSettings;
}

// 개별 슬라이드
interface CardSlide {
  id: string;
  order: number;
  type: 'cover' | 'content' | 'ending';
  layoutId: string;             // 레이아웃 템플릿 ID
  colorPreset: 'light' | 'dark';
  content: {
    category?: string;
    title?: string;
    subtitle?: string;
    body?: string;
    source?: string;
  };
  image?: {
    url: string;
    opacity: number;            // 0-100
    position: { x: number; y: number };
    size: number;               // percentage
    fit: 'cover' | 'contain' | 'fill';
  };
  htmlContent: string;          // Gemini가 생성한 HTML (최종 렌더링용)
}

// 프로젝트 설정
interface ProjectSettings {
  profileName: string;
  profileAvatar?: string;
  aspectRatio: '4:5';          // 인스타그램 기본
}

// 레이아웃 템플릿
interface LayoutTemplate {
  id: string;
  name: string;
  thumbnail: string;            // 미리보기 이미지
  css: string;                  // 레이아웃 CSS
  slots: LayoutSlot[];          // 텍스트/이미지 배치 영역
}

interface LayoutSlot {
  type: 'category' | 'title' | 'subtitle' | 'body' | 'image';
  position: 'top-left' | 'top-center' | 'center' | 'bottom-left' | 'bottom-center';
  style: Record<string, string>;
}
```

### 3.3 Gemini 3.1 Flash-Lite 연동 설계

```
호출 흐름:
1. 사용자 입력 (텍스트/URL 본문)
   ↓
2. [1단계: 카드뉴스 기획] - Gemini API 호출
   - 프롬프트: "다음 텍스트를 카드뉴스 7장으로 구조화해줘"
   - 출력: JSON { slides: [{ type, category, title, subtitle, body }] }
   ↓
3. [2단계: 카드 HTML 작성] - Gemini API 호출 (각 슬라이드별)
   - 프롬프트: "다음 슬라이드 내용을 HTML로 변환해줘. 레이아웃: {layoutId}"
   - 출력: HTML string (인라인 CSS 포함)
   ↓
4. 편집기에 로드
```

**Gemini API 키 포인트:**
- 모델: `gemini-3.1-flash-lite-preview` (사용자 확정)
  - Structured Output (JSON mode) 지원 (`response_mime_type: "application/json"` + `response_json_schema`)
  - Thinking 모드 지원 (`thinking_level: "high"`) — 복잡한 구조화 작업에 활용 가능
  - 멀티모달 입력 지원 (텍스트, PDF, 오디오)
  - 대량 처리에 최적화된 경량 모델, 빠르고 저렴
- SDK: `@google/generative-ai` (JS/TS) 또는 `google-genai` (Python)
  - JS SDK 호출: `client.models.generateContent({ model: "gemini-3.1-flash-lite-preview", ... })`
- Streaming 지원으로 진행 상태 실시간 표시
- 2단계 분리: 구조화(기획) → HTML 생성(작성)으로 품질 향상

**프롬프트 전략:**
```
시스템 프롬프트:
- 카드뉴스 전문 작성자 역할
- 4:5 비율 (1080x1350px) 최적화
- 한국어 카드뉴스 스타일 (짧은 문장, 임팩트 있는 제목)
- 슬라이드별 역할: 커버(hook) → 본문(3-5장) → 마무리(CTA/출처)

구조화 프롬프트 예시:
"다음 텍스트를 인스타그램 카드뉴스로 변환해주세요.
- 총 7장의 슬라이드로 구성
- 1장: 커버 (카테고리 + 제목 + 부제)
- 2-6장: 핵심 내용 (한 장에 한 가지 포인트)
- 7장: 마무리 (요약 또는 CTA)
JSON 형식으로 출력해주세요."
```

### 3.4 HTML→PNG 변환 전략

```
옵션 비교:
┌─────────────────────┬──────────────┬──────────────┬─────────┐
│ 라이브러리            │ 품질         │ 한글 지원     │ 난이도   │
├─────────────────────┼──────────────┼──────────────┼─────────┤
│ html-to-image       │ 높음         │ 좋음          │ 쉬움    │
│ dom-to-image-more   │ 높음         │ 좋음          │ 쉬움    │
│ html2canvas         │ 중간         │ 보통          │ 쉬움    │
│ Puppeteer (서버)    │ 최상         │ 완벽          │ 복잡    │
└─────────────────────┴──────────────┴──────────────┴─────────┘

추천: html-to-image (클라이언트 사이드, 설정 간단, 품질 우수)
- toBlob() → PNG 다운로드
- 4:5 비율 = 1080x1350px 고정 캔버스
- 폰트 임베딩 주의 (웹폰트 사전 로드 필수)
```

### 3.5 CSS 레이아웃 템플릿 시스템

참조 UI에서 9가지 레이아웃이 3x3 그리드로 표시됨. 각 레이아웃은 텍스트/이미지 배치가 다름.

```
레이아웃 예시 (9종):
┌─────────┐ ┌─────────┐ ┌─────────┐
│ ■■■■■■■ │ │         │ │ ■■■     │
│         │ │  ■■■■■  │ │         │
│  title  │ │  title  │ │  title  │
│  sub    │ │  sub    │ │  sub    │
│         │ │         │ │     ■■■ │
└─────────┘ └─────────┘ └─────────┘
 top-full    center      split

┌─────────┐ ┌─────────┐ ┌─────────┐
│         │ │ ■■■■■■■ │ │         │
│ title   │ │ ■■■■■■■ │ │   big   │
│ sub     │ │ title   │ │  title  │
│         │ │ sub     │ │         │
│ ■■■■■■■ │ │         │ │  sub    │
└─────────┘ └─────────┘ └─────────┘
 bottom      top-half    minimal

구현 방식:
- 각 레이아웃 = CSS class + HTML 구조
- 레이아웃 선택 시 해당 CSS class를 슬라이드에 적용
- CSS 변수(custom properties)로 색상/폰트 커스터마이징
```

**구현 접근:**
```css
/* 슬라이드 기본 컨테이너 */
.card-slide {
  width: 1080px;
  height: 1350px;  /* 4:5 비율 */
  position: relative;
  overflow: hidden;
}

/* 레이아웃별 CSS */
.layout-center-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.layout-bottom-heavy {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 120px;
}

/* 색상 프리셋 */
.preset-dark {
  --bg-color: #1a1a2e;
  --text-color: #ffffff;
  --accent-color: #00d2d3;
}

.preset-light {
  --bg-color: #ffffff;
  --text-color: #1a1a2e;
  --accent-color: #00d2d3;
}
```

---

## 4. 페이지/라우트 구조

```
app/
├── page.tsx                    # 카드뉴스 만들기 (메인, 빈 상태)
├── create/
│   └── page.tsx                # 입력 폼 (텍스트/URL/피드 선택)
├── generate/
│   └── page.tsx                # AI 생성 진행 화면
├── edit/
│   └── [id]/
│       └── page.tsx            # 편집기 (좌: 컨트롤, 우: 프리뷰)
├── projects/
│   └── page.tsx                # 작업 목록 (그리드)
├── api/
│   ├── generate/
│   │   └── route.ts            # Gemini API 호출 (구조화 + HTML 생성)
│   ├── crawl/
│   │   └── route.ts            # URL 본문 크롤링
│   └── feed/
│       └── route.ts            # RSS 피드 파싱
└── layout.tsx                  # 공통 레이아웃 (사이드바)
```

### 좌측 사이드바 구조 (참조 UI 기준)
```
[+] 새로 만들기          → /create
[📄] 작업 목록           → /projects
[🖼] 카드뉴스            → /projects (필터)
[⚙] 설정                → /settings (모달 or 페이지)
```

---

## 5. 컴포넌트 구조

```
components/
├── layout/
│   ├── Sidebar.tsx              # 좌측 네비게이션
│   └── AppShell.tsx             # 전체 레이아웃 래퍼
│
├── create/
│   ├── TextInput.tsx            # 텍스트 붙여넣기 영역
│   ├── NewsFeedList.tsx         # 뉴스 피드 목록
│   ├── FeedSelector.tsx         # RSS 피드 소스 선택
│   └── UrlInput.tsx             # URL 입력
│
├── generate/
│   ├── GenerationProgress.tsx   # 2단계 진행 표시
│   └── GenerationLog.tsx        # GPU 로그 보기
│
├── editor/
│   ├── EditorPanel.tsx          # 좌측 편집 패널 전체
│   ├── SlideNavigation.tsx      # 슬라이드 이전/다음
│   ├── ContentFields.tsx        # 카테고리/제목/부제 입력
│   ├── ColorPresets.tsx         # 밝은/어두운 배경 토글
│   ├── LayoutSelector.tsx       # 9종 레이아웃 그리드
│   ├── ImageControls.tsx        # 이미지 첨부/자동/검색 + 조절
│   └── SlideActions.tsx         # 슬라이드 개선/삭제
│
├── preview/
│   ├── PhoneMockup.tsx          # iPhone 프레임
│   ├── InstagramFrame.tsx       # 인스타그램 UI (프로필, 좋아요 등)
│   ├── CardSlideRenderer.tsx    # HTML 슬라이드 렌더링 (4:5)
│   └── SlideIndicator.tsx       # 도트 인디케이터
│
├── projects/
│   ├── ProjectGrid.tsx          # 작업 목록 카드 그리드
│   └── ProjectCard.tsx          # 개별 프로젝트 카드
│
└── card-templates/
    ├── layouts/                 # 9종 레이아웃 CSS/컴포넌트
    │   ├── CenterTitle.tsx
    │   ├── BottomHeavy.tsx
    │   ├── TopImage.tsx
    │   ├── SplitLayout.tsx
    │   └── ... (9종)
    └── presets/                 # 색상 프리셋 정의
        ├── dark.ts
        └── light.ts
```

---

## 6. 상태 관리 설계

```typescript
// Zustand store
interface CardNewsStore {
  // 현재 프로젝트
  project: CardNewsProject | null;

  // 편집 상태
  currentSlideIndex: number;
  isDirty: boolean;

  // 생성 상태
  generationStatus: 'idle' | 'planning' | 'writing' | 'done' | 'error';
  generationProgress: number;

  // Actions
  setProject: (project: CardNewsProject) => void;
  updateSlide: (index: number, updates: Partial<CardSlide>) => void;
  setLayout: (slideIndex: number, layoutId: string) => void;
  setColorPreset: (slideIndex: number, preset: 'light' | 'dark') => void;
  addSlide: (afterIndex: number) => void;
  removeSlide: (index: number) => void;
  reorderSlides: (from: number, to: number) => void;
  saveProject: () => void;

  // Navigation
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
}
```

---

## 7. Gemini API 연동 상세

### 7.1 API Route 설계

```typescript
// POST /api/generate
// Request:
{
  sourceText: string;        // 원본 텍스트
  slideCount?: number;       // 슬라이드 수 (기본 7)
  style?: string;            // 스타일 힌트
}

// Response (Server-Sent Events 스트리밍):
// event: phase
// data: { phase: "planning", progress: 0 }
//
// event: phase
// data: { phase: "planning", progress: 100, result: { slides: [...] } }
//
// event: phase
// data: { phase: "writing", progress: 30, slideIndex: 2 }
//
// event: complete
// data: { project: CardNewsProject }
```

### 7.2 Gemini SDK 사용

```typescript
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Structured Output으로 JSON 안정적 파싱
const response = await client.models.generateContent({
  model: "gemini-3.1-flash-lite-preview",
  contents: prompt,
  config: {
    systemInstruction: "당신은 인스타그램 카드뉴스 전문 에디터입니다.",
    responseMimeType: "application/json",
    responseSchema: slideSchema,  // JSON Schema (Zod → JSON Schema 변환)
  },
});

// Thinking 모드 (복잡한 구조화 시)
const thinkingResponse = await client.models.generateContent({
  model: "gemini-3.1-flash-lite-preview",
  contents: complexPrompt,
  config: {
    thinkingConfig: { thinkingLevel: "high" },
  },
});
```

> **참고**: `@google/generative-ai` (구 SDK)가 아닌 `@google/genai` (신 SDK) 사용.
> 신 SDK는 `client.models.generateContent()` 패턴을 사용함.

### 7.3 프롬프트 체인

**1단계 (기획 프롬프트):**
```
당신은 인스타그램 카드뉴스 전문 에디터입니다.
다음 텍스트를 인스타그램 카드뉴스 {N}장으로 구조화해주세요.

규칙:
- 1장: 커버 (카테고리 + 임팩트 있는 제목 + 부제)
- 2~{N-1}장: 핵심 내용 (한 장에 한 가지 메시지)
- {N}장: 마무리 (핵심 요약 또는 행동 유도)
- 제목은 2줄 이내, 짧고 강렬하게
- 부제는 1줄, 부연 설명

원본 텍스트:
{sourceText}
```

**2단계 (HTML 생성 프롬프트):**
```
다음 카드뉴스 슬라이드 내용을 HTML로 변환해주세요.

슬라이드 정보:
- 타입: {type}
- 카테고리: {category}
- 제목: {title}
- 부제: {subtitle}
- 본문: {body}

규칙:
- 크기: 1080x1350px (4:5 비율)
- 인라인 CSS 사용
- 웹폰트 참조 가능 (Pretendard, Noto Sans KR)
- 배경색: {colorPreset}
- 레이아웃: {layoutDescription}
- 시맨틱 HTML 태그 사용
- 텍스트만, 이미지 태그 없음 (이미지는 별도 처리)

HTML만 출력해주세요.
```

---

## 8. 의존성 & 외부 서비스

| 의존성 | 용도 | 비고 |
|--------|------|------|
| `@google/genai` | Gemini 3.1 Flash-Lite SDK | API 키 필요, 신규 SDK |
| `html-to-image` | HTML→PNG 변환 | 클라이언트 사이드 |
| `zustand` | 상태 관리 | 경량, 편집기 상태 |
| `rss-parser` | RSS 피드 파싱 | 서버 사이드 |
| `@mozilla/readability` + `jsdom` | URL 본문 추출 | 서버 사이드 |
| `next` | 프레임워크 | v15 |
| `tailwindcss` | 스타일링 | v4 |
| `@shadcn/ui` | UI 컴포넌트 | 다크 테마 |

---

## 9. 리스크 & 파급 범위

### 9.1 기술적 리스크
1. **HTML→PNG 변환 품질**: 웹폰트 로딩 타이밍, CSS 지원 범위에 따라 렌더링 차이 발생 가능
   - 완화: 폰트 사전 로드, 테스트 자동화
2. **Gemini 출력 불안정성**: LLM이 항상 정확한 HTML을 생성하지 않을 수 있음
   - 완화: JSON Schema 강제, 후처리 sanitize, 재생성 버튼
3. **4:5 프리뷰 스케일링**: 1080x1350px 원본을 화면에 맞게 축소할 때 텍스트 가독성
   - 완화: CSS transform scale(), 프리뷰 전용 스케일 계산

### 9.2 UX 리스크
1. **생성 시간**: Gemini API 호출 2회 + 7장 생성 = 수십 초 소요 가능
   - 완화: 스트리밍 + 단계별 프로그레스 표시
2. **레이아웃-HTML 불일치**: 레이아웃 변경 시 기존 HTML과 충돌
   - 완화: 레이아웃은 CSS 클래스로만 처리, HTML 구조는 고정

### 9.3 보안 리스크
1. **XSS**: Gemini가 생성한 HTML을 `dangerouslySetInnerHTML`로 렌더링
   - 완화: DOMPurify로 sanitize 필수
2. **API 키 노출**: Gemini API 키가 클라이언트에 노출되면 안 됨
   - 완화: 서버 사이드 API Route에서만 호출

---

## 10. 불확실성 & 확인 필요 항목

| # | 항목 | 설명 | 영향도 |
|---|------|------|--------|
| 1 | ~~**Gemini 모델 버전**~~ | **확정**: `gemini-3.1-flash-lite-preview` — SDK: `@google/genai` | 해결됨 |
| 2 | **데이터 저장 방식** | localStorage(MVP) vs Supabase/Convex(production) | 중간 |
| 3 | **이미지 생성 기능** | "자동 이미지"가 AI 이미지 생성인지, 스톡 이미지 검색인지 | 중간 |
| 4 | **뉴스 피드 소스** | 어떤 뉴스 API/RSS를 사용할지 | 낮음 |
| 5 | **다크 테마 전용?** | 참조 UI가 다크 테마만 보여줌. 라이트 테마도 필요한지 | 낮음 |
| 6 | **멀티유저/인증** | 개인용 도구인지, 로그인 필요한 서비스인지 | 높음 |
| 7 | **PNG 일괄 내보내기** | 전체 슬라이드 한번에 내보내기 vs 현재 슬라이드만 | 낮음 |
| 8 | **모바일 대응** | 데스크톱 전용인지, 반응형 필요한지 | 낮음 |

---

## 11. 요약 & 다음 단계

### 프로젝트 요약
- **그린필드 프로젝트** (기존 코드 없음)
- Next.js 15 + Gemini Flash + HTML 카드뉴스 편집기
- 핵심 플로우: 텍스트 입력 → AI 구조화 → HTML 생성 → 편집 → PNG 내보내기
- 참조 UI는 매우 구체적이며, 완성도 높은 디자인 시스템을 보여줌 (다크 테마, 민트 액센트)

### 기술적 핵심 도전
1. Gemini → 안정적인 HTML 생성 파이프라인
2. CSS 레이아웃 템플릿 시스템 설계
3. HTML→PNG 고품질 변환
4. 실시간 4:5 프리뷰 + 편집 동기화

### 제안하는 구현 순서
```
Phase 1 (MVP): 텍스트 입력 → Gemini 생성 → 편집 → PNG 내보내기
Phase 2: 레이아웃 템플릿 9종 + 색상 프리셋
Phase 3: URL 크롤링 + 뉴스 피드
Phase 4: 이미지 관리 (첨부/검색/자동)
Phase 5: 프로젝트 저장/목록 관리
```

**다음 단계**: `/vibe-plan` 으로 구현 계획 수립
