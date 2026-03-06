# Design: Saved URLs (나만의 URL 라이브러리)

## Executive Summary

| Item | Detail |
|------|--------|
| Feature | Saved URLs - 나만의 URL 라이브러리 |
| Plan Reference | `docs/01-plan/features/saved-urls.plan.md` |
| Created | 2026-03-07 |
| Status | Design |

### Value Delivered

| Perspective | Description |
|-------------|-------------|
| Problem | 반복적으로 사용하는 URL을 매번 복사/붙여넣기 해야 하며, 관심 콘텐츠 소스를 체계적으로 관리할 방법이 없음 |
| Solution | URL 저장 시 메타데이터 자동 생성(썸네일, 제목, 설명) + 폴더 분류 + 검색 + 원클릭 소스 수집 |
| Function UX Effect | 저장된 URL 선택만으로 즉시 소스 수집이 시작되어 콘텐츠 제작 속도 향상 |
| Core Value | 개인 콘텐츠 소스 라이브러리를 구축하여 반복 작업 제거 및 콘텐츠 제작 워크플로우 최적화 |

---

## 1. Database Schema

### 1.1 savedUrlFolders 테이블

```typescript
// convex/schema.ts 에 추가
savedUrlFolders: defineTable({
  userId: v.id("users"),
  name: v.string(),
  order: v.number(),        // 폴더 정렬 순서
  createdAt: v.number(),
}).index("by_userId", ["userId"])
```

**설계 근거:**
- `order` 필드로 사용자 정의 순서 지원 (MVP에서는 생성순, 추후 드래그 정렬 확장 가능)
- `userId` 인덱스로 사용자별 폴더 목록 빠른 조회

### 1.2 savedUrls 테이블

```typescript
// convex/schema.ts 에 추가
savedUrls: defineTable({
  userId: v.id("users"),
  url: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),   // OG 이미지 URL
  folderId: v.optional(v.id("savedUrlFolders")),  // null = 미분류
  createdAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_folderId", ["userId", "folderId"])
  .index("by_userId_createdAt", ["userId", "createdAt"])
  .searchIndex("search_savedUrls", {
    searchField: "title",
    filterFields: ["userId"],
  })
```

**설계 근거:**
- `folderId`가 `optional`인 이유: 미분류 URL 허용, 폴더 삭제 시 null로 전환
- `searchIndex`로 Convex 네이티브 풀텍스트 검색 활용 (별도 검색 엔진 불필요)
- `by_userId_createdAt` 인덱스: 최신순 정렬 조회
- `thumbnailUrl`은 외부 OG 이미지 URL 저장 (Convex Storage 미사용 — 외부 URL 직접 참조로 스토리지 비용 절감)

---

## 2. Convex Backend Functions

### 2.1 savedUrlFolders.ts

```typescript
// convex/savedUrlFolders.ts

// ─── Queries ────────────────────────────────────────────────

/**
 * listFolders — 사용자의 모든 폴더 목록 + 각 폴더별 URL 개수
 * @returns { _id, name, order, urlCount }[]
 */
export const listFolders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const folders = await ctx.db
      .query("savedUrlFolders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // 각 폴더별 URL 개수 집계
    const foldersWithCount = await Promise.all(
      folders.map(async (folder) => {
        const urls = await ctx.db
          .query("savedUrls")
          .withIndex("by_userId_folderId", (q) =>
            q.eq("userId", userId).eq("folderId", folder._id)
          )
          .collect();
        return { ...folder, urlCount: urls.length };
      })
    );

    // 미분류 URL 개수
    const uncategorized = await ctx.db
      .query("savedUrls")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("folderId"), undefined))
      .collect();

    return {
      folders: foldersWithCount.sort((a, b) => a.order - b.order),
      uncategorizedCount: uncategorized.length,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────

/**
 * createFolder — 새 폴더 생성
 * order는 기존 폴더 최대값 + 1
 */
export const createFolder = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("savedUrlFolders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const maxOrder = existing.reduce((max, f) => Math.max(max, f.order), 0);

    return ctx.db.insert("savedUrlFolders", {
      userId,
      name,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

/**
 * renameFolder — 폴더 이름 변경
 */
export const renameFolder = mutation({
  args: { folderId: v.id("savedUrlFolders"), name: v.string() },
  handler: async (ctx, { folderId, name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(folderId);
    if (!folder || folder.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(folderId, { name });
  },
});

/**
 * deleteFolder — 폴더 삭제, 내부 URL의 folderId를 undefined로 변경
 */
export const deleteFolder = mutation({
  args: { folderId: v.id("savedUrlFolders") },
  handler: async (ctx, { folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(folderId);
    if (!folder || folder.userId !== userId) throw new Error("Not found");

    // 폴더 내 URL들의 folderId를 undefined로 변경 (데이터 보존)
    const urls = await ctx.db
      .query("savedUrls")
      .withIndex("by_userId_folderId", (q) =>
        q.eq("userId", userId).eq("folderId", folderId)
      )
      .collect();

    for (const url of urls) {
      await ctx.db.patch(url._id, { folderId: undefined });
    }

    await ctx.db.delete(folderId);
  },
});
```

