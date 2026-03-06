# Design Document: Card News Pro - AI Card News Auto-Generation Platform v1

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 1인 콘텐츠 크리에이터가 카드뉴스 제작에 10~30분 소요 (자료 수집 + 디자인 + 내보내기 분리) |
| **Solution** | URL/SNS스크랩/검색/텍스트 → AI 자동 정리 → 카드뉴스 생성 → 편집 → 내보내기 원스톱 플랫폼 |
| **Function UX Effect** | Gemini API Key 등록 후 1분 내 프로급 카드뉴스 완성, 실시간 미리보기 |
| **Core Value** | 콘텐츠 제작 시간 90% 단축, 비전문가도 프로급 결과물 |

**Plan Reference**: `docs/01-plan/features/card-news-pro.plan.md`

---

## 1. Convex Schema Design

### 1.1 Schema Definition (`convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  // Convex Auth 기본 테이블 (users, sessions, accounts, etc.)
  ...authTables,

  // 사용자 프로필 확장
  userProfiles: defineTable({
    userId: v.id("users"),
    geminiApiKey: v.optional(v.string()),   // AES-256 암호화 저장
    settings: v.object({
      defaultFont: v.string(),              // 기본 글씨체
      defaultBgType: v.string(),            // "solid" | "gradient"
      defaultBgColor: v.string(),           // 기본 배경색
    }),
  }).index("by_userId", ["userId"]),

  // 프로젝트
  projects: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("collecting"),
      v.literal("generating"),
      v.literal("completed"),
    ),
    sourceType: v.union(
      v.literal("url"),
      v.literal("sns"),
      v.literal("search"),
      v.literal("text"),
    ),
    sourceInput: v.string(),
    sourceContent: v.optional(v.string()),   // AI 정리된 콘텐츠
    generationProgress: v.number(),          // 0~100
    slideCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),

  // 슬라이드
  slides: defineTable({
    projectId: v.id("projects"),
    order: v.number(),
    type: v.union(
      v.literal("cover"),
      v.literal("content"),
      v.literal("ending"),
    ),
    layoutId: v.string(),
    content: v.object({
      category: v.optional(v.string()),
      title: v.string(),
      subtitle: v.optional(v.string()),
      body: v.optional(v.string()),
      source: v.optional(v.string()),
    }),
    style: v.object({
      bgType: v.union(v.literal("solid"), v.literal("gradient")),
      bgColor: v.string(),
      gradientFrom: v.optional(v.string()),
      gradientTo: v.optional(v.string()),
      gradientDirection: v.optional(v.string()),
      textColor: v.string(),
      accentColor: v.string(),
      fontFamily: v.string(),
    }),
    image: v.optional(v.object({
      storageId: v.optional(v.id("_storage")),
      externalUrl: v.optional(v.string()),
      opacity: v.number(),
      position: v.object({ x: v.number(), y: v.number() }),
      size: v.number(),
      fit: v.union(
        v.literal("cover"),
        v.literal("contain"),
        v.literal("fill"),
      ),
    })),
    htmlContent: v.optional(v.string()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_order", ["projectId", "order"]),

  // 수집된 소스 자료
  sources: defineTable({
    projectId: v.id("projects"),
    type: v.union(v.literal("url"), v.literal("sns"), v.literal("search")),
    url: v.optional(v.string()),
    query: v.optional(v.string()),
    // SNS 스크랩 전용 필드
    platform: v.optional(v.union(
      v.literal("threads"),
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("x"),
    )),
    username: v.optional(v.string()),
    rawContent: v.string(),
    summary: v.string(),
    collectedAt: v.number(),
  }).index("by_projectId", ["projectId"]),
});
```

### 1.2 인덱스 설계 근거

| Table | Index | Purpose |
|-------|-------|---------|
| `userProfiles` | `by_userId` | 로그인 후 프로필 빠른 조회 |
| `projects` | `by_userId` | 대시보드 프로젝트 목록 |
| `projects` | `by_userId_updatedAt` | 최근 수정 순 정렬 |
| `slides` | `by_projectId` | 프로젝트별 슬라이드 조회 |
| `slides` | `by_projectId_order` | 슬라이드 순서 정렬 |
| `sources` | `by_projectId` | 프로젝트별 소스 조회 |

---

## 2. Convex Auth Configuration

### 2.1 Auth Setup (`convex/auth.ts`)

```typescript
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google, Password],
});
```

### 2.2 Auth Config (`convex/auth.config.ts`)

```typescript
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

