# Content Management Enhancement - Design Document

> Reference: [Plan Document](../../01-plan/features/content-management.plan.md)

---

## 1. Schema Changes

### 1.1 slides 테이블 확장

```typescript
// convex/schema.ts - slides 테이블에 추가
originalContent: v.optional(v.object({
  category: v.optional(v.string()),
  title: v.string(),
  subtitle: v.optional(v.string()),
  body: v.optional(v.string()),
  source: v.optional(v.string()),
})),
overlays: v.optional(v.array(v.object({
  assetId: v.id("userAssets"),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  opacity: v.number(),
}))),
```

### 1.2 userAssets 테이블 신규

```typescript
// convex/schema.ts - 신규 테이블
userAssets: defineTable({
  userId: v.id("users"),
  storageId: v.id("_storage"),
  name: v.string(),
  type: v.union(
    v.literal("logo"),
    v.literal("watermark"),
    v.literal("stamp"),
    v.literal("image"),
  ),
  createdAt: v.number(),
}).index("by_userId", ["userId"]),
```

### 1.3 slides validator 확장

```typescript
// convex/slides.ts - createSlideInternal args에 추가
originalContent: v.optional(contentValidator),

// 새 validator
const overlayValidator = v.object({
  assetId: v.id("userAssets"),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  opacity: v.number(),
});
```

---

## 2. API Design

### 2.1 slides.ts 추가 mutations

```typescript
// 필드별 원본 복원
export const resetFieldToOriginal = mutation({
  args: {
    slideId: v.id("slides"),
    field: v.union(
      v.literal("category"),
      v.literal("title"),
      v.literal("subtitle"),
      v.literal("body"),
    ),
  },
  handler: async (ctx, { slideId, field }) => {
    // 1. 인증 확인
    // 2. slide.originalContent 존재 확인
    // 3. originalContent[field] 값을 content[field]에 복사
    // 4. patch({ content: { ...slide.content, [field]: originalValue } })
  },
});

// 오버레이 업데이트
export const updateSlideOverlays = mutation({
  args: {
    slideId: v.id("slides"),
    overlays: v.array(overlayValidator),
  },
  handler: async (ctx, { slideId, overlays }) => {
    // 인증 + 소유권 확인 후 patch
  },
});
```

### 2.2 generate.ts 수정

```typescript
// createSlideInternal 호출 시 originalContent 동시 저장
await ctx.runMutation(internal.slides.createSlideInternal, {
  projectId,
  order: i,
  type: slide.type,
  layoutId: ...,
  content: { category, title, subtitle, body },
  originalContent: { category, title, subtitle, body },  // 추가
  style: getDefaultStyle(),
});
```

### 2.3 userAssets.ts 신규

```typescript
// convex/userAssets.ts

// 업로드 URL 발급 (기존 storage.ts 활용 가능하나, 인증 추가)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// 에셋 메타데이터 저장
export const saveAsset = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.union(v.literal("logo"), v.literal("watermark"), v.literal("stamp"), v.literal("image")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return ctx.db.insert("userAssets", { ...args, userId, createdAt: Date.now() });
  },
});

// 에셋 목록 조회
export const listAssets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const assets = await ctx.db
      .query("userAssets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    // storageId → URL 변환
    return Promise.all(assets.map(async (a) => ({
      ...a,
      url: await ctx.storage.getUrl(a.storageId),
    })));
  },
});

// 에셋 삭제 (Storage도 함께)
export const deleteAsset = mutation({
  args: { assetId: v.id("userAssets") },
  handler: async (ctx, { assetId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const asset = await ctx.db.get(assetId);
    if (!asset || asset.userId !== userId) throw new Error("Not found");
    await ctx.storage.delete(asset.storageId);
    await ctx.db.delete(assetId);
  },
});

// 에셋 URL 조회 (오버레이 렌더링용)
export const getAssetUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
```

---

## 3. Component Design

### 3.1 필드별 원본 복원 버튼

**파일:** `src/components/preview/InlineToolbox.tsx` 수정

**위치:** 텍스트 입력 필드 우측 상단

```
┌─ InlineToolbox ────────────────────┐
│ [드래그핸들]  제목        [X]      │
│ ┌──────────────────────────┐ [↩]  │  ← 복원 버튼
│ │ 텍스트 입력...            │      │
│ └──────────────────────────┘      │
│ [글씨체] [크기] [행간] ...         │
└────────────────────────────────────┘
```

**Props 추가:**
```typescript
interface InlineToolboxProps {
  // 기존 props...
  originalContent?: SlideContent;
  onResetField: (field: EditableField) => void;
}
```

**복원 버튼 표시 조건:**
- `originalContent`가 존재하고
- `originalContent[field]`와 `content[field]`가 다를 때만 표시

### 3.2 빈 필드 추가 UI

**파일:** `src/components/editor/FieldAdder.tsx` 신규

**위치:** EditorPanel 콘텐츠 섹션 (스타일 아코디언 위)

```
┌─ 콘텐츠 필드 ──────────────────────┐
│ [+ 카테고리] [+ 부제] [+ 본문]     │  ← 비어있는 필드만 표시
└────────────────────────────────────┘
```

