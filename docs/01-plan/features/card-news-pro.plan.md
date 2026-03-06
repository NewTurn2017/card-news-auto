# Plan Plus: Card News Pro - AI Card News Auto-Generation Platform v1

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 1인 콘텐츠 크리에이터가 카드뉴스 하나를 만드는 데 10~30분 소요. 자료 수집, 텍스트 정리, 디자인, 내보내기를 각각 다른 도구에서 수행해야 함 |
| **Solution** | URL/검색/텍스트 입력 → AI 자동 정리 → 카드뉴스 생성 → 편집 → 내보내기를 원스톱으로 처리하는 AI-First 플랫폼 |
| **Function UX Effect** | Gemini API Key만 등록하면 1분 내 프로급 카드뉴스 완성. 실시간 미리보기, 글씨체/배경/이미지 커스터마이징 |
| **Core Value** | 콘텐츠 제작 시간 90% 단축 (10분 → 1분), 비전문가도 프로급 결과물 |

| Item | Detail |
|------|--------|
| Feature | Card News Pro (AI 카드뉴스 자동 생성 플랫폼 v1) |
| Plan Date | 2026-03-06 |
| Target Duration | 2 weeks (Sprint 1: Core, Sprint 2: Polish) |
| Match Rate | N/A (Initial Plan) |

---

## 1. User Intent Discovery

### Core Problem
콘텐츠 제작 시간 단축 — 기사/블로그 URL만 넣으면 AI가 카드뉴스를 자동 생성하여 제작 시간을 10분→1분으로 단축

### Target Users
1인 콘텐츠 크리에이터 (블로거, 유튜버, 인스타그래머 등 개인 콘텐츠 제작자)

### Success Criteria
1. URL 입력 → 1분 내 수정 가능한 카드뉴스 완성
2. Gemini API Key만 넣으면 바로 사용 가능 (설치/설정 최소화)
3. 자료수집 → AI생성 → 편집 → 내보내기까지 원스톱 워크플로우
4. URL, 웹 검색, 텍스트 직접 입력 모두 지원

### Constraints
- 사용자 개인 Gemini API Key 사용 (서버 비용 최소화)
- Firecrawl API는 서버 환경변수로 공용 제공
- Unsplash/Pexels API는 무료 티어 내 운용

---

## 2. Alternatives Explored

### Approach A: AI-First Workflow (Selected)
- **Pros**: 자동화 극대화, Convex 실시간 구독으로 UX 우수, 사용자 데이터 영속성
- **Cons**: Convex 학습 곡선, MVP 대비 전면 재구축 필요
- **Best for**: 1인 크리에이터가 빠르게 콘텐츠 생산

### Approach B: Template Marketplace
- **Pros**: 디자인 품질 보장, 예측 가능한 결과
- **Cons**: 템플릿 제작 비용 높음, AI 자동화 약함
- **Best for**: 디자인 품질 우선 시나리오

### Approach C: Full AI Agency
- **Pros**: 최소 개발, 최소 UX 복잡도
- **Cons**: 품질 예측 불가, 편집 어려움
- **Best for**: 프로토타입/실험

**Decision**: Approach A — AI가 콘텐츠를 구조화하되, 사용자가 편집 제어권을 유지하는 균형점

---

## 3. YAGNI Review

### v1 Included (In Scope)
| Area | Feature | Priority |
|------|---------|----------|
| Auth | 회원가입/로그인 (Convex Auth: Email + Google) | P0 |
| Source | URL 크롤링 (Firecrawl API) | P0 |
| Source | 웹 검색 (Gemini Search Grounding) | P0 |
| Source | 텍스트 직접 입력 | P0 |
| AI | 자료 자동 정리 → 카드뉴스 구조화 → 슬라이드 생성 | P0 |
| Editor | 글씨체 선택 (Google Fonts 한글 5~10개) | P1 |
| Editor | 배경색 / 그라데이션 선택 | P1 |
| Editor | 레이아웃 선택 (9개 기존 + 확장) | P1 |
| Editor | 이미지 검색 (Unsplash/Pexels API) | P1 |
| Export | 개별 슬라이드 PNG | P0 |
| Export | 전체 PNG ZIP 압축 다운로드 | P1 |
| Export | PDF 내보내기 | P1 |
| Settings | Gemini API Key 등록/관리 | P0 |
| UX | 프로젝트 대시보드 (목록/삭제/재편집) | P0 |