### 2.2 savedUrls.ts

```typescript
// convex/savedUrls.ts

// ─── Queries ────────────────────────────────────────────────

/**
 * listByFolder — 폴더별 URL 목록 (최신순)
 * folderId가 undefined이면 전체, "uncategorized"이면 미분류
 */
export const listByFolder = query({
  args: {
    folderId: v.optional(v.union(v.id("savedUrlFolders"), v.literal("uncategorized"))),
  },
  handler: async (ctx, { folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (folderId === undefined) {
      // 전체
      return ctx.db
        .query("savedUrls")
        .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }

    if (folderId === "uncategorized") {
      // 미분류
      return ctx.db
        .query("savedUrls")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("folderId"), undefined))
        .order("desc")
        .collect();
    }

    // 특정 폴더
    return ctx.db
      .query("savedUrls")
      .withIndex("by_userId_folderId", (q) =>
        q.eq("userId", userId).eq("folderId", folderId)
      )
      .order("desc")
      .collect();
  },
});

/**
 * search — 제목 풀텍스트 검색
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (!query.trim()) return [];

    return ctx.db
      .query("savedUrls")
      .withSearchIndex("search_savedUrls", (q) =>
        q.search("title", query).eq("userId", userId)
      )
      .take(50);
  },
});

/**
 * getTotalCount — 사용자의 전체 저장 URL 개수
 */
export const getTotalCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const urls = await ctx.db
      .query("savedUrls")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return urls.length;
  },
});

// ─── Mutations ──────────────────────────────────────────────

/**
 * create — URL 저장 (메타데이터 포함)
 */
export const create = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    folderId: v.optional(v.id("savedUrlFolders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return ctx.db.insert("savedUrls", {
      userId,
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * remove — URL 삭제
 */
export const remove = mutation({
  args: { id: v.id("savedUrls") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const savedUrl = await ctx.db.get(id);
    if (!savedUrl || savedUrl.userId !== userId) throw new Error("Not found");

    await ctx.db.delete(id);
  },
});

/**
 * moveToFolder — URL의 폴더 이동
 */
export const moveToFolder = mutation({
  args: {
    id: v.id("savedUrls"),
    folderId: v.optional(v.id("savedUrlFolders")),
  },
  handler: async (ctx, { id, folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const savedUrl = await ctx.db.get(id);
    if (!savedUrl || savedUrl.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(id, { folderId });
  },
});
```

### 2.3 actions/savedUrls.ts — 메타데이터 추출

```typescript
// convex/actions/savedUrls.ts
"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import Firecrawl from "@mendable/firecrawl-js";

/**
 * extractMetadata — URL에서 OG 메타데이터 추출
 *
 * Flow:
 * 1. Firecrawl scrape (formats: ["metadata"]) — markdown 없이 메타데이터만
 * 2. OG title, description, image 추출
 * 3. savedUrls.create 뮤테이션 호출하여 DB 저장
 *
 * Firecrawl의 metadata 전용 옵션 사용으로 크레딧 절약
 */
export const extractAndSave = action({
  args: {
    url: v.string(),
    folderId: v.optional(v.id("savedUrlFolders")),
  },
  handler: async (ctx, { url, folderId }) => {
    const firecrawl = new Firecrawl({
      apiKey: process.env.FIRECRAWL_API_KEY!,
    });

    let title = url;
    let description: string | undefined;
    let thumbnailUrl: string | undefined;

    try {
      const result = await firecrawl.scrape(url, {
        formats: ["markdown"],
      });

      const metadata = (result as {
        metadata?: {
          title?: string;
          description?: string;
          ogImage?: string;
          "og:image"?: string;
          "og:title"?: string;
          "og:description"?: string;
        };
      }).metadata;

      if (metadata) {
        title = metadata["og:title"] || metadata.title || url;
        description = metadata["og:description"] || metadata.description;
        thumbnailUrl = metadata["og:image"] || metadata.ogImage;
      }
    } catch {
      // 메타데이터 추출 실패 시 URL을 제목으로 사용
    }

    // DB에 저장
    const id = await ctx.runMutation(api.savedUrls.create, {
      url,
      title,
      description,
      thumbnailUrl,
      folderId,
    });

    return { id, title, description, thumbnailUrl };
  },
});
```

