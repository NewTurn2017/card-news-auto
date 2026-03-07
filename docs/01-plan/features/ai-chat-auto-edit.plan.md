# Plan Plus: AI Chat Auto Edit - 자연어 기반 카드뉴스 편집 MVP

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 카드뉴스 초안은 빠르게 생성되지만, 사용자가 “더 미니멀하게”, “2번 슬라이드 강조색 바꿔”, “전체 톤을 럭셔리하게” 같은 수정 요청을 하려면 여러 패널을 오가며 수동 편집해야 함 |
| **Solution** | `/edit/[id]` 화면에 AI Chat 편집 패널을 추가해 자연어 요청을 구조화된 편집 명령으로 변환하고, 미리보기 후 승인하면 기존 편집 mutation으로 반영 |
| **Function UX Effect** | 사용자는 디자인 툴 조작 대신 대화형으로 카피/스타일/레이아웃/이미지 수정을 빠르게 반복 가능 |
| **Core Value** | “AI 생성” 이후의 마지막 편집 단계를 대폭 단축하면서도, 직접 확인 후 적용하는 안전한 편집 경험 제공 |

| Item | Detail |
|------|--------|
| Feature | AI Chat Auto Edit |
| Plan Date | 2026-03-07 |
| Target Duration | 2 phases (MVP 3~4일, Phase 2 3~5일) |
| Target Route | `/edit/[id]` |
| Match Rate | N/A (Initial Plan) |

---

## 1. User Intent Discovery

### Core Problem
AI 카드뉴스 생성 이후, 미세한 카피 수정과 비주얼 조정이 다시 “수동 UI 조작”으로 돌아가면서 속도가 떨어진다.

### Target Users
1. 카드뉴스를 빠르게 제작하는 1인 크리에이터
2. 디자인 감각은 필요하지만 모든 세부 컨트롤을 직접 만지고 싶지는 않은 사용자
3. AI 초안을 만든 뒤, 마지막 손질을 더 빠르게 끝내고 싶은 사용자

### Success Criteria
1. 사용자가 편집 화면에서 자연어로 수정 요청을 보낼 수 있다.
2. AI가 자유 텍스트가 아니라 **구조화된 편집 제안**을 반환한다.
3. 사용자는 적용 전 **preview / diff / scope**를 확인할 수 있다.
4. 기존 edit 화면의 스타일/레이아웃/이미지/카피 편집 로직을 최대한 재사용한다.
5. MVP 기준으로 현재 슬라이드 중심 편집이 안정적으로 동작한다.

### Constraints
- 기존 Convex slide mutation 체계를 최대한 재사용해야 한다.
- AI가 직접 DB를 patch하는 구조는 피하고, 프론트에서 검증/미리보기 후 commit 해야 한다.
- 레이아웃/프리셋/폰트는 자유 생성보다 기존 catalog 기반이 우선이다.
- 현 저장소는 lint baseline 오류와 test script 부재가 있으므로, 구현 시 검증 계획을 별도로 둬야 한다.

---

## 2. Alternatives Explored

### Approach A: Create 단계에 AI Chat 추가
- **Pros**: 생성 직후 곧바로 AI 대화를 유도 가능
- **Cons**: 실제 편집 상태(localContent, localStyle, localImage, selection, autosave)는 `/edit/[id]`에 모여 있음
- **Verdict**: 비선호

### Approach B: Edit 화면에서 자유형 채팅 → 즉시 DB 반영
- **Pros**: 구현 단순
- **Cons**: 오작동 시 되돌리기 어렵고, 추상 명령 해석 오류가 바로 저장됨
- **Verdict**: 위험함

### Approach C: Edit 화면에서 Review-First Chat Drawer + Structured Patch (Selected)
- **Pros**: 기존 편집 모델과 잘 맞고, 사용자가 적용 전 확인 가능
- **Cons**: preview/apply 계층을 추가로 설계해야 함
- **Verdict**: 선택

---

## 3. YAGNI Review

### MVP Included (In Scope)
| Area | Feature | Priority |
|------|---------|----------|
| Entry | `/edit/[id]` 우측 AI Chat drawer | P0 |
| Scope | 현재 슬라이드 / 전체 슬라이드 scope 선택 | P0 |
| Prompt UX | 빠른 프롬프트 chips + 자유 입력 | P1 |
| AI Output | 구조화된 `edit operations` JSON | P0 |
| Preview | 적용 전 변경 요약 카드 | P0 |
| Apply | 기존 slide mutation 재사용하여 commit | P0 |
| Copy | 제목/부제/본문 개선 | P0 |
| Style | 색상, 폰트, 텍스트 강조, 배경 톤 수정 | P0 |
| Layout | 레이아웃 변경 | P0 |
| Image | 이미지 교체 제안/삭제/opacity 변경 | P1 |
| Safety | catalog 제한 + invalid op 무시 | P0 |

### Deferred (Out of Scope for MVP)
| Feature | Reason |
|---------|--------|
| 멀티턴 영구 chat history | 초기 구현 복잡도 상승 |
| Undo/Redo 완전 지원 | edit history 설계 필요 |
| 배치 diff UI (슬라이드별 side-by-side) | UI 범위 큼 |
| 자연어 명령 재작성/자동 추론 고도화 | 우선은 catalog 기반 안정성 |
| 전체 프로젝트 브랜딩 룰 저장 | Phase 2 이후 |
| 음성 입력 | 비핵심 |

---

## 4. Core UX Proposal

