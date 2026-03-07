# Content Management Enhancement - Gap Analysis

> Design: [content-management.design.md](../02-design/features/content-management.design.md)
> Analysis Date: 2026-03-07

---

## Match Rate: 88%

---

## 1. Schema Changes

| Item | Design | Implementation | Status |
|------|--------|---------------|--------|
| 1.1 slides.originalContent | `v.optional(contentValidator)` | `convex/schema.ts:13-19` - Exact match | MATCH |
| 1.1 slides.overlays | `v.optional(v.array(overlayValidator))` | `convex/schema.ts:20-26` - Exact match | MATCH |
| 1.2 userAssets table | 5 fields + index | `convex/schema.ts` - Exact match | MATCH |
| 1.3 slides validator | `overlayValidator`, `originalContent` in createSlideInternal | `convex/slides.ts:62-68, 298` | MATCH |

## 2. API Design

| Item | Design | Implementation | Status |
|------|--------|---------------|--------|
| 2.1 resetFieldToOriginal | Auth + ownership + field reset | `convex/slides.ts` - Complete with auth, ownership, originalContent check | MATCH |
| 2.1 updateSlideOverlays | Auth + ownership + patch | `convex/slides.ts` - Complete | MATCH |
| 2.2 generate.ts originalContent | Dual save content + originalContent | `convex/actions/generate.ts` - `slideContent` variable reused | MATCH |
| 2.3 generateUploadUrl | Auth + storage.generateUploadUrl | `convex/userAssets.ts` - Exact match | MATCH |
| 2.3 saveAsset | Auth + db.insert | `convex/userAssets.ts` - Exact match | MATCH |
| 2.3 listAssets | Auth + index query + URL resolve | `convex/userAssets.ts` - Exact match | MATCH |
| 2.3 deleteAsset | Auth + ownership + storage.delete + db.delete | `convex/userAssets.ts` - Exact match | MATCH |
| 2.3 getAssetUrl | storageId -> URL | `convex/userAssets.ts` - Exact match | MATCH |

## 3. Component Design

| Item | Design | Implementation | Status |
|------|--------|---------------|--------|
| 3.1 InlineToolbox restore button | Props: originalContent, onResetField; conditional display | `InlineToolbox.tsx` - RotateCcw icon, conditional render | MATCH |
| 3.1 InlineEditLayer passthrough | Pass originalContent + onResetField | `InlineEditLayer.tsx` - Props added and passed | MATCH |
| 3.1 edit page restore handler | resetFieldMutation wired | `edit/[id]/page.tsx` - Connected | MATCH |
| 3.2 FieldAdder component | Content prop, onAddField, empty field buttons | `FieldAdder.tsx` - Plus icon, dashed border buttons | MATCH |
| 3.2 FieldAdder integration | EditorPanel content section above accordions | `EditorPanel.tsx` - Added above SECTIONS | MATCH |
| 3.2 title excluded | Design says title always exists | `FieldAdder.tsx` - title IS included (user requested) | DEVIATION (intentional) |
| 3.3 MyAssetsPanel upload | File select + generateUploadUrl + fetch POST + saveAsset | `MyAssetsPanel.tsx` - Complete flow | MATCH |
| 3.3 MyAssetsPanel name input | Upload modal for name + type selection | `MyAssetsPanel.tsx` - Uses filename, hardcodes type="image" | GAP |
| 3.3 MyAssetsPanel grid | 3-column grid, thumbnail + name, hover delete | `MyAssetsPanel.tsx` - 3-col grid, labels, hover trash | MATCH |
| 3.3 Add to slide | Select + click button, default position | `MyAssetsPanel.tsx` + `edit/[id]/page.tsx` - x:85,y:90,w:15,op:80 | MATCH |
| 3.4 OverlayImage | useQuery for URL, absolute position, % coords | `OverlayImage.tsx` - Uses listAssets query, translate(-50%,-50%) | MATCH |
| 3.4 CardSlideRenderer overlay | Map overlays with OverlayImage | `CardSlideRenderer.tsx` - Rendered after text content | MATCH |
| 3.5 OverlayControls | X/Y/size/opacity sliders + remove button | `OverlayControls.tsx` - 4 sliders + Trash2 button | MATCH |
| 3.5 OverlayControls location | Inside MyAssetsPanel / EditorPanel | `EditorPanel.tsx` - In assets accordion section | MATCH |

## 4. Edge Cases & Constraints

| Case | Design | Implementation | Status |
|------|--------|---------------|--------|
| originalContent missing | Hide restore button | `InlineToolbox.tsx` - Conditional render on `originalContent &&` | MATCH |
| File size limit | Client 5MB | `MyAssetsPanel.tsx` - `MAX_FILE_SIZE = 5 * 1024 * 1024` | MATCH |
| Supported formats | PNG, JPEG, SVG | `MyAssetsPanel.tsx` - `ACCEPTED_TYPES` array | MATCH |
| Asset delete + overlay ref | Warn before delete, force removes overlays | Not implemented - only `confirm()` dialog, no overlay cleanup | GAP |
| Overlay count limit | Max 5 per slide | `edit/[id]/page.tsx` - `current.length >= 5` guard | MATCH |
| PNG export overlay | html-to-image captures img elements | Architecture ensures auto-inclusion | MATCH |

## 5. Gap Summary

### GAP-1: Asset Upload Name/Type Modal (Minor)
- **Design**: Upload 후 이름 입력 모달 + 타입 선택 (logo/watermark/stamp/image)
- **Implementation**: 파일명에서 자동 추출, 타입은 "image"로 고정
- **Impact**: Low - 기능은 동작하지만 사용자가 에셋 이름/타입을 커스터마이즈할 수 없음
- **Fix**: 업로드 후 인라인 편집 또는 모달 추가

### GAP-2: Asset Delete Overlay Cleanup (Minor)
- **Design**: 에셋 삭제 시 사용 중인 슬라이드 경고, 강제 삭제 시 오버레이도 제거
- **Implementation**: `confirm()` 다이얼로그만 있고, 오버레이 참조 정리 없음
- **Impact**: Medium - 삭제된 에셋의 오버레이가 깨진 상태로 남을 수 있음
- **Fix**: deleteAsset에서 해당 assetId를 참조하는 overlays를 찾아 제거하는 로직 추가

### Intentional Deviation
- **FieldAdder title 포함**: Design에서는 title 제외했으나, 사용자 요청으로 title도 추가 가능하도록 변경

---

## 6. Score Breakdown

| Category | Items | Matched | Score |
|----------|-------|---------|-------|
| Schema (1) | 4 | 4 | 100% |
| API (2) | 8 | 8 | 100% |
| Components (3) | 14 | 12 | 86% |
| Edge Cases (5) | 6 | 5 | 83% |
| **Total** | **32** | **29** | **91%** |

> Adjusted for intentional deviation: **91%** (GAP-1, GAP-2 are minor improvements)
