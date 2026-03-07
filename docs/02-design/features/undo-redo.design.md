# Design Document: Editor Undo/Redo - 트랜잭션 기반 편집 히스토리

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 현재 편집기는 `localContent`, `localStyle`, `localOverlays`, `localImage` 기반의 즉시 편집 + debounce autosave 구조이지만, 되돌리기/다시하기 계층이 없어 실수 복구 비용이 크다. |
| **Goal** | `/edit/[id]` 화면에 **세션 로컬 undo/redo**를 도입해 수동 편집, 프리셋 적용, improve 적용, AI apply를 안전하게 되돌릴 수 있게 한다. |
| **Core Decision** | mutation 단위 history가 아니라 **편집 트랜잭션 단위 history**를 도입한다. autosave는 저장 타이밍만 담당하고, history는 편집 상태 전이를 담당한다. |
| **Chosen Architecture** | `src/app/(app)/edit/[id]/page.tsx`를 history coordinator로 유지하고, `src/lib/editorHistory.ts`에 순수 history 로직을 분리하며, `convex/slides.ts`에 batch patch mutation을 추가한다. |
| **Expected UX Outcome** | 사용자는 텍스트 수정, 스타일 조정, 오버레이 이동, 프리셋 적용, AI 적용 후 `⌘/Ctrl+Z`, `⇧⌘/Ctrl+Z`, `Ctrl+Y`로 직관적으로 복구할 수 있다. |

---

## 1. Background & Current State

### 1.1 Current Editing Model
현재 편집기는 `/edit/[id]` 페이지에 상태가 집중되어 있다.

- 현재 슬라이드 중심 로컬 미러 상태
  - `localContent`, `localStyle`, `localOverlays`, `localImage`
  - `src/app/(app)/edit/[id]/page.tsx:439-442`
- autosave 관련 debounce/timer/ref
  - `pendingRef`, `stylePendingRef`, `overlayPendingRef`, `imagePendingRef`
  - `src/app/(app)/edit/[id]/page.tsx:444-452`
- content/style/overlay/image autosave 경로
  - `src/app/(app)/edit/[id]/page.tsx:542-639`
  - `src/app/(app)/edit/[id]/page.tsx:1612-1679`
- AI preview / apply 상태
  - `pendingChatEdit`, `chatPreviewResult`, `isApplyingChatEdit`
  - `src/app/(app)/edit/[id]/page.tsx:431-437`, `997-1149`

즉, undo/redo를 구현하려면 별도 전역 시스템보다 **이 페이지를 history orchestration 중심**으로 삼는 것이 가장 자연스럽다.

### 1.2 Current Gaps
1. 로컬 미러는 **현재 슬라이드만** 가진다.
2. `layoutId`는 `localContent`/`localStyle`처럼 page-level 로컬 미러가 없다.
3. `EditorPanel` 일부 액션은 page-level orchestration을 우회해 직접 mutation을 호출한다.
   - style 관련 직접 mutation 경로: `src/components/editor/EditorPanel.tsx:232-243`
   - layout 변경: `src/components/editor/EditorPanel.tsx:280-281`
   - apply-style-to-all: `src/components/editor/EditorPanel.tsx:332-340`
   - preset load: `src/components/editor/EditorPanel.tsx:360-369`
4. AI apply는 다중 slide patch를 순차 mutation으로 적용하지만, 이를 하나의 되돌리기 트랜잭션으로 묶는 계층이 없다.
   - `src/app/(app)/edit/[id]/page.tsx:1051-1149`
5. Convex persistence는 `updateSlide`, `updateSlideStyle`, `updateSlideImage`, `updateSlideLayout`, `updateSlideOverlays`처럼 concern별로 분리되어 있어 undo/redo replay 관점에서는 너무 세분화되어 있다.
   - `convex/slides.ts:159-213`, `262-278`, `405-421`

---

## 2. Goals

