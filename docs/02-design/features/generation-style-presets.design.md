# Design: Generation Style Presets (내 스타일 저장)

> Plan 문서: `docs/01-plan/features/generation-style-presets.plan.md`

---

## 1. 데이터 모델

### 1.1 새 테이블: `generationPresets`

```typescript
// convex/schema.ts
generationPresets: defineTable({
  userId: v.id("users"),
  name: v.string(),                          // 프리셋 이름
  tone: v.string(),                          // 말투: "professional" | "friendly" | "humorous" | "formal" | 커스텀
  writingStyle: v.string(),                  // 글쓰기: "concise" | "descriptive" | "conversational" | 커스텀
  contentLength: v.string(),                 // 글자수: "short" | "medium" | "long"
  targetAudience: v.optional(v.string()),    // 대상 독자 (자유 텍스트)
  additionalInstructions: v.optional(v.string()), // 추가 지시사항
  isDefault: v.optional(v.boolean()),        // 기본 프리셋 마킹
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_userId", ["userId"])
```

**설계 근거**: 기존 `stylePresets`(비주얼)와 분리. 비주얼 스타일은 편집 시(Edit 페이지), 생성 스타일은 AI 프롬프트 주입 시(Create 페이지) 사용되는 완전히 다른 시점/맥락.

### 1.2 톤/스타일 사전 정의 값

```typescript
// convex/generationPresets.ts 또는 src/data/generationOptions.ts

const TONE_OPTIONS = [
  { id: "professional", label: "전문적", promptText: "전문적이고 신뢰감 있는 톤으로" },
  { id: "friendly", label: "친근한", promptText: "친근하고 가벼운 톤으로" },
  { id: "humorous", label: "유머러스한", promptText: "위트 있고 유머러스한 톤으로" },
  { id: "formal", label: "격식체", promptText: "격식을 갖춘 ~합니다/~입니다 체로" },
] as const

const WRITING_STYLE_OPTIONS = [
  { id: "concise", label: "간결체", promptText: "핵심만 간결하게, 짧은 문장 위주로" },
  { id: "descriptive", label: "설명체", promptText: "상세하게 설명하는 방식으로" },
  { id: "conversational", label: "대화체", promptText: "독자에게 말하듯 대화하는 방식으로" },
] as const

const CONTENT_LENGTH_OPTIONS = [
  { id: "short", label: "짧게", promptText: "각 슬라이드 본문을 1-2문장으로 짧게" },
  { id: "medium", label: "보통", promptText: "각 슬라이드 본문을 3-4문장으로" },
  { id: "long", label: "길게", promptText: "각 슬라이드 본문을 5-6문장으로 상세하게" },
] as const
```

---

## 2. API 설계

### 2.1 새 Convex 모듈: `convex/generationPresets.ts`

| 함수 | 타입 | Args | 설명 |
|------|------|------|------|
| `list` | query | - | 현재 사용자의 모든 프리셋 조회 |
| `get` | query | `{ presetId }` | 단일 프리셋 조회 |
| `save` | mutation | `{ name, tone, writingStyle, contentLength, targetAudience?, additionalInstructions? }` | 생성/수정 (이름 중복 시 덮어쓰기) |
| `remove` | mutation | `{ presetId }` | 삭제 |
| `setDefault` | mutation | `{ presetId }` | 기본 프리셋 지정 (기존 기본 해제) |
| `getInternal` | internalQuery | `{ presetId }` | 액션에서 사용할 내부 조회 |

### 2.2 `generateCardNews` 액션 변경

```typescript
// convex/actions/generate.ts

export const generateCardNews = action({
  args: {
    projectId: v.id("projects"),
    slideCount: v.optional(v.number()),     // 기존 (기본값 7 → 유지)
    presetId: v.optional(v.id("generationPresets")),  // 신규
  },
  handler: async (ctx, { projectId, slideCount = 7, presetId }) => {
    // ...
    // presetId가 있으면 프리셋 로드
    let presetOptions = null
    if (presetId) {
      presetOptions = await ctx.runQuery(
        internal.generationPresets.getInternal, { presetId }
      )
    }
    // 프롬프트에 스타일 주입
    const prompt = getPlanningPrompt(
      project.sourceContent, slideCount, presetOptions
    )
    // ...
  },
})
```

### 2.3 프롬프트 변경: `getPlanningPrompt`

```typescript
function getPlanningPrompt(
  sourceText: string,
  slideCount: number = 7,
  preset?: { tone: string; writingStyle: string; contentLength: string;
             targetAudience?: string; additionalInstructions?: string } | null
) {
  // 슬라이드 수별 구조 가이드
  let structureGuide: string
  if (slideCount === 1) {
    structureGuide = "- 1장: 핵심 메시지를 담은 커버 (type: cover)"
  } else if (slideCount === 2) {
    structureGuide = `- 1장: 커버 (카테고리 + 임팩트 있는 제목 + 부제)