### 2.3 Next.js Integration

**`app/layout.tsx`** — ConvexAuthNextjsServerProvider 래핑:
```typescript
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="ko">
        <body>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
```

**`src/components/providers/ConvexClientProvider.tsx`**:
```typescript
"use client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
```

**`middleware.ts`** — 라우트 보호:
```typescript
import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from "@convex-dev/auth/nextjs/middleware";

const isPublicRoute = createRouteMatcher(["/", "/login", "/signup"]);

export default convexAuthNextjsMiddleware((request, { convexAuth }) => {
  if (!isPublicRoute(request) && !convexAuth.isAuthenticated()) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### 2.4 Environment Variables (Auth)

```bash
# Convex Auth
AUTH_GOOGLE_ID=           # Google Cloud Console OAuth Client ID
AUTH_GOOGLE_SECRET=       # Google Cloud Console OAuth Client Secret
CONVEX_SITE_URL=          # Convex deployment URL (자동 설정)
```

---

## 3. Convex Functions (Queries, Mutations, Actions)

### 3.1 Queries

| Function | File | Purpose |
|----------|------|---------|
| `getProfile` | `convex/userProfiles.ts` | 현재 사용자 프로필 조회 |
| `hasApiKey` | `convex/userProfiles.ts` | API Key 등록 여부 확인 (키 값 미노출) |
| `listProjects` | `convex/projects.ts` | 사용자 프로젝트 목록 (최신순) |
| `getProject` | `convex/projects.ts` | 단일 프로젝트 상세 |
| `getSlides` | `convex/slides.ts` | 프로젝트별 슬라이드 목록 (order 순) |
| `getSources` | `convex/sources.ts` | 프로젝트별 소스 자료 |

### 3.2 Mutations

| Function | File | Purpose |
|----------|------|---------|
| `saveApiKey` | `convex/userProfiles.ts` | Gemini API Key 암호화 저장 |
| `updateSettings` | `convex/userProfiles.ts` | 사용자 기본 설정 업데이트 |
| `createProject` | `convex/projects.ts` | 새 프로젝트 생성 |
| `updateProject` | `convex/projects.ts` | 프로젝트 메타데이터 업데이트 |
| `deleteProject` | `convex/projects.ts` | 프로젝트 + 연관 슬라이드/소스 삭제 |
| `updateProjectProgress` | `convex/projects.ts` | 생성 진행률 업데이트 |
| `createSlide` | `convex/slides.ts` | 슬라이드 추가 |
| `updateSlide` | `convex/slides.ts` | 슬라이드 콘텐츠/스타일 업데이트 |
| `updateSlideStyle` | `convex/slides.ts` | 슬라이드 스타일만 업데이트 |
| `updateSlideImage` | `convex/slides.ts` | 슬라이드 이미지 업데이트 |
| `deleteSlide` | `convex/slides.ts` | 슬라이드 삭제 + 순서 재정렬 |
| `reorderSlides` | `convex/slides.ts` | 슬라이드 순서 변경 |
| `createSource` | `convex/sources.ts` | 수집된 소스 저장 |

### 3.3 Actions (External API Calls)

| Function | File | Purpose | External API |
|----------|------|---------|-------------|
| `collectFromUrl` | `convex/actions/collect.ts` | URL 크롤링 | Firecrawl API |
| `collectFromSns` | `convex/actions/collect.ts` | SNS 게시물 스크랩 | WithGenie Scrape API |
| `collectFromSearch` | `convex/actions/collect.ts` | 웹 검색 수집 | WithGenie Search API (+ Gemini Grounding fallback) |
| `generateCardNews` | `convex/actions/generate.ts` | AI 카드뉴스 생성 | Gemini API |
| `improveSlide` | `convex/actions/generate.ts` | 개별 슬라이드 AI 개선 | Gemini API |
| `searchImages` | `convex/actions/images.ts` | 이미지 검색 | Unsplash + Pexels API |
| `generateUploadUrl` | `convex/actions/storage.ts` | 파일 업로드 URL 생성 | Convex Storage |

---

## 4. Action 상세 설계

### 4.1 URL 크롤링 (`collectFromUrl`)

```typescript
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import Firecrawl from "@mendable/firecrawl-js";