### 2.1 Primary Goals
- 수동 편집(content/style/layout/image/overlay/textEffects)의 undo/redo 지원
- preset/apply-to-all/improve/AI apply를 **트랜잭션 단위**로 undo/redo 지원
- autosave와 충돌 없이 local-first UX 유지
- multi-slide 변경도 한 번의 undo로 되돌릴 수 있는 구조 제공
- 현재 코드 구조를 크게 깨지 않고 점진적으로 도입 가능해야 함

### 2.2 Non-Goals (v1)
- 새로고침 후 history 복구
- 서버 영속 edit-history 테이블 도입
- slide 생성/삭제/재정렬의 완전한 undo/redo
- AI preview 단계 자체를 history에 포함
- collaborative editing / multi-user concurrent history

---

## 3. Design Principles

1. **History owns data change, autosave owns persistence timing.**
2. **Preview is not history. Apply is history.**
3. **Undo/redo operates on transactions, not individual mutations.**
4. **Current UX must remain optimistic and responsive.**
5. **Query hydration must never duplicate history entries.**

---

## 4. ADR

### Decision
편집기 undo/redo는 **세션 로컬 transaction history**로 구현하고, 각 history entry는 **영향받은 slide의 before/after editable snapshot 집합**을 가진다.

### Drivers
- 현재 상태가 page-level local state에 집중되어 있음
- manual edit와 AI apply 모두를 동일한 모델로 다뤄야 함
- autosave debounce 구조와 충돌을 최소화해야 함
- partial failure/redo invalidation을 단순하게 처리해야 함

### Alternatives Considered

#### Option A — Mutation-level history
- 각 `updateSlide*` 호출을 history entry로 저장
- **장점**: 구현 시작은 쉬움
- **단점**: slider drag/typing burst가 entry 폭증, multi-slide AI apply를 하나로 묶기 어려움, partial failure 처리 취약

#### Option B — Full project snapshot stack
- 매 편집마다 전체 project/slides snapshot 보관
- **장점**: inverse 계산이 단순
- **단점**: 메모리 과다, 현재 slide만 자주 바뀌는 구조에 비해 비효율적, apply-to-all 외에는 낭비 큼

#### Option C — Transaction history with per-slide before/after snapshots **(Chosen)**
- 편집 단위를 transaction으로 묶고, 영향 slide만 snapshot 보관
- **장점**: multi-slide AI apply 지원, inverse 계산 단순, scope 명확, 성능/복잡도 균형 우수
- **단점**: snapshot builder와 coalescing 규칙 설계가 필요

### Why Chosen
Option C가 현재 코드 구조와 가장 잘 맞고, manual edit / preset / improve / AI apply를 하나의 모델로 통합할 수 있다.

### Consequences
- page.tsx에 history coordinator가 추가된다.
- `EditorPanel` direct mutation 경로를 page-owned command로 수렴시켜야 한다.
- Convex에 batch mutation이 필요하다.
- `layoutId`의 local mirror가 새로 필요하다.

### Follow-ups
- v2에서 persistent edit history 검토
- slide reorder/create/delete history 확장 검토
- observability(event logging) 확장 검토

---

## 5. Scope Boundaries

### 5.1 Undoable Domain
다음은 history 대상이다.

- content 변경
- style 변경
- textEffects 변경
- `layoutId` 변경
- image 변경
- overlays 변경
- preset 적용
- improve 적용
- apply-style-to-all / apply-overlays-to-all
- AI apply

### 5.2 Non-Undoable Domain
다음은 history 대상이 아니다.

- `currentSlideIndex`
- `mobileTab`
- `isAiChatOpen`
- `chatInput`, `chatMessages`, `isPlanningEdit`
- `pendingChatEdit`, `chatPreviewResult`
- selection / marquee / drag guide / editing focus
- 단순 preview/cancel/retry

### 5.3 AI Preview Boundary
AI preview는 `pendingChatEdit`와 `chatPreviewResult`를 통해 로컬에만 나타나는 검토 상태다.
- 참조: `src/app/(app)/edit/[id]/page.tsx:997-1049`
- 결론: **preview는 history entry를 만들지 않는다**.
- confirm 시점의 apply만 history를 생성한다.

