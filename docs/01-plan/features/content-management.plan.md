# Content Management Enhancement Plan

## Executive Summary

| 관점 | 설명 |
|------|------|
| **Problem** | 텍스트 콘텐츠 삭제 시 복구 불가, 비어있는 필드 재활성화 방법 없음, 개인 이미지(로고/워터마크) 재사용 불가 |
| **Solution** | 필드별 원본 복원 기능, 빈 필드 추가/활성화 UI, Convex Storage 기반 개인 이미지 라이브러리 |
| **Function UX Effect** | 실수로 삭제해도 원본으로 되돌릴 수 있어 편집 안정성 향상, 개인 브랜딩 이미지 재사용으로 작업 효율 극대화 |
| **Core Value** | 편집 안정성 + 브랜드 일관성 — 사용자가 실수를 두려워하지 않고 자유롭게 편집 가능 |

---

## 1. Feature Overview

### 1.1 콘텐츠 필드 원본 복원 (Per-field Reset)

**현재 문제:**
- `SlideContent`의 4개 필드(category, title, subtitle, body)를 비우면 debounce로 즉시 저장
- 복구 방법 없음 — AI가 생성한 원본 텍스트가 영구 손실

**해결 방안:**
- `slides` 테이블에 `originalContent` 필드 추가 (AI 생성 시점의 콘텐츠 스냅샷)
- 각 필드별로 독립적인 "원본 복원" 버튼 제공
- 전체 복원이 아닌 **선택적 필드 복원** (예: title만 원본으로)

**데이터 흐름:**
```
AI 생성 → slides.content (편집용) + slides.originalContent (원본 보존)
사용자 편집 → slides.content만 업데이트
복원 클릭 → slides.originalContent[field] → slides.content[field]로 복사
```

### 1.2 빈 필드 추가/활성화

**현재 문제:**
- AI가 생성하지 않은 필드(예: category 없이 생성된 슬라이드)는 추가 방법 없음
- 필드를 비우면 미리보기에서 사라지고 다시 활성화할 수 없음

**해결 방안:**
- InlineToolbox 또는 EditorPanel에 "필드 추가" 버튼
- 현재 비어있는 필드 목록을 보여주고 클릭하면 활성화
- 활성화된 필드에 placeholder 텍스트 제공

**UI 위치:** EditorPanel의 콘텐츠 섹션 또는 슬라이드 미리보기 하단

### 1.3 개인 이미지 라이브러리 (My Assets)

**현재 문제:**
- 배경 이미지는 Unsplash/Pexels 검색만 가능
- 로고, 워터마크, 저작권 표시 등 개인 이미지를 반복 사용할 방법 없음

**해결 방안:**
- `userAssets` Convex 테이블 추가
- 이미지 업로드 → Convex Storage 저장
- 에셋 라이브러리 UI: 저장된 이미지 목록, 이름 지정, 삭제
- 슬라이드에 오버레이로 배치 (위치/크기/불투명도 조절)

**데이터 모델:**
```typescript
userAssets: {
  userId: Id<"users">,
  storageId: Id<"_storage">,
  name: string,
  type: "logo" | "watermark" | "stamp" | "image",
  createdAt: number,
}
```

**슬라이드 오버레이 모델:**
```typescript
// slides 테이블에 추가
overlays?: Array<{
  assetId: Id<"userAssets">,
  x: number,        // % position
  y: number,        // % position
  width: number,    // % of slide width
  opacity: number,  // 0-100
}>
```

---

## 2. Scope

### In Scope
- [x] `originalContent` 필드 추가 및 AI 생성 시 자동 저장
- [x] 필드별 원본 복원 버튼 (category, title, subtitle, body 독립)
- [x] 빈 필드 추가/활성화 UI
- [x] `userAssets` 테이블 + Convex Storage 연동
- [x] 이미지 업로드/목록/삭제 UI
- [x] 슬라이드 오버레이 배치 (위치/크기/불투명도)

### Out of Scope
- Undo/Redo 히스토리 스택 (향후 개선 사항)
- 이미지 편집 (크롭, 필터 등)
- 팀 공유 에셋 라이브러리

---

## 3. Technical Approach

### 3.1 Schema Changes

```
convex/schema.ts:
  slides 테이블 → originalContent 필드 추가 (content와 동일 구조, optional)
  slides 테이블 → overlays 필드 추가 (optional array)
  userAssets 테이블 신규 생성

convex/slides.ts:
  createSlideInternal → originalContent도 함께 저장
  새 mutation: resetFieldContent (필드별 원본 복원)
  새 mutation: updateSlideOverlays

convex/userAssets.ts (신규):
  generateUploadUrl → 업로드 URL 발급
  saveAsset → 에셋 메타데이터 저장
  listAssets → 사용자 에셋 목록
  deleteAsset → 에셋 삭제 (Storage도 함께)
```

### 3.2 UI Components

```
src/components/editor/ContentFields.tsx → 필드별 복원 버튼 추가
src/components/editor/FieldAdder.tsx (신규) → 빈 필드 추가 UI
src/components/editor/MyAssetsPanel.tsx (신규) → 에셋 라이브러리
src/components/preview/OverlayRenderer.tsx (신규) → 슬라이드 오버레이 렌더링
```

### 3.3 Implementation Priority

| 순서 | 기능 | 복잡도 | 영향도 |
|------|------|--------|--------|
| 1 | 필드별 원본 복원 | Low | High |
| 2 | 빈 필드 추가/활성화 | Low | Medium |
| 3 | 개인 이미지 라이브러리 | Medium | High |
| 4 | 슬라이드 오버레이 배치 | Medium | High |

---

## 4. Acceptance Criteria

- [ ] AI 생성 시 `originalContent`가 자동 저장됨
- [ ] 각 필드별로 "원본 복원" 버튼이 표시되고, 클릭 시 해당 필드만 원본으로 복원됨
- [ ] 비어있는 필드를 UI에서 추가/활성화할 수 있음
- [ ] 이미지를 업로드하고 이름을 지정하여 저장할 수 있음
- [ ] 저장된 이미지를 슬라이드에 오버레이로 배치할 수 있음
- [ ] 오버레이의 위치, 크기, 불투명도를 조절할 수 있음
- [ ] PNG 내보내기 시 오버레이가 포함됨