### Primary Entry
- 위치: `src/app/(app)/edit/[id]/page.tsx`
- 형태: 우측 고정 drawer 또는 editor panel 하단 섹션
- 권장안: **우측 drawer**
  - 기존 편집 패널과 충돌이 적음
  - “대화형 보조 도구”라는 정체성이 분명함
  - 모바일에서는 bottom sheet로 변환 가능

### User Flow
1. 사용자가 편집 화면에서 슬라이드 선택
2. AI Chat drawer 열기
3. scope 선택:
   - 현재 슬라이드
   - 선택 텍스트
   - 전체 슬라이드
4. 프롬프트 입력:
   - 예: “제목 더 강렬하게”
   - 예: “전체 톤을 더 럭셔리하고 미니멀하게”
5. AI가 구조화된 편집 제안 반환
6. UI가 변경 요약 + preview를 표시
7. 사용자가 `적용` 또는 `취소`
8. 적용 시 기존 mutation 호출

### Prompt Examples
- “이 슬라이드 제목을 더 짧고 임팩트 있게 바꿔줘”
- “전체 카드뉴스를 어두운 럭셔리 톤으로 맞춰줘”
- “2번 슬라이드 레이아웃을 중앙 정렬로 바꿔줘”
- “본문은 더 읽기 쉽게 줄 간격을 넓혀줘”
- “배경 이미지를 제거하고 텍스트 중심으로 정리해줘”

---

## 5. Architecture Overview

### Existing Pieces to Reuse
| Concern | Existing Asset |
|--------|----------------|
| 카피 개선 | `convex/actions/generate.ts` → `improveSlide` |
| 텍스트 저장 | `convex/slides.ts` → `updateSlide` |
| 스타일 저장 | `updateSlideStyle` |
| 레이아웃 저장 | `updateSlideLayout` |
| 이미지 저장 | `updateSlideImage` |
| 오버레이 저장 | `updateSlideOverlays`, `applyOverlaysToAll` |
| 전체 스타일 일괄 적용 | `applyStyleToAll` |
| 스타일/텍스트 파라미터 기준 | `InlineToolbox`, `CardSlideRenderer`, `src/data/layouts.ts`, `src/data/presets.ts`, `src/data/fonts.ts` |
| 현재 AI 단발 UX | `ImproveModal` |

### New Pieces Needed
1. `AIChatPanel` component
2. `chat edit planner` action
3. client-side `pending operations` preview state
4. operation validator / normalizer
5. optional batch apply action for multi-slide edits

### Recommended Request/Apply Pipeline
```text
User Prompt
  -> AI Planning Action
  -> structured edit operations JSON
  -> client validation + normalization
  -> local preview
  -> user confirmation
  -> existing mutation(s) commit
```

---

## 6. Structured Edit Model

### Why Structured Operations
- 자유형 응답은 예측 불가
- 현재 코드는 이미 명확한 state shape를 가짐
- catalog 기반 제한이 디자인 일관성에 유리

### Proposed Operation Categories
- `update_content`
- `update_style`
- `update_layout`
- `update_image`
- `update_text_effects`
- `apply_style_to_all`

### Example Shape
```json
{
  "scope": "current_slide",
  "operations": [
    {
      "type": "update_content",
      "slideRef": "current",
      "changes": {
        "title": "AI가 바꾸는 콘텐츠 제작 속도"
      }
    },
    {
      "type": "update_style",
      "slideRef": "current",
      "changes": {
        "bgType": "gradient",
        "gradientFrom": "#0f0c29",
        "gradientTo": "#302b63",
        "accentColor": "#4ae3c0"
      }
    }
  ],
  "summary": "현재 슬라이드 제목을 더 임팩트 있게 바꾸고, 전체 톤을 다크 럭셔리 무드로 조정합니다."
}
```

---

## 7. Rollout Plan

### Phase 1 — MVP
- AI Chat drawer UI
- 현재 슬라이드 / 전체 슬라이드 scope
- content/style/layout/image 일부 수정
- preview-first apply
- invalid operation guard

### Phase 2 — Safety & Convenience
- batch apply action
- undo snapshot
- chat history persistence
- diff view 개선

### Phase 3 — Smart Design System
- 브랜드 가이드/톤 저장
- 사용자별 선호 스타일 학습
- “캠페인 톤 유지” 같은 상위 지시 지원

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 추상 명령 해석 오류 | 엉뚱한 디자인 반영 | catalog 제한 + summary preview |
| 직접 저장으로 인한 사고 | 되돌리기 어려움 | apply 전 검토 강제 |
| 다중 mutation 부분 실패 | 상태 불일치 | batch apply layer 또는 staged commit |
| 전체 슬라이드 대량 수정 | 예측 어려움 | MVP는 current slide 중심으로 시작 |
| chat history 부재 | 대화 연속성 부족 | Phase 2에서 persistence 추가 |

---

## 9. Acceptance Checklist

- [ ] edit 화면에서 AI Chat 패널을 열 수 있다
- [ ] 현재 슬라이드 기준 자연어 편집 요청이 가능하다
- [ ] AI 응답은 구조화된 operations로 제한된다
- [ ] 적용 전 preview/summary가 보인다
- [ ] 승인 시 기존 Convex mutation으로 정상 저장된다
- [ ] 잘못된 operation은 무시되거나 사용자에게 경고된다
- [ ] 전체 슬라이드 스타일 적용이 최소 1개 시나리오에서 동작한다

---

## 10. Recommendation

가장 안전하고 현실적인 구현 방향은:

**`/edit` 진입 + AI Chat drawer + structured patch + review-first apply + 기존 mutation 재사용`**

이 구조는 현재 프로젝트의 편집 UX와 가장 잘 맞고, MVP에서 “보이는 AI chat 기능”을 빠르게 추가하면서도 사고 가능성을 낮춘다.