### v2 Deferred (Out of Scope)
| Feature | Reason |
|---------|--------|
| Meta 소셜 로그인 | OAuth 승인 프로세스 복잡, v1 불필요 |
| Instagram 직접 게시 (Meta API) | Meta API 심사 필요, v2 |
| NotebookLM API 연동 | API 안정성 미확인, v2 |
| 50+ 템플릿 마켓플레이스 | 디자인 리소스 부족, v2 |
| 팀 협업 / 공유 기능 | 1인 타겟이므로 v2 |
| AI 이미지 생성 (Gemini Imagen) | v2 고급 기능 |
| 다국어 지원 | v1은 한국어만 |

---

## 4. Architecture Overview

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 (클라이언트 UI 상태) + Convex (서버 상태) |
| Backend | Convex (DB + Auth + Actions + File Storage) |
| Auth | Convex Auth (Email/Password + Google OAuth) |
| AI | Google Gemini API (@google/genai) - 사용자 개인 키 |
| Crawling | Firecrawl API (서버 공용 키) |
| Image Search | Unsplash API / Pexels API |
| Export | html-to-image + JSZip + jspdf |
| Deploy | Vercel (Frontend) + Convex Cloud (Backend) |

### System Architecture
```
┌──────────────────────────────────────────────────┐
│          Frontend (Next.js 16 App Router)         │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐    │
│  │ Dashboard │ │ Creator  │ │ Editor        │    │
│  │ (프로젝트)│ │ (생성)   │ │ (편집+미리보기)│    │
│  └──────────┘ └──────────┘ └───────────────┘    │
│  ┌──────────┐ ┌──────────┐                       │
│  │ Settings │ │ Login    │                       │
│  │ (API Key)│ │ (Auth)   │                       │
│  └──────────┘ └──────────┘                       │
└──────────────────────┬───────────────────────────┘
                       │ Convex Client SDK
                       ▼
┌──────────────────────────────────────────────────┐
│              Convex Backend                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Auth       │ │ DB (tables)│ │ Actions    │   │
│  │ (Convex   │ │ - users    │ │ - generate │   │
│  │  Auth)    │ │ - projects │ │ - crawl    │   │
│  │           │ │ - slides   │ │ - search   │   │
│  │ Email +   │ │ - sources  │ │ - image    │   │
│  │ Google    │ │            │ │   search   │   │
│  └────────────┘ └────────────┘ └────────────┘   │
└──────────────────┬───────────────────────────────┘
                   │
        ┌──────────┼───────────┐
        ▼          ▼           ▼
   Gemini API  Firecrawl  Unsplash/
   (AI gen +   API        Pexels API
    search)    (크롤링)    (이미지)
```

### Data Model (Convex Schema)

#### users (Convex Auth 자동 생성 + 확장)
```typescript
{
  // Convex Auth 기본 필드 (name, email, image, etc.)
  geminiApiKey?: string,      // AES 암호화 저장
  settings: {
    defaultFont: string,      // 기본 글씨체
    defaultPreset: string,    // 기본 색상 프리셋
  }
}
```

#### projects
```typescript
{
  userId: Id<"users">,
  title: string,
  status: "draft" | "generating" | "completed",
  sourceType: "url" | "search" | "text",
  sourceInput: string,        // 원본 URL/검색어/텍스트
  sourceContent: string,      // AI 정리된 콘텐츠
  generationProgress: number, // 0~100
  createdAt: number,
  updatedAt: number,
}
```