**설계 포인트:**
- Firecrawl `scrape`를 재사용하되 메타데이터만 추출 — 기존 `collectFromUrl` 패턴과 일관
- 메타데이터 추출 실패해도 URL 자체를 제목으로 저장 (graceful degradation)
- 이 액션은 Gemini API 불필요 (API 키 없어도 URL 저장 가능)

---

## 3. Frontend Components

### 3.1 Component Tree

```
create/page.tsx
  └── (activeTab === 'library')
      └── SavedUrlsTab/index.tsx
          ├── SearchBar.tsx
          ├── FolderSidebar.tsx
          │   └── FolderItem (inline)
          ├── SavedUrlGrid.tsx
          │   └── SavedUrlCard.tsx
          └── AddUrlDialog.tsx
```

### 3.2 SavedUrlsTab/index.tsx — 탭 메인 컨테이너

```typescript
// src/components/create/SavedUrlsTab/index.tsx
'use client'

interface SavedUrlsTabProps {
  onSelectUrl: (url: string) => void;  // URL 선택 시 부모에게 전달
}
```

**State 관리:**
```typescript
const [selectedFolderId, setSelectedFolderId] = useState<
  Id<'savedUrlFolders'> | 'uncategorized' | undefined
>(undefined);  // undefined = 전체
const [searchQuery, setSearchQuery] = useState('');
const [showAddDialog, setShowAddDialog] = useState(false);
```

**Convex Hooks:**
```typescript
const folderData = useQuery(api.savedUrlFolders.listFolders);
const urls = useQuery(
  searchQuery
    ? api.savedUrls.search
    : api.savedUrls.listByFolder,
  searchQuery
    ? { query: searchQuery }
    : { folderId: selectedFolderId }
);
const totalCount = useQuery(api.savedUrls.getTotalCount);
```

**레이아웃:**
```
┌─────────────────────────────────────────────────────┐
│ [Search input ...]                  [+ URL 추가]    │
├──────────────┬──────────────────────────────────────┤
│ FolderSidebar│        SavedUrlGrid                  │
│              │  (3열 카드 그리드, 모바일 2열)         │
│              │                                       │
│              │                                       │
└──────────────┴──────────────────────────────────────┘
```

### 3.3 FolderSidebar.tsx

```typescript
interface FolderSidebarProps {
  folders: { _id: Id<'savedUrlFolders'>; name: string; urlCount: number }[];
  uncategorizedCount: number;
  totalCount: number;
  selectedFolderId: Id<'savedUrlFolders'> | 'uncategorized' | undefined;
  onSelectFolder: (id: Id<'savedUrlFolders'> | 'uncategorized' | undefined) => void;
}
```

**UI 요소:**
- "전체" 항목 (항상 상단, `totalCount` 표시)
- 사용자 폴더 목록 (`urlCount` 표시)
- "미분류" 항목 (하단, `uncategorizedCount` 표시)
- "+ 새 폴더" 버튼 (하단)
- 각 폴더: 우클릭 또는 `...` 버튼 → 이름 변경, 삭제 메뉴

**인라인 편집:**
- 폴더 이름 클릭 시 inline input으로 전환
- Enter로 저장, Esc로 취소
- `renameFolder` 뮤테이션 호출

**모바일 반응형:**
- 768px 미만: 수평 스크롤 chip bar로 변환
```
[전체(24)] [AI(8)] [마케팅(6)] [트렌드(5)] [미분류(5)] [+]
```