export const collectFromUrl = action({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
  },
  handler: async (ctx, { projectId, url }) => {
    // 1. 프로젝트 상태 업데이트
    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId, status: "collecting", progress: 10,
    });

    // 2. Firecrawl로 URL 스크래핑
    const firecrawl = new Firecrawl({
      apiKey: process.env.FIRECRAWL_API_KEY!,
    });
    const result = await firecrawl.scrapeUrl(url, {
      formats: ["markdown"],
    });

    if (!result.success) throw new Error("Scraping failed");

    // 3. Gemini로 콘텐츠 요약/정리
    const apiKey = await getDecryptedApiKey(ctx);
    const summary = await summarizeWithGemini(apiKey, result.markdown);

    // 4. 소스 저장
    await ctx.runMutation(internal.sources.createSource, {
      projectId,
      type: "url",
      url,
      rawContent: result.markdown,
      summary,
    });

    // 5. 프로젝트에 정리된 콘텐츠 저장
    await ctx.runMutation(internal.projects.updateProject, {
      projectId,
      sourceContent: summary,
      status: "draft",
      progress: 100,
    });

    return { success: true, summary };
  },
});
```

### 4.2 SNS 게시물 스크랩 (`collectFromSns`) — WithGenie API

```typescript
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const WITHGENIE_BASE_URL = "https://api.codewithgenie.com";

export const collectFromSns = action({
  args: {
    projectId: v.id("projects"),
    platform: v.union(
      v.literal("threads"),
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("x"),
    ),
    username: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, platform, username, limit = 5 }) => {
    // 1. 프로젝트 상태 업데이트
    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId, status: "collecting", progress: 10,
    });

    // 2. WithGenie Scrape API 호출
    const response = await fetch(`${WITHGENIE_BASE_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.WITHGENIE_API_KEY!,
      },
      body: JSON.stringify({
        platform,
        username: username.replace("@", ""),
        limit,
        offline: false,
        refresh: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Rate limit exceeded");
      throw new Error(`SNS scrape failed: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.items ?? [];

    // 3. 게시물 텍스트 추출
    const rawContent = posts
      .map((post: { text: string }, i: number) =>
        `[Post ${i + 1}]\n${post.text}`)
      .join("\n\n---\n\n");

    // 4. Gemini로 콘텐츠 요약
    const apiKey = await getDecryptedApiKey(ctx);
    const summary = await summarizeWithGemini(apiKey, rawContent);

    // 5. 소스 저장
    await ctx.runMutation(internal.sources.createSource, {
      projectId, type: "sns", platform, username, rawContent, summary,
    });

    // 6. 프로젝트 업데이트
    await ctx.runMutation(internal.projects.updateProject, {
      projectId, sourceContent: summary, status: "draft", progress: 100,
    });

    return { success: true, postCount: posts.length, summary };
  },
});
```

**핵심 포인트:**
- `platform`: threads, instagram, facebook, x 중 선택
- `username`: @ 없이 순수 유저네임 (예: "choi.openai", "sama")
- `limit`: 스크랩할 게시물 수 (기본 5, 최대 20)
- 스크랩 결과를 Gemini로 요약하여 카드뉴스 소스로 활용

### 4.3 웹 검색 수집 (`collectFromSearch`) — WithGenie Search + Gemini Fallback

```typescript
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { internal } from "../_generated/api";

const WITHGENIE_BASE_URL = "https://api.codewithgenie.com";