**Props:**
```typescript
interface FieldAdderProps {
  content: SlideContent;
  onAddField: (field: keyof SlideContent, defaultValue: string) => void;
}
```

**동작:**
- 버튼 클릭 → `onAddField("subtitle", "부제를 입력하세요")` 호출
- 부모에서 `handleContentChange({ ...content, subtitle: "부제를 입력하세요" })` 실행
- title은 항상 존재하므로 추가 버튼에서 제외

### 3.3 개인 이미지 라이브러리

**파일:** `src/components/editor/MyAssetsPanel.tsx` 신규

**위치:** EditorPanel의 새 아코디언 섹션 ("이미지" 아래)

```
┌─ 내 에셋 ──────────────────────────┐
│ [📁 업로드]                        │
│ ┌────┐ ┌────┐ ┌────┐              │
│ │ 🖼 │ │ 🖼 │ │ 🖼 │              │
│ │logo│ │mark│ │seal│              │
│ └────┘ └────┘ └────┘              │
│       [슬라이드에 추가]             │
└────────────────────────────────────┘
```

**기능:**
1. **업로드 플로우:**
   - 파일 선택 (accept: image/png, image/jpeg, image/svg+xml)
   - `generateUploadUrl()` → fetch POST → `saveAsset()`
   - 이름 입력 (업로드 후 모달)
   - 타입 선택 (logo/watermark/stamp/image)

2. **목록 표시:**
   - 그리드 레이아웃 (3열)
   - 썸네일 + 이름
   - 호버 시 삭제 버튼

3. **슬라이드에 추가:**
   - 에셋 선택 → "슬라이드에 추가" 클릭
   - 기본 위치: 우측 하단 (x: 85, y: 90, width: 15, opacity: 80)

### 3.4 오버레이 렌더링

**파일:** `src/components/preview/CardSlideRenderer.tsx` 수정

**위치:** 텍스트 콘텐츠 위, z-index 최상위

```tsx
{/* Overlays */}
{slide.overlays?.map((overlay, idx) => (
  <OverlayImage
    key={idx}
    assetId={overlay.assetId}
    x={overlay.x}
    y={overlay.y}
    width={overlay.width}
    opacity={overlay.opacity}
  />
))}
```

**OverlayImage 컴포넌트:** `src/components/preview/OverlayImage.tsx`
- `useQuery(api.userAssets.getAssetUrl, { storageId })` 로 URL 조회
- absolute 포지션, % 기반 좌표

### 3.5 오버레이 편집 UI

**파일:** `src/components/editor/OverlayControls.tsx` 신규

**위치:** MyAssetsPanel 내부 (오버레이가 있을 때 표시)

```
┌─ 오버레이 #1 (로고) ──────────────┐
│ X 위치  ════════════ 85%          │
│ Y 위치  ════════════ 90%          │
│ 크기    ════════════ 15%          │
│ 불투명도 ════════════ 80%         │
│                    [🗑 제거]       │
└────────────────────────────────────┘
```

---

## 4. Implementation Order

```
Phase 1: 스키마 + API (백엔드)
├─ 1a. schema.ts: originalContent, overlays, userAssets 추가
├─ 1b. slides.ts: resetFieldToOriginal, updateSlideOverlays, createSlideInternal 수정
├─ 1c. userAssets.ts: CRUD mutations/queries 생성
└─ 1d. generate.ts: originalContent 저장 로직 추가

Phase 2: 콘텐츠 복원 + 필드 추가 (프론트엔드)
├─ 2a. InlineToolbox: 복원 버튼 추가
├─ 2b. FieldAdder: 빈 필드 추가 컴포넌트
├─ 2c. EditorPanel: FieldAdder 통합
└─ 2d. edit/[id]/page.tsx: 복원 핸들러 연결

Phase 3: 에셋 라이브러리 (프론트엔드)
├─ 3a. MyAssetsPanel: 업로드/목록/삭제
├─ 3b. EditorPanel: MyAssetsPanel 아코디언 추가
└─ 3c. 에셋→오버레이 추가 연결

Phase 4: 오버레이 렌더링 + 편집
├─ 4a. OverlayImage: 렌더링 컴포넌트
├─ 4b. CardSlideRenderer: 오버레이 통합
├─ 4c. OverlayControls: 위치/크기/불투명도 편집
└─ 4d. 내보내기(PNG) 시 오버레이 포함 확인
```

---

## 5. Edge Cases & Constraints

| Case | Handling |
|------|----------|
| originalContent 없는 기존 슬라이드 | 복원 버튼 숨김 (조건부 렌더링) |
| 에셋 파일 크기 제한 | 클라이언트에서 5MB 제한, 서버에서도 검증 |
| 지원 포맷 | PNG, JPEG, SVG only |
| 에셋 삭제 시 오버레이 참조 | 삭제 전 사용 중인 슬라이드 경고, 강제 삭제 시 오버레이도 제거 |
| 오버레이 개수 제한 | 슬라이드당 최대 5개 |
| PNG 내보내기 오버레이 | html-to-image가 이미지 요소를 캡처하므로 자동 포함됨 |