### 3.4 SavedUrlCard.tsx

```typescript
interface SavedUrlCardProps {
  savedUrl: {
    _id: Id<'savedUrls'>;
    url: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    folderId?: Id<'savedUrlFolders'>;
    createdAt: number;
  };
  folderName?: string;
  onSelect: (url: string) => void;
  onDelete: (id: Id<'savedUrls'>) => void;
  onMoveToFolder: (id: Id<'savedUrls'>, folderId?: Id<'savedUrlFolders'>) => void;
}
```

**카드 레이아웃 (세로형):**
```
┌──────────────────────┐
│ ┌──────────────────┐ │
│ │   Thumbnail      │ │  ← 16:9, object-cover
│ │   (or fallback)  │ │     onError → 도메인 첫글자 placeholder
│ └──────────────────┘ │
│ Title (1줄 clamp)    │  ← text-sm font-semibold
│ Description text     │  ← text-xs text-muted (2줄 line-clamp-2)
│ 📁 AI    ⋯           │  ← 폴더명 + 더보기
└──────────────────────┘
```

**인터랙션:**
- **클릭**: `onSelect(url)` → 부모 컴포넌트에서 수집 플로우 시작
- **더보기(⋯)**: 드롭다운 메뉴
  - 폴더 이동 (서브메뉴로 폴더 목록)
  - URL 복사
  - 삭제

**Thumbnail Fallback 전략:**
```typescript
// 썸네일 없거나 로드 실패 시
const FallbackThumbnail = ({ url }: { url: string }) => {
  const domain = new URL(url).hostname.replace('www.', '');
  const initial = domain.charAt(0).toUpperCase();
  return (
    <div className="aspect-video bg-surface flex items-center justify-center">
      <span className="text-2xl font-bold text-muted">{initial}</span>
    </div>
  );
};
```

### 3.5 AddUrlDialog.tsx

```typescript
interface AddUrlDialogProps {
  open: boolean;
  onClose: () => void;
  folders: { _id: Id<'savedUrlFolders'>; name: string }[];
}
```

**State:**
```typescript
const [url, setUrl] = useState('');
const [selectedFolderId, setSelectedFolderId] = useState<Id<'savedUrlFolders'> | undefined>();
const [isExtracting, setIsExtracting] = useState(false);
const [preview, setPreview] = useState<{
  title: string;
  description?: string;
  thumbnailUrl?: string;
} | null>(null);
```

**Flow:**
```
1. URL 입력
2. "추가" 클릭 → extractAndSave 액션 호출
3. 로딩 스피너 표시 (isExtracting)
4. 완료 시 자동 닫기 + Convex subscription으로 카드 실시간 추가
```

**다이얼로그 구현:**
- HTML `<dialog>` 네이티브 요소 사용 (shadcn 미사용 프로젝트)
- backdrop-click으로 닫기
- 기존 `ExportModal`, `ImproveModal` 패턴과 동일한 오버레이 스타일

```
┌─ URL 추가 ──────────────────────────────────┐
│                                              │
│ URL                                          │
│ ┌──────────────────────────────────────────┐ │
│ │ https://...                              │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ 폴더 (선택)                                   │
│ ┌──────────────────────────────────────────┐ │
│ │ 미분류                               ▾  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│                    [취소]  [추가]             │
└──────────────────────────────────────────────┘
```

### 3.6 SearchBar.tsx

```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}
```

- Debounced input (300ms) → Convex `search` 쿼리 트리거
- 검색 모드 진입 시 폴더 필터 비활성화 (검색은 전체 대상)
- 검색어 지우면 폴더 필터 모드로 복귀
- SearchIcon 좌측 배치, X 버튼 우측 (검색어 있을 때)

---

## 4. Create Page Integration

### 4.1 SourceType 확장

```typescript
// create/page.tsx
type SourceType = 'url' | 'sns' | 'search' | 'text' | 'youtube' | 'library'
```

**주의:** `library`는 프론트엔드 전용 탭 ID. 실제 수집 시 `sourceType: "url"`로 프로젝트 생성.

### 4.2 탭 추가