export const collectFromSearch = action({
  args: {
    projectId: v.id("projects"),
    query: v.string(),
    region: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, query, region = "kr-ko" }) => {
    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId, status: "collecting", progress: 10,
    });

    let rawContent = "";
    let searchSources: { title: string; url: string }[] = [];

    // 1차: WithGenie Search API (빠르고 한국어 지원)
    try {
      const genieRes = await fetch(`${WITHGENIE_BASE_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.WITHGENIE_API_KEY!,
        },
        body: JSON.stringify({ query, max_results: 10, region }),
      });

      if (genieRes.ok) {
        const genieData = await genieRes.json();
        searchSources = (genieData.items ?? []).map(
          (item: { title: string; url: string }) => ({
            title: item.title, url: item.url,
          })
        );
        rawContent = (genieData.items ?? [])
          .map((item: { title: string; snippet: string }) =>
            `### ${item.title}\n${item.snippet}`)
          .join("\n\n");
      }
    } catch {
      // WithGenie 실패 시 Gemini fallback
    }

    // 2차: Gemini Search Grounding (fallback)
    if (!rawContent) {
      const apiKey = await getDecryptedApiKey(ctx);
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `다음 주제에 대해 최신 정보를 검색하고 정리해주세요: ${query}`,
        config: { tools: [{ googleSearch: {} }] },
      });
      rawContent = response.text ?? "";
    }

    // 3. Gemini로 카드뉴스용 요약
    const apiKey = await getDecryptedApiKey(ctx);
    const summary = await summarizeWithGemini(apiKey, rawContent);

    // 4. 소스 저장
    await ctx.runMutation(internal.sources.createSource, {
      projectId, type: "search", query, rawContent, summary,
    });

    await ctx.runMutation(internal.projects.updateProject, {
      projectId, sourceContent: summary, status: "draft", progress: 100,
    });

    return { success: true, content: summary, sources: searchSources };
  },
});
```

**검색 전략:**
- **1차**: WithGenie Search API — 빠르고 `region=kr-ko` 한국어 지원, 서버 공용 키
- **2차 (fallback)**: Gemini Search Grounding — WithGenie 실패 시 사용자 Gemini Key로 검색
- 두 결과 모두 Gemini로 카드뉴스에 적합하게 요약

### 4.3 AI 카드뉴스 생성 (`generateCardNews`)

```typescript
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { internal } from "../_generated/api";

export const generateCardNews = action({
  args: {
    projectId: v.id("projects"),
    slideCount: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, slideCount = 7 }) => {
    const apiKey = await getDecryptedApiKey(ctx);
    const ai = new GoogleGenAI({ apiKey });

    // 1. 프로젝트에서 sourceContent 가져오기
    const project = await ctx.runQuery(internal.projects.getProjectInternal, {
      projectId,
    });
    if (!project?.sourceContent) throw new Error("No source content");

    // 2. 상태: generating
    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId, status: "generating", progress: 0,
    });

    // 3. Phase 1: 콘텐츠 구조화 (Structured Output)
    const planResult = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: getPlanningPrompt(project.sourceContent, slideCount),
      config: {
        responseMimeType: "application/json",
        responseSchema: PLANNING_SCHEMA,
      },
    });

    const plan = JSON.parse(planResult.text ?? "{}");

    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId, status: "generating", progress: 30,
    });

    // 4. Phase 2: 슬라이드 생성
    for (let i = 0; i < plan.slides.length; i++) {
      const slide = plan.slides[i];
      await ctx.runMutation(internal.slides.createSlide, {
        projectId,
        order: i,
        type: slide.type,
        layoutId: i === 0 ? "center-title" : "left-align",
        content: {
          category: slide.category,
          title: slide.title,
          subtitle: slide.subtitle,
          body: slide.body,
        },
        style: getDefaultStyle(),
      });

      // 진행률 업데이트
      const progress = 30 + Math.round(((i + 1) / plan.slides.length) * 70);
      await ctx.runMutation(internal.projects.updateProjectProgress, {
        projectId, status: "generating", progress,
      });
    }

    // 5. 완료
    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId, status: "completed", progress: 100,
    });

    return { success: true, slideCount: plan.slides.length };
  },
});
```

### 4.4 이미지 검색 (`searchImages`)

```typescript
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

export const searchImages = action({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, { query, page = 1, perPage = 20 }) => {
    const results: ImageResult[] = [];

    // Unsplash API
    const unsplashRes = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${Math.ceil(perPage / 2)}`,
      {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
      }
    );
    const unsplash = await unsplashRes.json();
    for (const photo of unsplash.results ?? []) {
      results.push({
        id: `unsplash-${photo.id}`,
        url: photo.urls.regular,
        thumbUrl: photo.urls.small,
        source: "unsplash",
        attribution: `Photo by ${photo.user.name} on Unsplash`,
        width: photo.width,
        height: photo.height,
      });
    }

    // Pexels API
    const pexelsRes = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${Math.floor(perPage / 2)}`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY!,
        },
      }
    );
    const pexels = await pexelsRes.json();
    for (const photo of pexels.photos ?? []) {
      results.push({
        id: `pexels-${photo.id}`,
        url: photo.src.large,
        thumbUrl: photo.src.medium,
        source: "pexels",
        attribution: `Photo by ${photo.photographer} on Pexels`,
        width: photo.width,
        height: photo.height,
      });
    }

    return results;
  },
});

