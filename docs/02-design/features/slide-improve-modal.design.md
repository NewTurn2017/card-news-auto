# Design: Slide Improve Modal

> Plan Reference: `docs/01-plan/features/slide-improve-modal.plan.md`

## 1. Component Architecture

### 1.1 New Component

**`src/components/editor/ImproveModal.tsx`**

```typescript
interface ImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImprove: (instruction: string) => Promise<void>;
  content: SlideContent;  // from @/types
  isImproving: boolean;
}
```

### 1.2 Modified Components

**`src/components/editor/SlideActions.tsx`**
- `onImprove` prop 의미 변경: 직접 AI 호출 -> 모달 열기 트리거
- Props 변경 없음 (시그니처 동일, 호출자 측에서 동작만 변경)

**`src/components/editor/EditorPanel.tsx`**
- `showImproveModal` 상태 추가
- `handleImprove(instruction: string)` 파라미터 추가
- SlideActions.onImprove -> 모달 열기로 변경

## 2. UI Design

### 2.1 Modal Layout

```
┌─────────────────────────────────────────┐
│  AI 슬라이드 개선                    [X] │
├─────────────────────────────────────────┤
│                                         │
│  현재 슬라이드 내용                      │
│  ┌─────────────────────────────────────┐│
│  │ [category]                          ││
│  │ [title]                             ││
│  │ [subtitle]                          ││
│  │ [body]                              ││
│  └─────────────────────────────────────┘│
│                                         │
│  빠른 프롬프트                           │
│  ┌──────┐ ┌───────────┐ ┌──────────┐   │
│  │더 짧게│ │질문형으로  │ │임팩트있게│   │
│  └──────┘ └───────────┘ └──────────┘   │
│  ┌───────────┐ ┌──────────┐            │
│  │쉽게 풀어서 │ │전문적으로 │            │
│  └───────────┘ └──────────┘            │
│                                         │
│  어떻게 개선할까요?                      │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │ (textarea placeholder:              ││
│  │  "예: 제목을 질문형으로 바꿔줘")      ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌────────┐  ┌─────────────────────┐    │
│  │  취소   │  │     개선하기 ✨      │    │
│  └────────┘  └─────────────────────┘    │
└─────────────────────────────────────────┘
```

### 2.2 Quick Prompt Presets

```typescript
const QUICK_PROMPTS = [
  { label: "더 짧게", value: "더 짧고 간결하게 줄여주세요" },
  { label: "질문형으로", value: "제목을 질문형으로 바꿔주세요" },
  { label: "임팩트 있게", value: "더 임팩트 있고 강렬하게 개선해주세요" },
  { label: "쉽게 풀어서", value: "쉬운 말로 풀어서 설명해주세요" },
  { label: "전문적으로", value: "더 전문적이고 신뢰감 있는 톤으로 바꿔주세요" },
];
```

### 2.3 Styling Rules

- ExportModal과 동일한 모달 패턴 사용: `fixed inset-0 z-50`, `bg-black/40` backdrop
- 카드: `rounded-xl border border-border bg-surface shadow-xl`
- 프리셋 칩: `rounded-full border border-border px-3 py-1.5 text-xs` + 클릭 시 accent 강조
- textarea: `rounded-lg border border-border bg-surface-hover text-foreground`
- 버튼: 기존 accent 스타일 (`bg-accent text-white`)
- 로딩 중: 버튼 텍스트 "개선 중..." + `disabled:opacity-60`
- 최대 너비: `max-w-md` (ExportModal의 `max-w-sm`보다 약간 넓음)

## 3. Interaction Spec

### 3.1 State Machine

```
[Closed] --(click "슬라이드 개선")--> [Open]
[Open] --(type/click preset)--> [Open + input filled]
[Open + input filled] --(click "개선하기")--> [Improving]
[Improving] --(success)--> [Closed] + slide updated
[Improving] --(error)--> [Open + error shown]
[Open] --(ESC / backdrop click / X)--> [Closed]
```

### 3.2 Behaviors

| Action | Result |
|--------|--------|
| 프리셋 칩 클릭 | textarea에 해당 value 설정 (덮어쓰기) |
| 빈 textarea로 "개선하기" 클릭 | 버튼 disabled (방지) |
| AI 처리 중 모달 닫기 시도 | 차단 (onClose 무시) |
| 슬라이드 인덱스 변경 | 모달 자동 닫기 |
| 성공 후 | 모달 닫기 + instruction 초기화 |

### 3.3 Keyboard Support

| Key | Action |
|-----|--------|
| ESC | 모달 닫기 (isImproving 중이면 무시) |
| Cmd/Ctrl + Enter | "개선하기" 실행 |

## 4. Data Flow

```
EditorPanel
├── state: showImproveModal (boolean)
├── state: isImproving (boolean) -- 기존 그대로
│
├── SlideActions
│   └── onImprove → setShowImproveModal(true)
│
└── ImproveModal (conditional render)
    ├── content = localContent (현재 슬라이드 콘텐츠)
    ├── onClose → setShowImproveModal(false)
    ├── onImprove(instruction) → handleImprove(instruction)
    │   ├── improveSlideAction({ slideId, instruction })
    │   ├── updateSlideMutation({ slideId, content: improved })
    │   └── setShowImproveModal(false) on success
    └── isImproving → 로딩 UI
```

## 5. Implementation Tasks (Ordered)

| # | Task | File | Depends |
|---|------|------|---------|
| 1 | ImproveModal 컴포넌트 생성 | `src/components/editor/ImproveModal.tsx` | - |
| 2 | EditorPanel에 모달 상태 관리 추가 | `src/components/editor/EditorPanel.tsx` | 1 |
| 3 | handleImprove를 instruction 파라미터 받도록 수정 | `src/components/editor/EditorPanel.tsx` | 1 |
| 4 | SlideActions.onImprove를 모달 열기로 연결 | `src/components/editor/EditorPanel.tsx` | 2 |
| 5 | 슬라이드 변경 시 모달 닫기 useEffect 추가 | `src/components/editor/EditorPanel.tsx` | 2 |

## 6. Acceptance Criteria

- [ ] "슬라이드 개선" 클릭 시 모달이 열린다
- [ ] 모달에 현재 슬라이드의 category/title/subtitle/body가 표시된다
- [ ] 프리셋 칩 클릭 시 textarea에 해당 프롬프트가 입력된다
- [ ] 사용자가 직접 프롬프트를 입력할 수 있다
- [ ] "개선하기" 버튼으로 AI 개선이 실행되고 결과가 슬라이드에 반영된다
- [ ] AI 처리 중 로딩 상태가 표시된다
- [ ] ESC/X/backdrop으로 모달을 닫을 수 있다
- [ ] 빈 프롬프트 시 버튼이 비활성화된다
- [ ] 슬라이드 전환 시 모달이 자동으로 닫힌다