- 2장: 마무리 (핵심 요약 또는 행동 유도)`
  } else {
    structureGuide = `- 1장: 커버 (카테고리 + 임팩트 있는 제목 + 부제, body는 한줄 요약)
- 2~${slideCount - 1}장: 핵심 내용 (한 장에 한 가지 메시지)
- ${slideCount}장: 마무리 (핵심 요약 또는 행동 유도)`
  }

  // 스타일 지시 (프리셋이 있을 때만 추가)
  let styleInstructions = ""
  if (preset) {
    const parts: string[] = []
    // tone → promptText 매핑 (사전 정의 or 커스텀 그대로)
    parts.push(`- 말투: ${resolveOptionText("tone", preset.tone)}`)
    parts.push(`- 글쓰기 스타일: ${resolveOptionText("writingStyle", preset.writingStyle)}`)
    parts.push(`- 글자수: ${resolveOptionText("contentLength", preset.contentLength)}`)
    if (preset.targetAudience) {
      parts.push(`- 대상 독자: ${preset.targetAudience}`)
    }
    if (preset.additionalInstructions) {
      parts.push(`- 추가 지시: ${preset.additionalInstructions}`)
    }
    styleInstructions = `\n\n스타일 가이드:\n${parts.join("\n")}`
  }

  return `당신은 인스타그램 카드뉴스 전문 에디터입니다.
다음 텍스트를 인스타그램 카드뉴스 ${slideCount}장으로 구조화해주세요.

규칙:
- 모든 슬라이드에 category, title, subtitle, body를 반드시 포함해주세요
${structureGuide}
- category: 영문 대문자 (예: "AI & INSIGHT") — 모든 장에 동일하게
- title: 2줄 이내, 짧고 강렬하게
- subtitle: 부제 또는 소제목 (빈 값 불가)
- body: 본문 내용 (빈 값 불가)${styleInstructions}

원본 텍스트:
${sourceText}`
}
```

---

## 3. UI 컴포넌트 설계

### 3.1 변경 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/(app)/create/page.tsx` | 슬라이드 수 슬라이더 + 스타일 프리셋 선택 UI |
| `src/components/create/GenerationPresetSelector.tsx` | **신규** — 프리셋 선택/생성/편집 컴포넌트 |
| `src/data/generationOptions.ts` | **신규** — 톤/스타일/글자수 옵션 데이터 |

### 3.2 Create 페이지 생성 옵션 영역 변경

**기존** (line 566-586):
```
┌─ 생성 옵션 ──────────────────────────┐
│ 슬라이드 수: [5장] [7장] [9장] [11장] │
└──────────────────────────────────────┘
```

**변경 후**:
```
┌─ 생성 옵션 ──────────────────────────────────┐
│                                               │
│  내 스타일 (선택사항)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 전문 IT   │ │ 캐주얼    │ │ + 만들기  │      │
│  │ 뉴스  ✓  │ │ 트렌드    │ │          │      │
│  │ ✏️ 🗑    │ │          │ │          │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│                                               │
│  선택한 스타일: 전문적 · 간결체 · 보통          │
│                                               │
│  슬라이드 수                                   │
│  [━━━━━━━●━━━━━━] 7장                         │
│  1                10                          │
│                                               │
└──────────────────────────────────────────────┘
```

### 3.3 GenerationPresetSelector 컴포넌트

```
src/components/create/GenerationPresetSelector.tsx
```

**Props**:
```typescript
interface GenerationPresetSelectorProps {
  selectedPresetId: Id<"generationPresets"> | null
  onSelect: (presetId: Id<"generationPresets"> | null) => void
}
```

**상태**:
- `presets`: useQuery로 사용자 프리셋 목록 조회
- `isModalOpen`: 생성/편집 모달 열림 상태
- `editingPreset`: 편집 중인 프리셋 (null이면 신규)

**서브 컴포넌트** (같은 파일 내):
- `PresetCard` — 프리셋 카드 (이름, 요약, 편집/삭제 버튼)
- `PresetModal` — 생성/편집 모달

### 3.4 PresetModal 상세

```
┌─ 내 스타일 만들기 ─────────────── [X] ─┐
│                                         │
│  이름                                   │
│  [프리셋 이름 입력                    ]  │
│                                         │
│  말투                                   │
│  ○ 전문적  ● 친근한  ○ 유머러스  ○ 격식 │
│  ○ 직접 입력: [                     ]   │
│                                         │
│  글쓰기 스타일                           │
│  ● 간결체  ○ 설명체  ○ 대화체           │
│  ○ 직접 입력: [                     ]   │
│                                         │
│  글자수                                 │
│  ○ 짧게  ● 보통  ○ 길게                │
│                                         │
│  대상 독자 (선택)                        │
│  [일반인, MZ세대 등               ]     │
│                                         │
│  추가 지시사항 (선택)                    │
│  [이모지를 많이 사용해주세요       ]     │
│                                         │
│  [저장하기]                              │
└─────────────────────────────────────────┘
```