interface ImageResult {
  id: string;
  url: string;
  thumbUrl: string;
  source: "unsplash" | "pexels";
  attribution: string;
  width: number;
  height: number;
}
```

---

## 5. API Key 암호화 설계

### 5.1 암호화/복호화 유틸리티

```typescript
// convex/lib/crypto.ts
"use node";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.AES_ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

### 5.2 API Key 저장 플로우

```
사용자 입력 (평문 Key) → mutation: saveApiKey → encrypt(key) → DB 저장
Action 호출 시 → DB에서 읽기 → decrypt(encryptedKey) → Gemini API 호출
```

---

## 6. Page & Component Structure

### 6.1 Page Routing

```
app/
├── layout.tsx                    # ConvexAuthNextjsServerProvider
├── page.tsx                      # 랜딩 (미인증→마케팅, 인증→/dashboard 리다이렉트)
├── login/page.tsx                # 로그인 (Email + Google)
├── signup/page.tsx               # 회원가입
├── dashboard/page.tsx            # 프로젝트 대시보드
├── create/page.tsx               # 새 카드뉴스 생성 (소스 입력)
├── edit/[projectId]/page.tsx     # 편집기
└── settings/page.tsx             # API Key + 기본 설정
```

### 6.2 Component Structure

```
src/components/
├── providers/
│   └── ConvexClientProvider.tsx      # Convex + Auth Provider
├── auth/
│   ├── LoginForm.tsx                 # 이메일/비밀번호 + Google 로그인
│   ├── SignupForm.tsx                # 회원가입 폼
│   └── AuthGuard.tsx                 # 인증 상태 체크 래퍼
├── layout/
│   ├── Sidebar.tsx                   # 사이드바 (기존 유지 + 확장)
│   └── Header.tsx                    # 헤더 (사용자 정보 + 로그아웃)
├── dashboard/
│   ├── ProjectGrid.tsx               # 프로젝트 카드 그리드
│   ├── ProjectCard.tsx               # 개별 프로젝트 카드
│   └── NewProjectButton.tsx          # 새 프로젝트 생성 버튼
├── create/
│   ├── SourceSelector.tsx            # 소스 타입 4탭 (URL/SNS/검색/텍스트)
│   ├── UrlInput.tsx                  # URL 입력 + Firecrawl 크롤링
│   ├── SnsInput.tsx                  # 새: SNS 스크랩 (WithGenie API)
│   ├── SearchInput.tsx               # WithGenie Search + Gemini fallback
│   ├── TextInput.tsx                 # 텍스트 직접 입력 (기존 확장)
│   └── SourcePreview.tsx             # 수집된 자료 미리보기
├── generate/
│   └── GenerationProgress.tsx        # 생성 진행률 (기존 확장, Convex 구독)
├── editor/
│   ├── EditorPanel.tsx               # 편집 패널 (기존 Convex 연동)
│   ├── ContentFields.tsx             # 콘텐츠 편집 (기존 유지)
│   ├── SlideNavigation.tsx           # 슬라이드 네비게이션 (기존 유지)
│   ├── SlideActions.tsx              # 슬라이드 액션 (기존 유지)
│   ├── LayoutSelector.tsx            # 레이아웃 선택 (기존 유지)
│   ├── ColorPresets.tsx              # 색상 프리셋 (기존 → 그라데이션 확장)
│   ├── GradientPicker.tsx            # 새: 그라데이션 선택기
│   ├── FontSelector.tsx              # 새: Google Fonts 한글 선택기
│   ├── ImageControls.tsx             # 이미지 컨트롤 (기존 유지)
│   └── ImageSearchPanel.tsx          # 새: Unsplash/Pexels 이미지 검색
├── preview/
│   ├── CardSlideRenderer.tsx         # 슬라이드 렌더러 (기존 + 폰트/그라데이션)
│   ├── PhoneMockup.tsx               # 폰 목업 (기존 유지)
│   ├── InstagramFrame.tsx            # 인스타 프레임 (기존 유지)
│   └── SlideIndicator.tsx            # 슬라이드 인디케이터 (기존 유지)
├── export/
│   ├── ExportButton.tsx              # 내보내기 버튼 (PNG/ZIP/PDF)
│   └── ExportModal.tsx               # 내보내기 옵션 모달
└── settings/
    ├── ApiKeyForm.tsx                # Gemini API Key 입력/관리
    └── DefaultSettings.tsx           # 기본 글씨체/배경 설정
```

