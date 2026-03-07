# Design Document: AI Chat Auto Edit - 자연어 기반 카드뉴스 편집

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 생성된 카드뉴스를 다듬는 마지막 단계가 여전히 수동 편집 중심이라 반복 속도가 떨어짐 |
| **Solution** | `/edit/[id]` 화면에 AI Chat drawer를 추가하고, 자연어 명령을 구조화된 편집 명령으로 변환해 preview 후 적용 |
| **Function UX Effect** | 사용자는 “무엇을 바꿀지”만 말하고, 시스템은 현재 편집 상태에 맞는 안전한 수정안을 제시 |
| **Core Value** | AI 생성 이후의 편집 시간을 줄이면서도, 사용자에게 최종 제어권을 유지 |

**Plan Reference**: `docs/01-plan/features/ai-chat-auto-edit.plan.md`

---

## 1. Product Surface

### 1.1 Route Placement
- 대상 화면: `src/app/(app)/edit/[id]/page.tsx`
- 이유:
  - 생성 완료 시 이미 `/edit/${projectId}`로 이동
  - `localContent`, `localStyle`, `localImage`, selection, autosave 로직이 모두 이 화면에 존재
  - slide preview / editor control / mutations 연결이 가장 풍부함

### 1.2 Layout Strategy

#### Desktop
3-column 구조 권장:
1. 좌측: 기존 `EditorPanel`
2. 중앙: preview / canvas
3. 우측: **AI Chat drawer**

#### Mobile
- 기존 edit / preview 탭 구조는 유지
- AI Chat은 하단 floating trigger로 열리는 **bottom sheet**

### 1.3 Entry Points
- 상단 툴바에 `AI Chat` 버튼 추가
- 또는 editor 패널 하단 `AI로 수정하기` CTA 추가
- 특정 텍스트 필드 선택 중에는 `InlineToolbox`에서 “AI로 다듬기” shortcut 제공 가능

---

## 2. UX Design

### 2.1 AI Chat Drawer Sections

1. **Header**
   - 제목: `AI Edit`
   - 현재 scope badge
   - close button

2. **Scope Selector**
   - `현재 슬라이드`
   - `선택 텍스트`
   - `전체 슬라이드`

3. **Prompt Chips**
   - `더 미니멀하게`
   - `제목 더 임팩트 있게`
   - `고급스럽게`
   - `가독성 높이기`
   - `배경 이미지 정리`

4. **Message Thread**
   - user prompt bubble
   - assistant summary bubble
   - operation preview card

5. **Composer**
   - multiline textarea
   - submit button
   - loading state

6. **Preview / Apply Footer**
   - 변경 요약
   - `적용`
   - `취소`
   - `다시 제안받기`

### 2.2 UX Rules
- AI 응답 직후 DB 저장 금지
- preview가 준비되기 전까지 apply 버튼 비활성화
- `전체 슬라이드` 범위는 summary를 더 자세히 보여줌
- 실패 시 “적용 가능한 변경 없음” 상태를 명확히 노출

---

## 3. Client State Design

### 3.1 Local UI State
추가할 상태 예시:

```typescript
type ChatScope = "selected_text" | "current_slide" | "all_slides";

interface PendingChatEdit {
  scope: ChatScope;
  summary: string;
  operations: EditOperation[];
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  createdAt: number;
}
```

권장 state:
- `isAiChatOpen`
- `chatScope`
- `chatInput`
- `chatMessages`
- `isPlanningEdit`
- `pendingChatEdit`
- `chatError`

### 3.2 Preview Strategy
- AI 응답을 받으면 바로 `pendingChatEdit` 생성
- 기존 `localContent`, `localStyle`, `localImage`, `overlays`에 임시 반영
- apply 시에만 Convex mutation 실행
- cancel 시 preview state 폐기