#### slides
```typescript
{
  projectId: Id<"projects">,
  order: number,
  type: "cover" | "content" | "ending",
  layoutId: string,
  content: {
    category?: string,
    title: string,
    subtitle?: string,
    body?: string,
    source?: string,
  },
  style: {
    bgType: "solid" | "gradient",
    bgColor: string,
    gradientFrom?: string,
    gradientTo?: string,
    gradientDirection?: string,
    textColor: string,
    accentColor: string,
    fontFamily: string,
  },
  image?: {
    storageId?: Id<"_storage">,
    externalUrl?: string,
    opacity: number,
    position: { x: number, y: number },
    size: number,
    fit: "cover" | "contain" | "fill",
  },
  htmlContent: string,
}
```

#### sources
```typescript
{
  projectId: Id<"projects">,
  type: "url" | "search",
  url?: string,
  query?: string,
  rawContent: string,
  summary: string,
  collectedAt: number,
}
```

---

## 5. Core Workflows

### Flow 1: 소스 수집
```
사용자 입력 (URL/검색어/텍스트)
  │
  ├─ URL → Convex Action → Firecrawl API → 본문 추출
  ├─ 검색 → Convex Action → Gemini Search Grounding
  └─ 텍스트 → 직접 사용
  │
  ▼
  sources 테이블에 저장 (rawContent + AI summary)
  → project.sourceContent 업데이트
```

### Flow 2: AI 카드뉴스 생성
```
sourceContent (정리된 자료)
  │
  ▼ Convex Action → 사용자 Gemini API Key로 호출
  Phase 1: 콘텐츠 구조화 (제목/본문/카테고리)
  │  → 실시간 진행률 (Convex mutation 업데이트)
  ▼
  Phase 2: 슬라이드별 데이터 생성
  │  → 각 슬라이드 완료시 slides 테이블 insert
  ▼
  project.status = "completed"
  (프론트는 useQuery로 실시간 구독)
```

### Flow 3: 편집
```
사용자 조작 (UI)
  │
  ├─ 레이아웃 변경 → mutation: updateSlide
  ├─ 색상/그라데이션 → mutation: updateSlideStyle
  ├─ 글씨체 변경 → mutation: updateSlideStyle
  ├─ 이미지 검색 → action: searchImages (Unsplash/Pexels)
  ├─ 이미지 업로드 → Convex Storage → mutation: updateSlideImage
  └─ 슬라이드 추가/삭제/순서변경 → mutation
  │
  ▼ 모든 변경은 실시간 자동 저장
```

### Flow 4: 내보내기
```
  ├─ 개별 PNG: html-to-image (클라이언트)
  ├─ 전체 PNG ZIP: JSZip + html-to-image → Blob download
  └─ PDF: jspdf + 각 슬라이드 이미지 → PDF download
```

### Gemini API Key 관리
```
사용자 설정 페이지에서 API Key 입력
  → Convex mutation으로 암호화 저장
  → Action에서 복호화하여 Gemini 호출에 사용
  → 키 미등록 시 생성/수집 기능 블록 (설정 유도)
```

---

## 6. Page Structure

```
/                    → 랜딩 페이지 (미인증 시) / 대시보드 리다이렉트 (인증 시)
/login               → 로그인 (Email + Google)
/signup              → 회원가입
/dashboard           → 프로젝트 목록 (카드 그리드)
/create              → 새 카드뉴스 생성 (소스 입력 → AI 생성)
/edit/[projectId]    → 카드뉴스 편집기
/settings            → 사용자 설정 (API Key, 기본 설정)
```

---

## 7. Implementation Phases

### Sprint 1: Core Infrastructure (Week 1)
| Task | Description | Est |
|------|-------------|-----|
| S1-1 | Convex 프로젝트 셋업 + Schema 정의 | 2h |
| S1-2 | Convex Auth 설정 (Email + Google) | 3h |
| S1-3 | 로그인/회원가입 UI | 3h |
| S1-4 | 설정 페이지 (Gemini API Key 등록) | 2h |
| S1-5 | 소스 수집 Action (Firecrawl + Gemini Search) | 4h |
| S1-6 | AI 카드뉴스 생성 Action (기존 로직 Convex 마이그레이션) | 4h |
| S1-7 | 프로젝트 대시보드 (목록/생성/삭제) | 3h |
| S1-8 | 생성 페이지 리워크 (3가지 소스 입력 + 실시간 진행률) | 4h |