---

## 7. Google Fonts 한글 지원

### 7.1 지원 폰트 목록

```typescript
// src/data/fonts.ts
export const KOREAN_FONTS = [
  { id: "pretendard", name: "Pretendard", family: "'Pretendard', sans-serif", weight: [400, 600, 700] },
  { id: "noto-sans-kr", name: "Noto Sans KR", family: "'Noto Sans KR', sans-serif", weight: [400, 500, 700] },
  { id: "nanum-gothic", name: "나눔고딕", family: "'Nanum Gothic', sans-serif", weight: [400, 700, 800] },
  { id: "nanum-myeongjo", name: "나눔명조", family: "'Nanum Myeongjo', serif", weight: [400, 700, 800] },
  { id: "nanum-square", name: "나눔스퀘어", family: "'NanumSquare', sans-serif", weight: [400, 700, 800] },
  { id: "gmarket-sans", name: "G마켓 산스", family: "'GmarketSans', sans-serif", weight: [300, 500, 700] },
  { id: "spoqa-han-sans", name: "스포카 한 산스", family: "'Spoqa Han Sans Neo', sans-serif", weight: [400, 500, 700] },
  { id: "wanted-sans", name: "Wanted Sans", family: "'Wanted Sans', sans-serif", weight: [400, 600, 700] },
] as const;
```

### 7.2 폰트 로딩 전략

- `next/font/google`로 정적 로딩 (Noto Sans KR, Nanum Gothic 등)
- 커스텀 폰트(Pretendard, GmarketSans 등)는 CDN `@font-face`로 로딩
- 슬라이드 렌더링 시 선택된 폰트를 `style` prop으로 주입

---

## 8. 배경색/그라데이션 설계

### 8.1 확장된 프리셋

```typescript
// src/data/presets.ts
export const COLOR_PRESETS = [
  // Solid
  { id: "dark", name: "다크", bgType: "solid", bgColor: "#0f0f0f", textColor: "#ffffff", accentColor: "#4ae3c0" },
  { id: "light", name: "라이트", bgType: "solid", bgColor: "#ffffff", textColor: "#111111", accentColor: "#0d9488" },
  { id: "navy", name: "네이비", bgType: "solid", bgColor: "#1a1a4e", textColor: "#ffffff", accentColor: "#ffd700" },
  { id: "cream", name: "크림", bgType: "solid", bgColor: "#f5f0e8", textColor: "#2d2d2d", accentColor: "#b8860b" },
  // Gradient
  { id: "sunset", name: "선셋", bgType: "gradient", gradientFrom: "#f093fb", gradientTo: "#f5576c", gradientDirection: "135deg", textColor: "#ffffff", accentColor: "#ffd700" },
  { id: "ocean", name: "오션", bgType: "gradient", gradientFrom: "#667eea", gradientTo: "#764ba2", gradientDirection: "135deg", textColor: "#ffffff", accentColor: "#00f2fe" },
  { id: "forest", name: "포레스트", bgType: "gradient", gradientFrom: "#11998e", gradientTo: "#38ef7d", gradientDirection: "135deg", textColor: "#ffffff", accentColor: "#ffd700" },
  { id: "midnight", name: "미드나잇", bgType: "gradient", gradientFrom: "#0f0c29", gradientTo: "#302b63", gradientDirection: "135deg", textColor: "#ffffff", accentColor: "#4ae3c0" },
] as const;
```

### 8.2 커스텀 그라데이션

- `GradientPicker` 컴포넌트: from/to 색상 + 방향(deg) 선택
- 실시간 미리보기 CSS: `background: linear-gradient({direction}, {from}, {to})`

---

## 9. 내보내기 설계

### 9.1 개별 PNG (기존)

```typescript
// html-to-image의 toPng 사용 (기존 export-png.ts 유지)
```

### 9.2 전체 PNG ZIP

