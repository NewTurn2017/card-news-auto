# Typography Spacing Controls (행간/자간 조절)

## Executive Summary

| Item | Detail |
|------|--------|
| Feature | 제목/부제/본문 행간(line-height) 및 자간(letter-spacing) 조절 |
| Date | 2026-03-07 |
| Estimated Scope | Small (4 files modify, 0 new files) |

### Value Delivered

| Perspective | Description |
|-------------|-------------|
| Problem | 카드뉴스 텍스트의 행간/자간을 조절할 수 없어 가독성과 디자인 완성도가 제한됨 |
| Solution | 기존 글씨 크기 슬라이더 패턴을 재사용하여 행간/자간 슬라이더를 추가 |
| Function UX Effect | 에디터 스타일 섹션에서 슬라이더로 즉시 미리보기 가능, 프리셋 저장/불러오기 호환 |
| Core Value | 텍스트 타이포그래피 세밀 조정으로 카드뉴스 디자인 품질 향상 |

---

## 1. Background & Problem

현재 에디터의 스타일 섹션에서 글씨 크기(fontSize)와 글씨 색상은 조절 가능하지만, **행간(line-height)**과 **자간(letter-spacing)**은 조절할 수 없다. 카드뉴스 디자인에서 타이포그래피 간격은 가독성과 심미성에 큰 영향을 미치므로 이 기능이 필요하다.

## 2. Goal

- 제목(title), 부제(subtitle), 본문(body) 각각에 대해 행간과 자간을 독립적으로 조절
- 기존 글씨 크기 슬라이더와 동일한 UX 패턴 적용 (range input + 디바운스 mutation)
- 스타일 프리셋 저장/불러오기에 행간·자간 값 포함
- 전체 적용(Apply to All) 기능과 호환

## 3. Scope

### 3.1 In Scope

| # | Item | Description |
|---|------|-------------|
| 1 | SlideStyle 타입 확장 | `titleLineHeight`, `titleLetterSpacing` 등 6개 필드 추가 |
| 2 | Convex schema 확장 | `slides.style` 및 `stylePresets.style` 객체에 동일 필드 추가 |
| 3 | EditorPanel UI | 글씨 크기 슬라이더 아래에 행간/자간 슬라이더 그룹 추가 |
| 4 | CardSlideRenderer 적용 | 각 텍스트 요소에 `lineHeight`, `letterSpacing` inline style 반영 |

### 3.2 Out of Scope

- 카테고리(category) 텍스트의 행간/자간 (글자 수가 적어 필요성 낮음)
- 커스텀 단위 입력 (슬라이더만 제공, 직접 숫자 입력은 추후)

## 4. Technical Approach

### 4.1 New Fields (6개)

| Field | Type | Default | Range | Unit |
|-------|------|---------|-------|------|
| `titleLineHeight` | `number` | 1.3 | 0.8 ~ 2.5 | em (배수) |
| `titleLetterSpacing` | `number` | 0 | -2 ~ 10 | px |
| `subtitleLineHeight` | `number` | 1.4 | 0.8 ~ 2.5 | em (배수) |
| `subtitleLetterSpacing` | `number` | 0 | -2 ~ 10 | px |
| `bodyLineHeight` | `number` | 1.6 | 0.8 ~ 2.5 | em (배수) |
| `bodyLetterSpacing` | `number` | 0 | -2 ~ 10 | px |

### 4.2 Modified Files

| File | Change |
|------|--------|
| `src/types/index.ts` | `SlideStyle` interface에 6개 optional 필드 추가 |
| `convex/schema.ts` | `slides.style` + `stylePresets.style` 객체에 `v.optional(v.number())` 6개 추가 |
| `src/components/editor/EditorPanel.tsx` | "글씨 크기" 슬라이더 아래에 "행간" + "자간" 슬라이더 그룹 추가 |
| `src/components/preview/CardSlideRenderer.tsx` | title/subtitle/body 요소에 `lineHeight`, `letterSpacing` inline style 추가 |

### 4.3 UX Design

에디터 스타일 섹션 구조 (변경 후):
```
[폰트 선택]
[글씨 크기] - 카테고리 / 제목 / 부제 / 본문 슬라이더
[행간 간격] - 제목 / 부제 / 본문 슬라이더 (NEW)
[자간 간격] - 제목 / 부제 / 본문 슬라이더 (NEW)
[글씨 색상] - 카테고리 / 제목 / 부제 / 본문 컬러피커
[배경 색상/프리셋]
[스타일 프리셋]
```

슬라이더 표시 형식:
- 행간: `제목 1.3` (소수점 1자리)
- 자간: `제목 0px` (정수 + px 단위)

### 4.4 Backward Compatibility

- 모든 새 필드는 `v.optional()` / TypeScript `?`로 선언
- 기존 슬라이드 데이터는 영향 없음 (undefined → default 값 사용)
- 프리셋 저장 시 새 필드도 자동 포함 (handleStyleChange가 currentStyle spread)

## 5. Implementation Order

1. `src/types/index.ts` — SlideStyle 타입 확장
2. `convex/schema.ts` — DB 스키마 확장
3. `src/components/editor/EditorPanel.tsx` — 슬라이더 UI 추가
4. `src/components/preview/CardSlideRenderer.tsx` — 렌더링 적용
5. 빌드 검증 (`npm run build`)

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| 슬라이더 과다로 UI 복잡 | 행간/자간을 접을 수 있는 sub-section으로 구성 가능 (추후) |
| 행간 범위가 레이아웃 깨뜨림 | min 0.8, max 2.5로 안전 범위 제한 |
| 기존 프리셋 데이터 호환 | optional 필드이므로 migration 불필요 |
