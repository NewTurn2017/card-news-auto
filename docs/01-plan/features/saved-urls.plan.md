# Plan: Saved URLs (나만의 URL 라이브러리)

## Executive Summary

| Item | Detail |
|------|--------|
| Feature | Saved URLs - 나만의 URL 라이브러리 |
| Created | 2026-03-07 |
| Duration | TBD (Plan phase) |
| Status | Plan |

### Value Delivered

| Perspective | Description |
|-------------|-------------|
| Problem | 반복적으로 사용하는 URL을 매번 복사/붙여넣기 해야 하며, 관심 콘텐츠 소스를 체계적으로 관리할 방법이 없음 |
| Solution | URL 저장 시 메타데이터 자동 생성(썸네일, 제목, 설명) + 폴더 분류 + 검색 + 원클릭 소스 수집 |
| Function UX Effect | 저장된 URL 선택만으로 즉시 소스 수집이 시작되어 콘텐츠 제작 속도 향상 |
| Core Value | 개인 콘텐츠 소스 라이브러리를 구축하여 반복 작업 제거 및 콘텐츠 제작 워크플로우 최적화 |

---

## 1. Background & Problem

### 1.1 현재 상태
- 카드뉴스 생성 시 5개 탭(URL, YouTube, SNS, 검색, 텍스트)에서 소스 수집
- URL 탭은 매번 새로운 URL을 입력해야 함 — 재사용 불가
- 자주 참조하는 블로그, 뉴스 사이트 등의 URL을 별도로 관리할 수단 없음

### 1.2 Pain Points
1. **반복 입력**: 같은 소스를 여러 카드뉴스에 활용할 때 URL을 매번 찾아서 붙여넣기
2. **소스 망각**: 좋은 콘텐츠 소스를 발견해도 나중에 기억하기 어려움
3. **분류 부재**: 주제별, 카테고리별로 소스를 정리할 방법 없음
4. **탐색 비효율**: URL만으로는 내용 파악이 어려워 적합한 소스를 찾기 힘듦

### 1.3 Target Users
- 정기적으로 카드뉴스를 제작하는 콘텐츠 크리에이터
- 특정 주제의 소스를 반복적으로 활용하는 사용자

---

## 2. Feature Requirements

### 2.1 Core Features (MVP)

#### FR-01: URL 저장 및 메타데이터 자동 생성
- URL 입력 시 Firecrawl로 페이지 스크래핑
- 자동 추출: OG 이미지(썸네일), 제목(`og:title` / `<title>`), 설명(`og:description` / meta description)
- OG 이미지 없을 경우: 제목 기반 placeholder 썸네일 자동 생성
- 저장 데이터: url, title, description, thumbnailUrl, folderId, createdAt

#### FR-02: 폴더 관리
- 기본 폴더: "전체" (필터, 삭제 불가)
- 사용자 폴더 CRUD: 생성, 이름 변경, 삭제
- 폴더 삭제 시: 내부 URL들은 "미분류"로 이동 (데이터 보존)
- 폴더당 URL 개수 표시

#### FR-03: 저장된 URL 선택 → 소스 수집
- 저장된 URL 카드 클릭 시 → 기존 `collectFromUrl` 액션 호출
- 기존 소스 수집 플로우와 동일하게 진행 (collecting → summary → preview)
- sourceType은 기존 "url" 재사용 (새 타입 불필요)

#### FR-04: 검색
- 제목, URL, 설명 텍스트 기반 검색
- Convex search index 활용
- 실시간 필터링 (debounced input)

#### FR-05: Create 페이지 탭 통합
- 6번째 탭: "라이브러리" (BookmarkIcon)
- 탭 내부: 폴더 필터 + 검색바 + URL 카드 그리드
- URL 카드: 썸네일 + 제목 + 설명 (2줄 clamp) + 폴더명
- "새 URL 추가" 버튼 (탭 내 인라인)

### 2.2 Out of Scope (v1)
- 태그 시스템 (폴더로 충분)
- URL 공유/내보내기
- URL 자동 갱신/모니터링
- 드래그앤드롭 정렬
- 별도 `/library` 관리 페이지 (MVP 후 검토)

---

## 3. Technical Architecture

### 3.1 Database Schema (Convex)

```typescript
// savedUrls 테이블
savedUrls: defineTable({
  userId: v.id("users"),
  url: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  folderId: v.optional(v.id("savedUrlFolders")),
  createdAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_folderId", ["userId", "folderId"])
  .searchIndex("search_title_url", {
    searchField: "title",
    filterFields: ["userId"],
  })

// savedUrlFolders 테이블
savedUrlFolders: defineTable({
  userId: v.id("users"),
  name: v.string(),
  order: v.number(),
  createdAt: v.number(),
})
  .index("by_userId", ["userId"])
```

### 3.2 Convex Functions

```
convex/
├── savedUrls.ts          # Queries & Mutations
│   ├── list              # 사용자 URL 목록 (폴더 필터)
│   ├── search            # 검색 (searchIndex)
│   ├── create            # URL 저장
│   ├── remove            # URL 삭제
│   └── moveToFolder      # 폴더 이동
├── savedUrlFolders.ts    # 폴더 CRUD
│   ├── list              # 폴더 목록 + URL 개수
│   ├── create            # 폴더 생성
│   ├── rename            # 이름 변경
│   └── remove            # 폴더 삭제 (URL → 미분류)
└── actions/
    └── savedUrls.ts      # URL 메타데이터 추출 액션
        └── extractMetadata  # Firecrawl로 OG 데이터 추출
```