```typescript
import JSZip from "jszip";
import { toPng } from "html-to-image";

async function exportAllPng(slideElements: HTMLElement[], projectTitle: string) {
  const zip = new JSZip();
  for (let i = 0; i < slideElements.length; i++) {
    const dataUrl = await toPng(slideElements[i], { width: 1080, height: 1350 });
    const base64 = dataUrl.split(",")[1];
    zip.file(`${projectTitle}_slide_${i + 1}.png`, base64, { base64: true });
  }
  const blob = await zip.generateAsync({ type: "blob" });
  // trigger download
}
```

### 9.3 PDF

```typescript
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

async function exportPdf(slideElements: HTMLElement[], projectTitle: string) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [1080, 1350] });
  for (let i = 0; i < slideElements.length; i++) {
    if (i > 0) pdf.addPage([1080, 1350]);
    const dataUrl = await toPng(slideElements[i], { width: 1080, height: 1350 });
    pdf.addImage(dataUrl, "PNG", 0, 0, 1080, 1350);
  }
  pdf.save(`${projectTitle}.pdf`);
}
```

---

## 10. Environment Variables (Complete)

```bash
# Convex
CONVEX_DEPLOYMENT=                 # npx convex dev 자동 설정
NEXT_PUBLIC_CONVEX_URL=            # Convex deployment public URL

# Convex Auth - Google OAuth
AUTH_GOOGLE_ID=                    # Google Cloud OAuth Client ID
AUTH_GOOGLE_SECRET=                # Google Cloud OAuth Client Secret

# Server-side APIs (Convex environment variables)
FIRECRAWL_API_KEY=                 # Firecrawl API Key (서버 공용)
WITHGENIE_API_KEY=                 # WithGenie API Key (SNS 스크랩 + 웹 검색)
UNSPLASH_ACCESS_KEY=               # Unsplash Developer App Access Key
PEXELS_API_KEY=                    # Pexels API Key

# Encryption
AES_ENCRYPTION_KEY=                # 32-byte hex key for API Key 암호화

# Note: GEMINI_API_KEY는 사용자별 DB 암호화 저장
# 서버 환경변수에는 넣지 않음
```

---

## 11. Data Flow Diagrams

### 11.1 소스 수집 플로우

```
[사용자] → SourceSelector (URL/SNS/검색/텍스트 선택)
  │
  ├─ URL 선택 → UrlInput → useAction(collectFromUrl)
  │   → Convex Action → Firecrawl API → markdown 추출
  │   → Gemini 요약 → sources 테이블 저장
  │   → project.sourceContent 업데이트
  │
  ├─ SNS 선택 → SnsInput (플랫폼/사용자명 입력)
  │   → useAction(collectFromSns)
  │   → Convex Action → WithGenie /scrape API
  │     (platform: threads|instagram|facebook|x)
  │   → Gemini 요약 → sources 테이블 저장 (type: "sns")
  │   → project.sourceContent 업데이트
  │
  ├─ 검색 선택 → SearchInput → useAction(collectFromSearch)
  │   → Convex Action → WithGenie /search API (primary)
  │     → 실패 시 Gemini + googleSearch tool (fallback)
  │   → Gemini 요약 → sources 테이블 저장
  │
  └─ 텍스트 선택 → TextInput → useMutation(updateProject)
      → project.sourceContent = 입력 텍스트
  │
  ▼
  SourcePreview (수집된 자료 미리보기)
  → "카드뉴스 생성" 버튼 → 11.2로
```

### 11.2 AI 생성 플로우

```
useAction(generateCardNews) 호출
  │
  ▼ Convex Action
  project.status = "generating"
  │
  ├─ Phase 1: Gemini Structured Output (JSON)
  │   → 슬라이드 구조화 (제목/본문/카테고리)
  │   → project.progress mutation (30%)
  │
  ├─ Phase 2: slides 테이블에 개별 insert
  │   → 각 슬라이드 완료시 progress mutation
  │   → 프론트: useQuery로 실시간 구독
  │
  └─ project.status = "completed"
      → /edit/[projectId] 리다이렉트
```

### 11.3 편집 플로우

```
[편집기 페이지]
  useQuery(getSlides, { projectId }) → 실시간 슬라이드 구독
  │
  ├─ 콘텐츠 편집 → useMutation(updateSlide) → DB 자동 저장
  ├─ 스타일 변경 → useMutation(updateSlideStyle) → DB 자동 저장
  ├─ 이미지 검색 → useAction(searchImages) → 결과 표시
  ├─ 이미지 업로드 → generateUploadUrl → POST → updateSlideImage
  └─ 슬라이드 추가/삭제 → createSlide/deleteSlide mutations
```