```typescript
import { Bookmark } from 'lucide-react'

const SOURCE_TABS = [
  { id: 'url', label: 'URL', icon: <ExternalLink size={18} />, desc: '웹페이지, 뉴스, 블로그 URL' },
  { id: 'youtube', label: 'YouTube', icon: <Play size={18} />, desc: '영상 분석 → 카드뉴스 변환' },
  { id: 'sns', label: 'SNS', icon: <AtSign size={18} />, desc: 'Threads, Instagram, X' },
  { id: 'search', label: '검색', icon: <SearchIcon size={18} />, desc: '키워드로 AI 검색' },
  { id: 'text', label: '텍스트', icon: <AlignJustify size={18} />, desc: '직접 내용 입력' },
  { id: 'library', label: '라이브러리', icon: <Bookmark size={18} />, desc: '저장된 URL에서 빠르게 수집' },
]
```

### 4.3 수집 연결 (handleCollect 확장 불필요)

라이브러리 탭에서는 `handleCollect`를 직접 호출하지 않음. 대신:

```typescript
// SavedUrlsTab의 onSelectUrl 콜백
const handleLibrarySelect = (selectedUrl: string) => {
  setUrl(selectedUrl);       // URL state 설정
  setActiveTab('url');       // URL 탭으로 전환
  // → 사용자가 "소스 수집 시작" 버튼 클릭으로 수집 진행
};
```

**설계 결정:** 자동 수집 대신 URL 탭으로 전환 + URL 자동 입력 방식 채택.
- 이유 1: 사용자에게 수집 전 확인 기회 제공
- 이유 2: `handleCollect`의 탭별 분기 로직 변경 최소화
- 이유 3: `canCollect()` 검증이 자연스럽게 적용

### 4.4 탭 영역 렌더링

```tsx
{/* 기존 탭 렌더링 ... */}

{activeTab === 'library' && (
  <SavedUrlsTab onSelectUrl={handleLibrarySelect} />
)}
```

---

## 5. Data Flow Diagrams

### 5.1 URL 저장 Flow

```
[사용자: URL 입력 + 폴더 선택]
    │
    ▼
AddUrlDialog → extractAndSave 액션 호출
    │
    ▼
[Convex Action: extractAndSave]
    ├── Firecrawl.scrape(url) → metadata 추출
    │   ├── og:title → title
    │   ├── og:description → description
    │   └── og:image → thumbnailUrl
    │
    ▼
savedUrls.create 뮤테이션
    │
    ▼
[DB: savedUrls 레코드 생성]
    │
    ▼
[Convex Subscription → UI 실시간 업데이트]
```

### 5.2 URL 선택 → 수집 Flow

```
[사용자: SavedUrlCard 클릭]
    │
    ▼
onSelectUrl(url) 콜백
    │
    ▼
setUrl(url) + setActiveTab('url')
    │
    ▼
[URL 탭으로 전환, URL 자동 입력됨]
    │
    ▼
[사용자: "소스 수집 시작" 클릭]
    │
    ▼
handleCollect() → 기존 collectFromUrl 플로우
    │
    ▼
[수집 → 요약 → 미리보기 → 생성]
```

### 5.3 폴더 삭제 Flow

```
[사용자: 폴더 삭제 클릭]
    │
    ▼
확인 다이얼로그 표시
    │
    ▼
deleteFolder 뮤테이션
    ├── 폴더 내 URL들의 folderId → undefined (미분류)
    └── 폴더 레코드 삭제
    │
    ▼
[UI: 미분류 카운트 증가, 폴더 목록에서 제거]
```

---

## 6. API Specification

### 6.1 Queries

| Function | Args | Returns | Index |
|----------|------|---------|-------|
| `savedUrlFolders.listFolders` | — | `{ folders: Folder[], uncategorizedCount: number }` | `by_userId` |
| `savedUrls.listByFolder` | `folderId?` | `SavedUrl[]` | `by_userId_folderId`, `by_userId_createdAt` |
| `savedUrls.search` | `query: string` | `SavedUrl[]` (max 50) | `search_savedUrls` |
| `savedUrls.getTotalCount` | — | `number` | `by_userId` |

### 6.2 Mutations

| Function | Args | Returns | Side Effects |
|----------|------|---------|-------------|
| `savedUrlFolders.createFolder` | `name` | `Id` | — |
| `savedUrlFolders.renameFolder` | `folderId, name` | — | — |
| `savedUrlFolders.deleteFolder` | `folderId` | — | 내부 URL → 미분류 |
| `savedUrls.create` | `url, title, description?, thumbnailUrl?, folderId?` | `Id` | — |
| `savedUrls.remove` | `id` | — | — |
| `savedUrls.moveToFolder` | `id, folderId?` | — | — |