### 5.4 Slide Navigation Boundary
`goToSlide`, carousel swipe, preview select는 UX 상태다.
- 참조: `src/app/(app)/edit/[id]/page.tsx:1758-1778`, `src/components/preview/SwipeCarousel.tsx:217-319`
- 결론: navigation은 history가 아니다.
- 단, history entry는 `focusSlideId` 메타데이터를 가질 수 있고, undo/redo 성공 후 UX 편의상 해당 slide로 이동할 수 있다.

---

## 6. UX Design

### 6.1 Toolbar Placement
권장 위치:
- autosave status 근처 상단 toolbar
- desktop: preview 상단 도구 영역
- mobile: 상단 sticky toolbar 또는 더보기 메뉴 내

### 6.2 Controls
- Undo 버튼
- Redo 버튼
- tooltip: `실행 취소`, `다시 실행`
- disabled state 명시

### 6.3 Shortcuts
- macOS undo: `⌘Z`
- Windows/Linux undo: `Ctrl+Z`
- redo: `⇧⌘Z` 또는 `Ctrl+Y`
- 추가 허용: `Ctrl+Shift+Z`

### 6.4 Shortcut Guard Rules
다음에서는 글로벌 editor undo/redo를 가로채지 않는다.
- textarea/input/contenteditable 내부 편집 중
- AI chat composer 포커스 상태
- native text selection 편집이 우선인 경우

### 6.5 Disabled Conditions
다음 조건에서는 undo/redo 비활성화:
- `undoStack.length === 0`
- `redoStack.length === 0`
- `pendingChatEdit !== null`
- `isApplyingChatEdit === true`
- history replay 진행 중

### 6.6 Coalescing UX Rules
#### 하나의 entry로 묶기
- typing burst
- slider drag
- overlay drag/resize
- image move/resize
- inline style drag

#### 즉시 확정 entry
- layout 클릭 변경
- preset 적용
- improve 적용
- AI apply
- apply-to-all

---

## 7. Data Model

### 7.1 Snapshot Types
```ts
export interface EditableSlideSnapshot {
  slideId: Id<"slides">;
  layoutId: string;
  content: SlideContent;
  style: SlideStyle;
  image?: SlideImage;
  overlays: Overlay[];
}

export interface EditorWorkingSnapshot {
  projectId: Id<"projects">;
  slides: EditableSlideSnapshot[];
  currentSlideId: Id<"slides"> | null;
}
```

### 7.2 History Types
```ts
export type EditorHistorySource =
  | "manual"
  | "ai_apply"
  | "preset"
  | "improve"
  | "apply_to_all";

export interface EditorHistoryPatch {
  slideId: Id<"slides">;
  before: EditableSlideSnapshot;
  after: EditableSlideSnapshot;
}

export interface EditorHistoryEntry {
  id: string;
  source: EditorHistorySource;
  createdAt: number;
  focusSlideId: Id<"slides"> | null;
  coalescingKey?: string;
  patches: EditorHistoryPatch[];
}
```

### 7.3 Local Runtime State
`page.tsx`에 추가 권장:
```ts
const [undoStack, setUndoStack] = useState<EditorHistoryEntry[]>([]);
const [redoStack, setRedoStack] = useState<EditorHistoryEntry[]>([]);
const [localLayoutId, setLocalLayoutId] = useState<string | null>(null);

const draftHistoryRef = useRef<EditorHistoryEntry | null>(null);
const historyReplayRef = useRef(false);
const historySuspendRef = useRef(false);
```

### 7.4 Stack Cap
- 기본 cap: 50 entries
- 초과 시 가장 오래된 undo entry부터 제거
- redo는 새로운 forward edit 발생 시 비운다

---

## 8. Architecture

### 8.1 `page.tsx` as History Coordinator
`src/app/(app)/edit/[id]/page.tsx`는 계속 orchestration 중심이다.