---

## 12. Implementation Order

### Sprint 1: Core Infrastructure (Week 1)

| # | Task | Dependencies | Files |
|---|------|-------------|-------|
| 1 | Convex 프로젝트 초기화 + Schema | - | `convex/schema.ts`, `convex/tsconfig.json` |
| 2 | Convex Auth 설정 | #1 | `convex/auth.ts`, `convex/auth.config.ts`, `middleware.ts` |
| 3 | Next.js Convex Provider 통합 | #1 | `ConvexClientProvider.tsx`, `app/layout.tsx` |
| 4 | 로그인/회원가입 UI | #2, #3 | `app/login/`, `app/signup/`, `components/auth/` |
| 5 | 설정 페이지 (API Key) | #2 | `app/settings/`, `convex/userProfiles.ts`, `convex/lib/crypto.ts` |
| 6 | 프로젝트 CRUD + 대시보드 | #3 | `convex/projects.ts`, `app/dashboard/`, `components/dashboard/` |
| 7 | 소스 수집 Actions | #5, #6 | `convex/actions/collect.ts`, `components/create/` |
| 8 | AI 카드뉴스 생성 Action | #7 | `convex/actions/generate.ts`, `components/generate/` |

### Sprint 2: Editor & Export (Week 2)

| # | Task | Dependencies | Files |
|---|------|-------------|-------|
| 9 | 편집기 Convex 연동 | #8 | `convex/slides.ts`, `components/editor/` 리워크 |
| 10 | 폰트 선택기 | #9 | `FontSelector.tsx`, `src/data/fonts.ts` |
| 11 | 배경색/그라데이션 | #9 | `GradientPicker.tsx`, `src/data/presets.ts` 확장 |
| 12 | 이미지 검색 통합 | #9 | `convex/actions/images.ts`, `ImageSearchPanel.tsx` |
| 13 | PNG ZIP 내보내기 | #9 | `ExportButton.tsx`, `ExportModal.tsx` |
| 14 | PDF 내보내기 | #13 | `export-pdf.ts` 추가 |
| 15 | UI 폴리싱 + 반응형 | #10~14 | 전체 컴포넌트 |
| 16 | 테스트 + 배포 | #15 | Vercel + Convex Cloud |

---

## 13. Migration from MVP

### 제거

| File | Replacement |
|------|-------------|
| `src/lib/storage.ts` | Convex DB (projects, slides tables) |
| `src/app/api/generate/route.ts` | `convex/actions/generate.ts` |
| `src/app/api/improve/route.ts` | `convex/actions/generate.ts` (improveSlide) |
| `src/lib/gemini.ts` | Convex Action 내 직접 호출 |
| `src/store/card-news-store.ts` | Convex useQuery/useMutation (서버 상태) + 최소 Zustand (UI 상태) |

### 유지/확장

| File | Change |
|------|--------|
| `src/data/layouts.ts` | 유지 (클라이언트 레이아웃 정의) |
| `src/data/presets.ts` | 확장 (그라데이션 프리셋 추가) |
| `src/lib/prompts.ts` | Convex Action 내로 이동 |
| `src/lib/sanitize.ts` | 유지 |
| `src/lib/export-png.ts` | 유지 + ZIP/PDF 확장 |
| `src/components/preview/*` | 유지 + 폰트/그라데이션 대응 |
| `src/components/editor/*` | Convex mutation 연동 리워크 |

### 신규 패키지

```bash
npm install convex @convex-dev/auth @auth/core
npm install jszip jspdf
npm install -D @mendable/firecrawl-js  # convex/actions에서만 사용
```

---

## 14. Security Considerations

| Area | Measure |
|------|---------|
| API Key 저장 | AES-256-GCM 암호화, 서버에서만 복호화 |
| 인증 | Convex Auth (cookie-based session), middleware 라우트 보호 |
| CSRF | ConvexAuthNextjsServerProvider 쿠키 기반, GET에서 side-effect 금지 |
| HTML 살균 | DOMPurify로 AI 생성 HTML sanitize (기존 유지) |
| 환경 변수 | 서버 키(Firecrawl, AES)는 Convex env, 클라이언트 노출 없음 |
| Rate Limit | Unsplash 50req/hr, Pexels 200req/hr — 클라이언트 캐싱으로 완화 |