### 3.3 Scope Mapping
| Scope | Context Source |
|------|----------------|
| `selected_text` | 현재 선택된 text field + current slide |
| `current_slide` | 현재 slide 전체 content/style/image/overlay |
| `all_slides` | project의 전체 slides 요약 + 현재 style catalogs |

---

## 4. Operation Schema Design

### 4.1 Core Principle
LLM은 자유 HTML이나 자유 코드가 아니라 **허용된 편집 operation 집합**만 반환해야 한다.

### 4.2 Operation Type

```typescript
type EditOperation =
  | {
      type: "update_content";
      slideRef: "current" | number;
      changes: Partial<{
        category: string;
        title: string;
        subtitle: string;
        body: string;
      }>;
    }
  | {
      type: "update_style";
      slideRef: "current" | number;
      changes: Partial<SlideStyle>;
    }
  | {
      type: "update_layout";
      slideRef: "current" | number;
      layoutId: string;
    }
  | {
      type: "update_image";
      slideRef: "current" | number;
      changes: Partial<{
        externalUrl: string;
        opacity: number;
        size: number;
        fit: "cover" | "contain" | "fill" | "free";
      }>;
    }
  | {
      type: "apply_style_to_all";
      changes: Partial<SlideStyle>;
    };
```

### 4.3 Catalog Guardrails
허용값은 기존 catalog에서만 선택:
- layout: `src/data/layouts.ts`
- color preset / gradients: `src/data/presets.ts`
- font family: `src/data/fonts.ts`

### 4.4 Response Envelope

```typescript
interface ChatEditPlan {
  summary: string;
  scope: "selected_text" | "current_slide" | "all_slides";
  operations: EditOperation[];
  warnings?: string[];
}
```

---

## 5. Backend Design

### 5.1 New Convex Action
신규 action 권장:

```typescript
export const planChatEdit = action({
  args: {
    projectId: v.id("projects"),
    currentSlideId: v.optional(v.id("slides")),
    scope: v.union(
      v.literal("selected_text"),
      v.literal("current_slide"),
      v.literal("all_slides"),
    ),
    selectedField: v.optional(v.union(
      v.literal("category"),
      v.literal("title"),
      v.literal("subtitle"),
      v.literal("body"),
    )),
    instruction: v.string(),
  },
  handler: async (ctx, args) => { /* ... */ },
});
```

### 5.2 Planning Prompt Inputs
LLM 입력 컨텍스트:
- 현재 slide content
- 현재 slide style
- 선택된 field
- 사용 가능한 layout/font/preset catalog
- operation schema
- 금지 규칙:
  - unknown layout 금지
  - 임의 hex 남발 금지
  - 필수 텍스트 삭제 금지

### 5.3 Apply Layer

#### MVP
프론트에서 operation type별로 기존 mutation 호출:
- `update_content` -> `api.slides.updateSlide`
- `update_style` -> `api.slides.updateSlideStyle`
- `update_layout` -> `api.slides.updateSlideLayout`
- `update_image` -> `api.slides.updateSlideImage`
- `apply_style_to_all` -> `api.slides.applyStyleToAll`

#### Phase 2
`applyChatEditBatch` action/internalMutation 추가:
- 여러 slide 수정 원자적 처리
- 실패 시 rollback 용이

---

## 6. Data Model Expansion

### 6.1 MVP Decision
MVP는 **client-only thread + preview-first apply**로 시작 가능하다.

즉, 아래 테이블은 **Phase 2 권장안**으로 둔다.

### 6.2 Phase 2 Tables

#### `chatSessions`
```typescript
{
  projectId: Id<"projects">,
  userId: Id<"users">,
  title: string,
  createdAt: number,
  updatedAt: number,
}
```

#### `chatMessages`
```typescript
{
  sessionId: Id<"chatSessions">,
  role: "user" | "assistant",
  text: string,
  operationsJson?: string,
  createdAt: number,
}
```

#### `slideEditHistory`
```typescript
{
  projectId: Id<"projects">,
  slideId?: Id<"slides">,
  source: "ai_chat" | "manual",
  beforeJson: string,
  afterJson: string,
  createdAt: number,
}
```