추가 책임:
- working snapshot builder 제공
- history entry 생성/병합/확정
- undo/redo keyboard binding
- local state replay
- batch persistence 호출
- query hydration guard 관리

### 8.2 New Pure Module: `src/lib/editorHistory.ts`
책임:
- history 타입 정의
- snapshot normalize
- before/after 비교
- transaction 생성
- inverse/redo helper
- coalescing 판단
- stack push/pop helper

이 모듈은 React/Convex 의존성이 없는 순수 함수 집합으로 유지한다.

### 8.3 Batch Persistence Layer
`convex/slides.ts`에 신규 mutation 추가:

```ts
export const applySlidePatches = mutation({
  args: {
    projectId: v.id("projects"),
    patches: v.array(v.object({
      slideId: v.id("slides"),
      content: v.optional(contentValidator),
      style: v.optional(styleValidator),
      layoutId: v.optional(v.string()),
      image: v.optional(imageValidator),
      overlays: v.optional(v.array(overlayValidator)),
    })),
  },
  handler: async (ctx, { projectId, patches }) => {
    // auth check
    // patch each slide in one mutation boundary
  },
});
```

목표:
- AI apply / undo / redo / preset / apply-to-all 경로 통일
- partial failure surface 축소
- persistence semantics 일관화

---

## 9. Working Snapshot Strategy

### 9.1 Why Needed
현재는 active slide만 local mirror가 있고, 나머지 slide는 Convex query가 canonical source다. AI apply와 undo/redo는 multi-slide 대상이 될 수 있으므로 **단일 working snapshot builder**가 필요하다.

### 9.2 Builder Rule
source =
1. `slides` query 결과
2. active slide의 `localContent`, `localStyle`, `localOverlays`, `localImage`, `localLayoutId`
3. history replay 중인 경우 replay state 우선

### 9.3 Required Helper
```ts
function buildWorkingSlidesSnapshot(): EditableSlideSnapshot[]
```

이 함수는 다음에서 공통으로 사용한다.
- manual edit 전 before capture
- AI apply 전 before capture
- undo/redo 대상 계산
- query hydration 비교

---

## 10. Command Model

### 10.1 Manual Edit Command
모든 manual edit는 page-level command를 통해 진입한다.

예:
- `commitContentChange`
- `commitStyleChange`
- `commitLayoutChange`
- `commitOverlayChange`
- `commitImageChange`
- `commitApplyPreset`
- `commitApplyStyleToAll`

### 10.2 Why Page-owned Commands
현재 `EditorPanel` 일부 액션이 page orchestration을 우회한다.
- `src/components/editor/EditorPanel.tsx:232-243`
- `280-281`
- `332-340`
- `360-369`

undo/redo 일관성을 위해 **직접 mutation 호출을 page callback 기반 command로 수렴**해야 한다.

---

## 11. Detailed Flows

### 11.1 Manual Edit Flow
1. UI interaction 발생
2. page command 호출
3. `buildWorkingSlidesSnapshot()`으로 before 캡처
4. local state 즉시 반영
5. after snapshot 계산
6. coalescing 가능하면 draft entry 병합
7. autosave debounce 시작
8. debounce 완료 시 batch mutation 또는 기존 granular mutation 호출
9. 저장 성공 시 status 갱신

### 11.2 AI Preview Flow
1. `planChatEditAction` 호출
2. `pendingChatEdit` 생성
3. `chatPreviewResult` 계산
4. preview UI 노출
5. history 변화 없음
6. save 없음

### 11.3 AI Apply Flow
1. 사용자 confirm
2. 현재 working snapshot에서 before 캡처
3. `chatPreviewResult.patches`를 editable snapshot patch로 변환
4. 하나의 `EditorHistoryEntry` 생성
5. local state에 즉시 반영
6. batch mutation으로 persist
7. 성공 시 undoStack push, redoStack clear
8. `pendingChatEdit` 제거