### 3.3 Frontend Components

```
src/components/create/
└── SavedUrlsTab/
    ├── index.tsx              # 탭 메인 컨테이너
    ├── SavedUrlCard.tsx       # URL 카드 (썸네일, 제목, 설명)
    ├── FolderSidebar.tsx      # 폴더 목록 사이드바
    ├── AddUrlDialog.tsx       # URL 추가 다이얼로그
    └── SearchBar.tsx          # 검색 입력
```

### 3.4 Data Flow

```
[URL 추가]
  1. 사용자가 URL 입력 → AddUrlDialog
  2. extractMetadata 액션 호출 (Firecrawl)
  3. OG 메타데이터 추출 (title, description, image)
  4. savedUrls.create 뮤테이션으로 DB 저장
  5. 실시간 UI 업데이트 (Convex subscription)

[소스 수집]
  1. SavedUrlCard 클릭
  2. 기존 handleCollect() 호출 (url=savedUrl.url)
  3. createProject → collectFromUrl → summary → preview
  4. 이후 플로우 동일 (슬라이드 개수 선택 → 생성)
```

---

## 4. UI/UX Design

### 4.1 탭 레이아웃
```
[URL] [YouTube] [SNS] [검색] [텍스트] [라이브러리]
                                         ↑ 새 탭
```

### 4.2 라이브러리 탭 내부 레이아웃
```
┌─────────────────────────────────────────────┐
│ [🔍 제목, URL 검색...]          [+ URL 추가] │
├──────────┬──────────────────────────────────┤
│ 폴더     │  URL 카드 그리드 (3열)            │
│──────────│  ┌─────┐ ┌─────┐ ┌─────┐         │
│ 전체 (24)│  │ 썸넬 │ │ 썸넬 │ │ 썸넬 │         │
│ AI (8)   │  │ 제목 │ │ 제목 │ │ 제목 │         │
│ 마케팅(6)│  │ 설명 │ │ 설명 │ │ 설명 │         │
│ 트렌드(5)│  └─────┘ └─────┘ └─────┘         │
│ 미분류(5)│                                   │
│──────────│  ┌─────┐ ┌─────┐ ┌─────┐         │
│ [+폴더]  │  │     │ │     │ │     │         │
│          │  └─────┘ └─────┘ └─────┘         │
└──────────┴──────────────────────────────────┘
```

### 4.3 URL 카드 디자인
```
┌──────────────────────┐
│ ┌──────────────────┐ │
│ │   OG 썸네일      │ │  ← 16:9 비율, 없으면 placeholder
│ │                  │ │
│ └──────────────────┘ │
│ ● 제목 (1줄 clamp)   │  ← og:title
│ 설명 텍스트 최대     │  ← og:description (2줄 clamp)
│ 두 줄까지 표시...    │
│ 📁 AI · ⋯           │  ← 폴더명 + 더보기 메뉴
└──────────────────────┘
```

### 4.4 URL 추가 다이얼로그
```
┌─ URL 추가 ──────────────────────────┐
│                                      │
│ URL 입력                             │
│ ┌──────────────────────────────────┐ │
│ │ https://example.com/article...   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 폴더 선택                            │
│ ┌──────────────────────────────────┐ │
│ │ AI                           ▾  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ 미리보기 (자동) ──────────────┐   │
│ │ [썸넬] 자동 추출된 제목         │   │
│ │        자동 추출된 설명         │   │
│ └────────────────────────────────┘   │
│                                      │
│            [취소]  [저장]            │
└──────────────────────────────────────┘
```

---

## 5. Implementation Order

### Phase 1: DB & Backend (Convex)
1. `schema.ts` — savedUrls, savedUrlFolders 테이블 추가
2. `convex/savedUrlFolders.ts` — 폴더 CRUD
3. `convex/savedUrls.ts` — URL CRUD + 검색
4. `convex/actions/savedUrls.ts` — extractMetadata 액션 (Firecrawl)

### Phase 2: Frontend Components
5. `SavedUrlCard.tsx` — URL 카드 컴포넌트
6. `FolderSidebar.tsx` — 폴더 목록
7. `AddUrlDialog.tsx` — URL 추가 다이얼로그
8. `SearchBar.tsx` — 검색 입력

### Phase 3: Integration
9. `SavedUrlsTab/index.tsx` — 탭 조합
10. `create/page.tsx` — 6번째 탭 통합 + 선택 시 수집 연결

---

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Firecrawl API 호출 비용 | 중 | URL당 1회만 추출, 결과 DB 저장 |
| OG 메타데이터 없는 사이트 | 낮 | URL 도메인 기반 placeholder 생성 |
| 탭 6개로 UI 복잡도 증가 | 중 | 아이콘 + 짧은 라벨, 반응형 스크롤 |
| 검색 성능 (URL 수 증가) | 낮 | Convex searchIndex 활용 |
| 외부 이미지 URL 깨짐 | 낮 | onError fallback placeholder |

---

## 7. Success Criteria

- [ ] URL 저장 시 메타데이터(썸네일, 제목, 설명) 자동 생성
- [ ] 폴더 생성/편집/삭제 정상 동작
- [ ] 저장된 URL 선택 시 기존 소스 수집 플로우 정상 연결
- [ ] 검색 기능으로 URL 필터링 가능
- [ ] 6번째 탭이 기존 UI와 일관성 있게 통합