### 6.3 Actions

| Function | Args | Returns | External API |
|----------|------|---------|-------------|
| `actions.savedUrls.extractAndSave` | `url, folderId?` | `{ id, title, description?, thumbnailUrl? }` | Firecrawl |

---

## 7. Responsive Design

### 7.1 Breakpoints

| Breakpoint | FolderSidebar | Grid Columns | Card Size |
|------------|--------------|-------------|-----------|
| < 640px (sm) | 수평 chip bar | 2열 | compact |
| 640-1024px (md) | 수평 chip bar | 3열 | normal |
| >= 1024px (lg) | 좌측 세로 사이드바 (160px) | 3열 | normal |

### 7.2 모바일 폴더 Chip Bar

```
[전체(24)] [AI(8)] [마케팅(6)] ... ← 수평 스크롤
```
- `overflow-x-auto`, `flex-nowrap`, `gap-2`
- 선택된 chip: `bg-accent/10 border-accent text-accent`

---

## 8. Error Handling

| Scenario | Handling |
|----------|---------|
| Firecrawl 메타데이터 추출 실패 | URL을 제목으로 사용, 썸네일 없이 저장 |
| 중복 URL 저장 시도 | 허용 (같은 URL 다른 폴더에 저장 가능) |
| 외부 썸네일 이미지 깨짐 | `onError` → FallbackThumbnail (도메인 첫글자) |
| 폴더 이름 빈 문자열 | 프론트엔드에서 빈 입력 방지 |
| 검색 결과 없음 | "검색 결과가 없습니다" 메시지 |
| 저장된 URL 0개 | 빈 상태 UI (일러스트 + "URL을 추가해보세요") |

---

## 9. Implementation Checklist

### Phase 1: Backend (Convex)
- [ ] `schema.ts` — `savedUrlFolders`, `savedUrls` 테이블 추가
- [ ] `convex/savedUrlFolders.ts` — listFolders, createFolder, renameFolder, deleteFolder
- [ ] `convex/savedUrls.ts` — listByFolder, search, getTotalCount, create, remove, moveToFolder
- [ ] `convex/actions/savedUrls.ts` — extractAndSave

### Phase 2: Frontend Components
- [ ] `SavedUrlCard.tsx` — 카드 컴포넌트
- [ ] `FolderSidebar.tsx` — 폴더 목록 + 반응형
- [ ] `SearchBar.tsx` — 디바운스 검색
- [ ] `AddUrlDialog.tsx` — URL 추가 다이얼로그
- [ ] `SavedUrlsTab/index.tsx` — 탭 메인 컨테이너

### Phase 3: Integration
- [ ] `create/page.tsx` — 6번째 탭 추가 + handleLibrarySelect 연결
- [ ] 빌드 검증 (`npm run build`)
- [ ] 수동 테스트: URL 저장 → 폴더 분류 → 검색 → 선택 → 수집

---

## 10. File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `convex/schema.ts` | MODIFY | savedUrlFolders, savedUrls 테이블 추가 |
| `convex/savedUrlFolders.ts` | CREATE | 폴더 CRUD (query + mutation) |
| `convex/savedUrls.ts` | CREATE | URL CRUD + 검색 (query + mutation) |
| `convex/actions/savedUrls.ts` | CREATE | Firecrawl 메타데이터 추출 액션 |
| `src/components/create/SavedUrlsTab/index.tsx` | CREATE | 탭 메인 컨테이너 |
| `src/components/create/SavedUrlsTab/SavedUrlCard.tsx` | CREATE | URL 카드 |
| `src/components/create/SavedUrlsTab/FolderSidebar.tsx` | CREATE | 폴더 사이드바 |
| `src/components/create/SavedUrlsTab/AddUrlDialog.tsx` | CREATE | URL 추가 다이얼로그 |
| `src/components/create/SavedUrlsTab/SearchBar.tsx` | CREATE | 검색 바 |
| `src/app/(app)/create/page.tsx` | MODIFY | 6번째 탭 추가 + 연결 |
