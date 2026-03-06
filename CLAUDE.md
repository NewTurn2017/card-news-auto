# Card News Auto - AI 카드뉴스 자동 생성 플랫폼

## Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript 5 (strict)
- Tailwind CSS 4 + PostCSS
- Zustand 5 (state management)
- Google Gemini API (@google/genai) - Flash-Lite model
- DOMPurify (HTML sanitization)
- html-to-image (PNG export)
- Deployed on Vercel

## Project Structure
```
src/
├── app/           # Next.js App Router pages & API routes
│   ├── api/       # generate/, improve/ API endpoints (SSE streaming)
│   ├── create/    # 카드뉴스 생성 페이지
│   └── edit/      # 카드뉴스 편집 페이지
├── components/    # React components
│   ├── editor/    # 편집 패널 (ContentFields, ColorPresets, LayoutSelector, etc.)
│   ├── preview/   # 미리보기 (CardSlideRenderer, PhoneMockup, InstagramFrame)
│   ├── create/    # 생성 입력 (TextInput)
│   └── generate/  # 생성 진행 (GenerationProgress)
├── data/          # 정적 데이터 (layouts, presets)
├── lib/           # 유틸리티 (gemini, prompts, sanitize, storage, export-png)
├── store/         # Zustand store (card-news-store)
└── types/         # TypeScript 타입 정의
```

## Architecture Decisions
- 레이아웃: 9개 사전 정의 CSS 레이아웃 템플릿 (하이브리드 접근)
- AI 생성: SSE 스트리밍으로 실시간 진행률 표시
- 저장: localStorage 기반 프로젝트 관리
- 보안: DOMPurify로 AI 생성 HTML 살균

## Development
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

## Conventions
- Path alias: `@/*` → `./src/*`
- API routes use SSE (Server-Sent Events) for streaming responses
- Environment: `GEMINI_API_KEY` required for AI features