---

## 7. Component Design

### 7.1 New Components

| Component | Responsibility |
|-----------|----------------|
| `AIChatPanel` | drawer shell, thread, composer |
| `AIChatScopeSelector` | scope chips |
| `AIChatPromptChips` | 빠른 프롬프트 |
| `AIChatPreviewCard` | 변경 요약 + warnings |
| `AIChatApplyBar` | apply / cancel / retry |

### 7.2 Existing Components to Reuse

| Existing | Reuse Strategy |
|----------|----------------|
| `ImproveModal` | AI prompt wording / chips UX 참고 |
| `EditorPanel` | action CTA 위치 및 slide context 전달 |
| `InlineToolbox` | 선택 텍스트 field scope 연결 |
| `CardSlideRenderer` | preview 결과 렌더링 그대로 활용 |

---

## 8. Interaction Rules

### 8.1 Selected Text Mode
- `InlineToolbox`에서 특정 field 선택 상태일 때만 진입 가능
- `title`, `subtitle`, `body`, `category`만 허용
- style/textEffect 범위는 해당 field에만 적용

### 8.2 Current Slide Mode
- 가장 기본 mode
- content/style/layout/image를 한 슬라이드 범위에서 변경

### 8.3 All Slides Mode
- 색상 테마, 폰트, 레이아웃 패턴, 톤 통일 등 고수준 변경만 허용
- 본문 전체 rewrite는 MVP에서 제한하거나 warning 처리

---

## 9. Validation & Safety

### 9.1 Client Validation
- unknown operation type reject
- unknown layoutId reject
- unknown font reject
- 너무 긴 텍스트 변경 reject or warn
- 빈 title 생성 reject

### 9.2 UX Safeguards
- AI가 변경한 필드 목록 표시
- `적용 전 보기` 기본값
- `전체 슬라이드`는 warning badge 표시
- 실패 시 기존 state 유지

### 9.3 Fallback Rules
- operation 1개라도 invalid면:
  - 전체 폐기 대신 valid op만 유지하는 전략 우선
  - summary에 dropped warning 추가

---

## 10. Implementation Breakdown

### Step 1 — UI Shell
- edit page에 `AIChatPanel` mount
- open/close state 연결
- prompt submit skeleton 구축

### Step 2 — Planning Action
- `planChatEdit` action 추가
- LLM structured output schema 구현
- prompt context + catalogs 연결

### Step 3 — Preview Apply
- `pendingChatEdit` state 추가
- operation -> local preview mapper 구현
- apply/cancel flow 구현

### Step 4 — Scope & Polish
- selected text scope 연결
- 전체 슬라이드 스타일 적용 연결
- loading/error/warning polish

### Step 5 — Phase 2 Foundation
- batch apply
- edit history
- persistent chat

---

## 11. Acceptance Criteria

- [ ] `/edit/[id]`에서 AI Chat drawer를 열 수 있다
- [ ] 자연어 프롬프트로 structured edit plan을 받을 수 있다
- [ ] plan은 허용된 operation schema만 사용한다
- [ ] 사용자는 적용 전 변경 요약을 확인할 수 있다
- [ ] apply 시 기존 slide mutation이 호출된다
- [ ] invalid operation은 안전하게 무시되거나 경고된다
- [ ] current slide 기준 카피 + 스타일 수정이 동작한다
- [ ] all slides 기준 최소 1개의 스타일 통일 시나리오가 동작한다

---

## 12. Recommended MVP Decision

MVP는 아래 조합이 가장 현실적이다:

1. **persistent drawer UI**
2. **current slide 우선**
3. **structured patch output**
4. **preview-first apply**
5. **기존 mutation 재사용**

즉, “AI chat 기능이 눈에 보이면서도 안전한 편집기”를 가장 짧은 경로로 구현하는 설계다.