### 11.4 Undo Flow
1. 최신 undo entry pop
2. 관련 debounce timer 전부 clear
3. selection/drag/editing 상태 reset
4. entry의 `before` snapshot을 local state에 반영
5. same patch set을 batch mutation으로 persist
6. redoStack에 해당 entry push
7. `focusSlideId`가 있으면 해당 slide로 이동

### 11.5 Redo Flow
1. 최신 redo entry pop
2. debounce timer clear
3. selection reset
4. entry의 `after` snapshot 적용
5. same batch mutation persist
6. undoStack에 재push

---

## 12. Autosave Reconciliation Strategy

### 12.1 Core Rule
autosave는 history를 만들지 않는다. 이미 생성된 local transaction을 **저장만** 한다.

### 12.2 Required Guards
- undo/redo 직전 모든 timer clear
- `historyReplayRef.current = true` 동안 history push 금지
- query hydration이 replay 결과를 다시 local mirror에 반영하면서 duplicate entry를 만들지 않도록 guard 필요

### 12.3 Draft Coalescing Boundaries
- typing: idle 1200ms 또는 blur 시 확정
- slider/drag: pointer up 시 확정
- click action: 즉시 확정

### 12.4 Failure Policy
저장 실패 시:
- local undo/redo stack은 유지
- autosave status는 `error`
- 사용자에게 재시도 가능 상태 유지
- 다음 편집 또는 수동 retry에서 재저장 시도 가능

---

## 13. AI Integration Policy

### 13.1 AI Preview is Ephemeral
다음 상태는 history에 포함하지 않는다.
- `chatScope`
- `chatInput`
- `chatMessages`
- `pendingChatEdit`
- `chatPreviewResult`

### 13.2 AI Apply is Atomic
AI apply는 여러 slide/content/style/layout/image를 건드려도 **1 history entry**다.

### 13.3 Overlay Note
현재 AI schema는 overlay operation을 직접 다루지 않는다.
- operation types: `src/lib/chatEdit.ts:20-27`
- apply path에는 overlay mutation 없음: `src/app/(app)/edit/[id]/page.tsx:1070-1109`

따라서 overlay undo/redo는 v1에서 **manual lane만 지원**한다.

---

## 14. File-Level Impact

| File | Change Type | Responsibility |
|------|-------------|----------------|
| `src/app/(app)/edit/[id]/page.tsx` | Major | history coordinator, snapshot builder, keyboard handling, replay |
| `src/lib/editorHistory.ts` | New | history types/helpers/coalescing/inversion |
| `src/components/editor/EditorPanel.tsx` | Medium | direct mutation 제거, page command callback 사용 |
| `src/components/editor/AIChatPanel.tsx` | Small | native textarea undo 보호 |
| `src/components/editor/AIChatDecisionDialog.tsx` | Small | preview 중 undo/redo disabled UX |
| `convex/slides.ts` | Medium | batch patch mutation 추가 |
| `src/types/index.ts` | Small/Optional | history shared type extraction 지원 |

---

## 15. Implementation Plan

### Phase 1 — Foundation
- `editorHistory.ts` 생성
- `EditableSlideSnapshot`, `EditorHistoryEntry` 정의
- `localLayoutId` 추가
- `buildWorkingSlidesSnapshot()` 구현

### Phase 2 — Manual Edit Integration
- content/style/image/overlay/layout command 래핑
- coalescing 규칙 도입
- undo/redo stack 연결

### Phase 3 — Direct Mutation Consolidation
- `EditorPanel` direct mutation 경로 제거
- page callback 중심으로 재배선
- preset/apply-to-all/improve도 동일 transaction 모델 사용

### Phase 4 — Batch Persistence
- `convex/slides.ts`에 batch patch mutation 추가
- AI apply / undo / redo / apply-to-all을 공통 persistence path로 이동

### Phase 5 — UX Polish
- toolbar 버튼 추가
- keyboard shortcut 추가
- preview 중 disable 처리
- focus slide 이동 polish