### Sprint 2: Editor & Export (Week 2)
| Task | Description | Est |
|------|-------------|-----|
| S2-1 | 편집기 Convex 연동 (실시간 저장) | 4h |
| S2-2 | 글씨체 선택기 (Google Fonts 한글) | 3h |
| S2-3 | 배경색/그라데이션 선택기 | 3h |
| S2-4 | 이미지 검색 (Unsplash/Pexels API) | 3h |
| S2-5 | PNG ZIP 내보내기 | 2h |
| S2-6 | PDF 내보내기 | 2h |
| S2-7 | 전체 UI 폴리싱 + 반응형 | 4h |
| S2-8 | 테스트 + 버그 수정 + 배포 | 4h |

---

## 8. Environment Variables

```bash
# Convex
CONVEX_DEPLOYMENT=         # Convex deployment URL
NEXT_PUBLIC_CONVEX_URL=    # Convex public URL

# Auth (Convex Auth)
AUTH_GOOGLE_ID=            # Google OAuth Client ID
AUTH_GOOGLE_SECRET=        # Google OAuth Client Secret

# Server-side APIs (Convex Action에서 사용)
FIRECRAWL_API_KEY=         # Firecrawl API Key (서버 공용)
UNSPLASH_ACCESS_KEY=       # Unsplash API Key
PEXELS_API_KEY=            # Pexels API Key

# Note: GEMINI_API_KEY는 사용자별로 DB에 암호화 저장
# 서버 환경변수의 AES_ENCRYPTION_KEY로 암호화/복호화
AES_ENCRYPTION_KEY=        # API Key 암호화용 비밀키
```

---

## 9. Migration from MVP

### 제거 대상
- `src/lib/storage.ts` → Convex DB로 대체
- `src/app/api/` → Convex Actions로 대체
- `src/lib/gemini.ts` → Convex Action 내 직접 호출로 대체

### 유지/발전 대상
- `src/data/layouts.ts` → 유지 (프론트엔드 레이아웃 정의)
- `src/data/presets.ts` → 확장 (그라데이션 추가)
- `src/components/preview/` → 유지 + 글씨체/그라데이션 대응
- `src/components/editor/` → Convex mutation 연동으로 리워크
- `src/lib/export-png.ts` → 유지 + ZIP/PDF 확장
- `src/lib/sanitize.ts` → 유지
- `src/lib/prompts.ts` → Convex Action으로 이동

### 신규
- `convex/` 디렉토리 (schema, auth, functions)
- `src/app/login/`, `src/app/signup/`, `src/app/dashboard/`, `src/app/settings/`
- `src/components/auth/`, `src/components/dashboard/`, `src/components/settings/`

---

## 10. Brainstorming Log

| Phase | Decision | Rationale |
|-------|----------|-----------|
| Phase 1 Q1 | 콘텐츠 제작 시간 단축 | 핵심 가치는 속도 (10분→1분) |
| Phase 1 Q2 | 1인 콘텐츠 크리에이터 | 개인 사용자 우선, 팀 기능은 v2 |
| Phase 1 Q3 | URL+검색+텍스트 모두 지원, 원스톱 워크플로우 | 다양한 소스 입력이 핵심 차별점 |
| Phase 2 | AI-First Workflow (A안) | AI 자동화 + 사용자 편집 제어권 균형 |
| Phase 3 | Meta 로그인/Instagram 게시/팀 협업 v2로 | YAGNI — v1은 핵심 워크플로우에 집중 |
| Phase 4-1 | Convex 풀스택 아키텍처 | 실시간 구독, Auth 통합, Action에서 외부 API 호출 |
| Phase 4-2 | slides를 별도 테이블로 분리 | 개별 슬라이드 CRUD 효율성 |
| Phase 4-3 | 사용자별 Gemini Key, 서버 공용 Firecrawl Key | 서버 비용 최소화 + 크롤링은 공용 제공 |
