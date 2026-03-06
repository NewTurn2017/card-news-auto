# Plan: Slide Improve Modal

## Executive Summary

| Item | Detail |
|------|--------|
| Feature | slide-improve-modal |
| Created | 2026-03-06 |
| Status | Plan |

### Value Delivered

| Perspective | Description |
|-------------|-------------|
| Problem | "슬라이드 개선" 버튼 클릭 시 하드코딩된 프롬프트("더 임팩트 있게 개선해주세요")로만 AI 개선이 동작하여, 사용자가 원하는 방향으로 텍스트를 수정할 수 없음 |
| Solution | 개선 버튼 클릭 시 모달을 띄워 현재 슬라이드 원문을 보여주고, 사용자가 자유 프롬프트를 입력하여 AI에게 맞춤 개선 지시를 내릴 수 있도록 함 |
| Function UX Effect | 사용자가 "제목을 질문형으로 바꿔줘", "본문을 더 짧게" 등 구체적인 지시로 슬라이드를 개선할 수 있어 편집 자유도와 만족도가 크게 향상됨 |
| Core Value | AI 기반 콘텐츠 편집의 사용자 제어권 확보 — 하드코딩 프롬프트에서 사용자 주도형 프롬프트로 전환 |

---

## 1. Background & Problem

현재 `SlideActions` 컴포넌트의 "슬라이드 개선" 버튼은 `EditorPanel.handleImprove()`를 호출하며, 이 함수는 `improveSlideAction`에 고정된 instruction(`"더 임팩트 있게 개선해주세요"`)을 전달한다.

백엔드(`convex/actions/generate.ts:improveSlide`)는 이미 `instruction: v.string()` 파라미터를 받아 Gemini API에 전달하는 구조이므로, 프론트엔드에서 사용자 입력을 받아 전달하기만 하면 된다.

**현재 흐름:**
```
SlideActions [개선 버튼] → EditorPanel.handleImprove() → improveSlide({ instruction: "하드코딩" })
```

**목표 흐름:**
```
SlideActions [개선 버튼] → 모달 오픈 → 사용자 프롬프트 입력 → improveSlide({ instruction: 사용자입력 })
```

## 2. Requirements

### 2.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | "슬라이드 개선" 버튼 클릭 시 모달이 열린다 | Must |
| FR-02 | 모달에 현재 슬라이드의 원문(category, title, subtitle, body)이 읽기 전용으로 표시된다 | Must |
| FR-03 | 사용자가 텍스트 영역에 개선 지시 프롬프트를 입력할 수 있다 | Must |
| FR-04 | "개선하기" 버튼으로 AI 개선을 실행하고, 결과가 슬라이드에 반영된다 | Must |
| FR-05 | AI 처리 중 로딩 상태를 표시한다 | Must |
| FR-06 | 빠른 프롬프트 프리셋 버튼을 제공한다 (예: "더 짧게", "질문형으로", "임팩트 있게") | Should |
| FR-07 | ESC 키 또는 바깥 영역 클릭으로 모달을 닫을 수 있다 | Must |
| FR-08 | 모달 닫기 시 입력한 프롬프트가 초기화된다 | Must |

### 2.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | 모달 애니메이션은 기존 프로젝트 스타일(toast 등)과 일관성 유지 |
| NFR-02 | 모바일 반응형 지원 (모달이 화면에 맞게 조정) |
| NFR-03 | 백엔드 변경 없음 — `improveSlide` action은 이미 instruction 파라미터를 지원 |

## 3. Scope

### In Scope
- `ImproveModal` 컴포넌트 신규 생성
- `SlideActions` 컴포넌트에서 모달 열기 콜백 변경
- `EditorPanel`에서 모달 상태 관리 및 `handleImprove`에 사용자 instruction 전달
- 빠른 프롬프트 프리셋 칩 UI

### Out of Scope
- 백엔드 `improveSlide` action 수정 (이미 instruction 파라미터 지원)
- 개선 히스토리/되돌리기 기능
- 다중 슬라이드 일괄 개선

## 4. Technical Analysis

### 4.1 Affected Files

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/editor/ImproveModal.tsx` | **New** | 개선 모달 컴포넌트 |
| `src/components/editor/SlideActions.tsx` | Modify | `onImprove` → `onImproveClick` (모달 열기 트리거) |
| `src/components/editor/EditorPanel.tsx` | Modify | 모달 상태 관리, handleImprove에 instruction 파라미터 추가 |

### 4.2 Component Design

```
ImproveModal
├── 원문 표시 영역 (읽기 전용, 현재 슬라이드 content)
├── 빠른 프롬프트 프리셋 칩들
├── 프롬프트 입력 textarea
├── 하단 액션 버튼 (취소 / 개선하기)
└── 로딩 오버레이 (AI 처리 중)
```

### 4.3 Data Flow

```
1. User clicks "슬라이드 개선" → setShowImproveModal(true)
2. Modal renders with current slide content (read-only)
3. User types instruction or clicks preset chip
4. User clicks "개선하기" → handleImprove(instruction)
5. improveSlideAction({ slideId, instruction }) called
6. Result applied → updateSlideMutation({ slideId, content })
7. Modal closes on success
```

### 4.4 Props Interface

```typescript
interface ImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImprove: (instruction: string) => Promise<void>;
  content: SlideContent;
  isImproving: boolean;
}
```

## 5. Implementation Order

1. `ImproveModal.tsx` 컴포넌트 생성
2. `SlideActions.tsx` — `onImprove` prop을 모달 오픈 트리거로 변경
3. `EditorPanel.tsx` — 모달 상태 관리 + `handleImprove(instruction)` 파라미터화

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI 응답 지연 시 UX 저하 | Medium | 로딩 상태 + 모달 내 스피너로 사용자 피드백 제공 |
| 빈 프롬프트 제출 | Low | 빈 입력 시 버튼 비활성화 |
| 모달이 슬라이드 전환 중 열려있는 경우 | Low | 슬라이드 변경 시 모달 자동 닫기 |