**모달 동작**:
1. 사전 정의 옵션(radio) + "직접 입력" 옵션 → 직접 입력 선택 시 텍스트 필드 활성화
2. `name` 필수, 나머지 tone/writingStyle/contentLength 기본값 있음
3. 저장 시 `api.generationPresets.save` mutation 호출
4. 편집 모드: 기존 값으로 폼 초기화

### 3.5 슬라이드 수 슬라이더

**기존**: `[5] [7] [9] [11]` 버튼 4개
**변경**: `<input type="range" min={1} max={10} />` + 현재 값 표시

```tsx
<div className="flex flex-col gap-2">
  <div className="flex items-center justify-between">
    <label className="text-sm text-muted">슬라이드 수</label>
    <span className="text-sm font-bold text-accent">{selectedSlideCount}장</span>
  </div>
  <input
    type="range"
    min={1}
    max={10}
    value={selectedSlideCount}
    onChange={(e) => setSelectedSlideCount(Number(e.target.value))}
    className="w-full accent-accent"
  />
  <div className="flex justify-between text-xs text-muted">
    <span>1장</span>
    <span>10장</span>
  </div>
</div>
```

---

## 4. 데이터 흐름

```
Create Page
  │
  ├─ useQuery(api.generationPresets.list) → presets[]
  │
  ├─ User selects preset → selectedPresetId state
  │   (또는 "없이 생성" → null)
  │
  ├─ User adjusts slider → selectedSlideCount (1~10)
  │
  └─ handleGenerate()
      │
      ├─ generateCardNews({
      │    projectId,
      │    slideCount: selectedSlideCount,
      │    presetId: selectedPresetId     ← 신규
      │  })
      │
      └─ Action handler:
          ├─ presetId가 있으면:
          │   runQuery(internal.generationPresets.getInternal)
          │   → preset 데이터 로드
          │
          ├─ getPlanningPrompt(sourceContent, slideCount, preset)
          │   → 스타일 지시가 포함된 프롬프트 생성
          │
          └─ Gemini API 호출 → 슬라이드 생성
```

---

## 5. 구현 순서 (체크리스트)

### Phase 1: Backend
- [ ] `convex/schema.ts` — `generationPresets` 테이블 추가
- [ ] `src/data/generationOptions.ts` — 톤/스타일/글자수 옵션 데이터
- [ ] `convex/generationPresets.ts` — CRUD (list, get, save, remove, setDefault, getInternal)
- [ ] `convex/actions/generate.ts` — `presetId` 인자 추가 + `getPlanningPrompt` 확장

### Phase 2: Frontend
- [ ] `src/components/create/GenerationPresetSelector.tsx` — 프리셋 선택/생성/편집 컴포넌트
- [ ] `src/app/(app)/create/page.tsx` — 슬라이드 수 슬라이더 교체 + 프리셋 선택 UI 통합

### Phase 3: Verification
- [ ] `npx convex dev`로 스키마 마이그레이션 확인
- [ ] `npm run build` 타입체크 통과
- [ ] 프리셋 없이 생성 — 기존과 동일하게 동작 (하위 호환)
- [ ] 프리셋 선택 후 생성 — 톤/말투가 결과에 반영되는지 확인
- [ ] 슬라이드 1장, 2장, 10장 생성 — 구조 분기 정상 동작

---

## 6. 파일별 변경 상세

| 파일 | 변경 유형 | 변경량 |
|------|-----------|--------|
| `convex/schema.ts` | 수정 | +15줄 (테이블 추가) |
| `convex/generationPresets.ts` | **신규** | ~120줄 |
| `convex/actions/generate.ts` | 수정 | ~40줄 (프롬프트 확장 + presetId 처리) |
| `src/data/generationOptions.ts` | **신규** | ~40줄 |
| `src/components/create/GenerationPresetSelector.tsx` | **신규** | ~250줄 |
| `src/app/(app)/create/page.tsx` | 수정 | ~30줄 변경 (슬라이더 + 프리셋 통합) |

**총 변경**: 신규 3파일, 수정 3파일, 약 495줄

---

## 7. 엣지 케이스 처리

| 케이스 | 처리 |
|--------|------|
| 프리셋 0개일 때 | "스타일 없이 기본으로 생성" + "+ 만들기" 버튼만 표시 |
| 프리셋 20개 초과 시도 | save mutation에서 카운트 체크 후 에러 반환 |
| 삭제된 프리셋으로 생성 시도 | getInternal에서 null 반환 → 기본 프롬프트로 fallback |
| 슬라이드 1장 | cover 타입만 생성, content/ending 없음 |
| 슬라이드 2장 | cover + ending, content 없음 |
| "직접 입력" 톤이 빈 문자열 | 저장 시 validation — 빈 값 불가 |
| 기본 프리셋 삭제 | isDefault 자동 해제, 다른 프리셋에 영향 없음 |