### Phase 6 — Hardening
- hydration guard
- retry/error UX
- stack cap / telemetry / smoke coverage

---

## 16. Risks & Mitigations

### Risk 1 — Query Echo Duplicates History
- **Cause**: replay 후 Convex query 갱신이 다시 local hydrate를 유발
- **Mitigation**: `historyReplayRef`, hydration comparison, local source marker 도입

### Risk 2 — Partial Failure During Multi-slide Apply
- **Cause**: AI apply/undo가 여러 mutation으로 분산
- **Mitigation**: batch mutation 도입

### Risk 3 — Native Textarea Undo Breakage
- **Cause**: 글로벌 keydown handler가 chat composer/input까지 가로챔
- **Mitigation**: input/textarea/contenteditable guard

### Risk 4 — Stack Explosion During Drag/Typing
- **Cause**: 미세 이벤트마다 push
- **Mitigation**: coalescing + idle boundary + pointer-up commit

### Risk 5 — Layout Not Represented in Local Snapshot
- **Cause**: 현재 `layoutId` local mirror 부재
- **Mitigation**: `localLayoutId` 추가 필수

### Risk 6 — Current Slide Only Local Mirror Causes Inconsistent Replay
- **Cause**: AI apply/undo가 non-current slide도 건드림
- **Mitigation**: working snapshot builder + affected slide local sync policy 도입

---

## 17. Acceptance Criteria

- [ ] `/edit/[id]`에서 undo/redo 버튼이 노출된다.
- [ ] content/style/layout/image/overlay 수동 편집을 undo/redo 할 수 있다.
- [ ] typing/drag/slider는 과도한 history entry 폭증 없이 coalescing 된다.
- [ ] AI preview는 undo entry를 만들지 않는다.
- [ ] AI apply는 한 번의 undo로 전체 patch가 되돌아간다.
- [ ] apply-style-to-all / preset / improve 적용도 undo 가능하다.
- [ ] undo/redo 중 autosave debounce와 충돌하지 않는다.
- [ ] query refresh 이후 같은 변경이 중복 history로 적재되지 않는다.
- [ ] input/textarea 내부 native undo는 유지된다.
- [ ] redo는 새로운 forward edit 발생 시 비워진다.

---

## 18. Verification Plan

### 18.1 Unit Tests
대상: `src/lib/editorHistory.ts`
- patch inversion
- coalescing merge
- redo invalidation
- multi-slide history entry 생성
- stack cap pruning

### 18.2 Integration Tests
- content typing → undo → redo
- style slider drag → undo
- overlay drag → undo
- layout change → undo
- preset apply → undo
- improve apply → undo
- AI preview cancel → history unchanged
- AI apply → undo 1회로 전체 rollback

### 18.3 E2E / Playwright
- desktop shortcut smoke
- mobile toolbar undo/redo smoke
- preview active 시 shortcut disabled 확인
- focus slide 이동 확인

### 18.4 Build Verification
구현 후 실행:
```bash
npm run typecheck
npm run lint
npm run build
```

참고: 현재 repo에는 `npm test` 스크립트가 없다.

---

## 19. Recommended Rollout

### Step 1
manual edit만 history 적용

### Step 2
preset / improve / apply-to-all 연결

### Step 3
AI apply를 batch transaction으로 전환

### Step 4
Playwright smoke + UX polish

이 순서를 따르면 기존 편집기의 안정성을 해치지 않고 단계적으로 undo/redo를 도입할 수 있다.

---

## 20. Final Recommendation

가장 안전한 구현 전략은 다음이다.

1. **page.tsx 중심 orchestration 유지**
2. **history는 transaction layer로 설계**
3. **autosave와 history 역할 분리**
4. **AI preview는 제외, AI apply만 atomic entry**
5. **Convex batch patch mutation으로 persist 경로 통일**

이 설계는 현재 코드베이스의 구조를 존중하면서도, 수동 편집과 AI 편집을 모두 포괄하는 확장 가능한 undo/redo 기반을 제공한다.
