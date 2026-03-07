# AI Chat Auto Edit 구현 검토 보고서

- 작성일: 2026-03-07
- 범위: `/edit/[id]` 기반 AI Chat 자동 편집 1차 구현 결과 검토
- 검토 기준: 기능 완성도, 구조 적합성, 안전성, 검증 결과, 머지 준비도

---

## 1. 결론 요약

**판정: Conditional Go (MVP 기준 진행 가능, 머지 전 소규모 정리 권장)**

이번 작업으로 AI Chat 자동 편집의 핵심 축은 모두 연결되었다.

- 백엔드: `planChatEdit` planner action 추가
- 공용 계약: AI edit plan 타입/정규화 헬퍼 분리
- 프론트: `/edit/[id]`에 AI Chat 패널, preview-first 흐름, apply 액션 연결
- UI 기반: shadcn 스타일 primitive 추가

즉, **“자연어 요청 → structured edit plan → 미리보기 → 적용”** 이라는 MVP 흐름은 성립한다.

다만 아래 항목들은 머지 전 또는 바로 다음 턴에 정리하는 편이 좋다.

1. AI Chat 패널 내부 문구/버튼이 아직 shell 단계 표현을 일부 유지
2. `chatEdit.ts` / `chatEditPreview.ts` 간 타입 중복
3. apply 단계가 원자적(batch/rollback)이지 않음
4. 서버/클라이언트 안전성 hardening 일부 미반영

---

## 2. 구현된 범위

### 2.1 백엔드

추가/변경 파일:

- `convex/actions/chatEdit.ts`
- `convex/slides.ts`

핵심 내용:

- `planChatEdit` action 추가
- scope 지원:
  - `selected_text`
  - `current_slide`
  - `all_slides`
- 모델 라우팅:
  - 기본: `gemini-3.1-flash-lite-preview`
  - fallback: `gemini-3.1-pro-preview`
  - backup: `gemini-2.5-flash`
- JSON repair 흐름 포함
- selected_text 범위 제한 및 operation whitelist 검증 포함
- `getSlidesInternal` 추가로 planner가 프로젝트 슬라이드 컨텍스트 수집 가능

### 2.2 공용 계약 / 렌더 헬퍼

추가 파일:

- `src/lib/chatEdit.ts`
- `src/lib/chatEditPreview.ts`

핵심 내용:

- AI edit plan 관련 enum / type / metadata 분리
- 문자열 sanitize
- operation normalization
- UI render model 생성 헬퍼
- preview 결과 생성(`buildChatEditPreviewResult`)

### 2.3 프론트 편집 화면

추가/변경 파일:

- `src/components/editor/AIChatPanel.tsx`
- `src/app/(app)/edit/[id]/page.tsx`

핵심 내용:

- `/edit/[id]` 상단에 AI Chat 토글 추가
- 데스크톱 우측 패널 + 모바일 바텀시트 지원
- scope 선택 UI
- quick prompts
- chat thread UI
- planner action 호출 연결
- pending plan preview 상태 관리
- apply / cancel / retry 연결
- preview 중 현재 슬라이드 렌더 반영

### 2.4 UI primitive

추가 파일:

- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/textarea.tsx`

의미:

- 이번 AI Chat UI에 필요한 공통 UI building block 확보

---

## 3. 변경 파일 목록

기능 관련 핵심 파일 기준:

- `convex/actions/chatEdit.ts`
- `convex/slides.ts`
- `src/lib/chatEdit.ts`
- `src/lib/chatEditPreview.ts`
- `src/components/editor/AIChatPanel.tsx`
- `src/app/(app)/edit/[id]/page.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/textarea.tsx`

보조 변경:

- `convex/_generated/api.d.ts`

---

## 4. 검증 결과

이번 통합 상태 기준 재검증 결과:

- `npm run typecheck` ✅
- `npm run build` ✅
- 변경 파일 대상 eslint ✅
  - `src/app/(app)/edit/[id]/page.tsx`
  - `src/components/editor/AIChatPanel.tsx`
  - `src/lib/chatEdit.ts`
  - `src/lib/chatEditPreview.ts`
  - `convex/actions/chatEdit.ts`
  - `convex/slides.ts`
  - 신규 `src/components/ui/*`
- `npm run lint` ❌
  - 실패 원인은 **기존 저장소 baseline 이슈**
  - 주요 대상:
    - `convex/actions/collect.ts`
    - `convex/actions/generate.ts`
    - `src/app/api/auth/route.ts`
    - `src/components/editor/ImproveModal.tsx`

추가 참고:

- 팀 실행 중 planner eval 8/8 통과 보고 존재
- `npm test` 스크립트는 없음

---

## 5. 잘된 점

### 5.1 구조 방향이 맞다

이번 구현은 처음 합의한 구조와 일치한다.

**AI Chat → structured plan → preview → user confirm → existing mutations apply**

즉, AI가 곧바로 DB를 직접 바꾸지 않고, 기존 편집 mutation 체계를 재사용한다는 점이 좋다.

### 5.2 `/edit/[id]`에 붙인 판단이 적절하다

현재 편집 페이지는 이미 다음 상태를 모두 가지고 있다.

- local content/style/image state
- autosave mutation
- selection / editing context
- current slide index

따라서 AI Chat 기능을 가장 적은 변경으로 붙이기 좋은 지점이다.

### 5.3 preview-first 경험이 실제로 구현되었다

단순 채팅 UI가 아니라:

- plan 생성
- preview 상태 저장
- 상단 preview bar
- 적용 / 취소 / 다시 제안

까지 이어져서 MVP 체감이 있다.

### 5.4 공용 계약 추출은 좋은 방향이다

`src/lib/chatEdit.ts`를 만든 것은 맞는 방향이다.

- 백엔드 planner와 프론트 렌더 요구사항을 맞추기 쉬워짐
- scope / operation / metadata 규약을 코드로 고정함

---

## 6. 주요 이슈 및 리스크

### 6.1 UI 문구/상태 불일치

상태: **중간**

`AIChatPanel.tsx`에는 아직 아래 요소가 남아 있다.

- `Shell` badge
- “다음 단계에서 … 연결됩니다” 계열 문구
- 패널 하단의 disabled `적용 / 취소 / 다시 제안받기` 버튼

하지만 실제 페이지 상단 preview bar에서는 이미:

- 취소
- 다시 제안
- 미리보기 적용

이 동작한다.

즉, **실제 기능 상태와 패널 내부 카피가 어긋난다.**

권장:

- panel 내부 copy를 실제 상태에 맞게 수정
- 중복되는 disabled footer action 제거 또는 실제 action 연결

### 6.2 타입/계약 중복

상태: **중간**

`src/lib/chatEdit.ts`와 `src/lib/chatEditPreview.ts`에 유사한 타입이 중복돼 있다.

예:

- `ChatEditScope`
- `ChatEditOperation`
- `ChatEditPlan`
- `ChatEditOperationChanges`

현재는 문제 없이 동작할 수 있으나, 이후 operation schema가 바뀌면 **drift 위험**이 크다.

권장:

- `chatEditPreview.ts`는 `chatEdit.ts`의 타입을 import해서 사용
- preview 전용 타입만 별도 유지

### 6.3 apply가 원자적이지 않다

상태: **중간~높음**

`page.tsx`의 apply 로직은 슬라이드별 mutation을 순차 호출한다.

의미:

- 중간 실패 시 일부 슬라이드만 적용될 수 있음
- rollback이 없음

MVP에서는 허용 가능하지만, “전체 슬라이드 적용”이 많아지면 리스크가 커진다.

권장:

- Phase 2에서 batch apply mutation 또는 action 도입
- 최소한 실패 slide 정보를 사용자에게 명시

### 6.4 안전성 hardening 미완료

상태: **중간**

팀 검토에서 제안된 아래 보강은 아직 코드상 핵심적으로 반영되지 않았다.

- instruction length 제한
- rate/abuse guard
- 색상/그라데이션 방향 whitelist 강화
- image URL whitelist/validation
- numeric field clamp
- operation count cap / dedupe

현재 planner validation은 이전보다 훨씬 좋아졌지만, **production hardening은 아직 1차 수준**이다.

### 6.5 공용 헬퍼 일부 미사용

상태: **낮음**

`src/lib/chatEdit.ts`의 아래 함수들은 현재 사용 흔적이 없다.

- `normalizeChatEditPlanResponse`
- `buildChatEditPlanRenderModel`

가능성:

- 이후 UI 상세 렌더링용으로 의도된 선행 작업
- 또는 현재는 dead-ish code

권장:

- 바로 쓸 계획이면 panel에 연결
- 아니면 TODO 주석 또는 다음 단계로 명시

### 6.6 Convex action이 `src/lib`를 직접 참조

상태: **낮음~중간**

`convex/actions/chatEdit.ts`가 `../../src/lib/chatEdit`를 import한다.

build/typecheck는 통과했으므로 즉시 문제는 없지만, 구조적으로는
**서버 action이 프론트 소스 경로에 의존**하는 모양이다.

권장:

- 장기적으로는 공용 계약을 `shared/` 또는 `src/shared/` 계층으로 분리

---

## 7. 머지 준비도 평가

### 바로 머지 가능한 항목

- planner action 자체
- preview-first 흐름의 큰 방향
- AI Chat 패널 진입점
- 공용 UI primitives

### 머지 전 권장 정리 항목

1. `AIChatPanel.tsx` 카피/버튼 상태 정리
2. `chatEdit.ts` / `chatEditPreview.ts` 타입 중복 축소
3. 최소한의 safety hardening TODO 정리
4. apply failure UX 보강 또는 제한 사항 명시

---

## 8. 최종 의견

이번 팀 결과는 **기능 데모 수준이 아니라 실제 MVP로 진입 가능한 수준**이다.

특히 좋은 점은:

- 백엔드 planner가 독립적으로 성립했고
- 프론트가 preview-first로 연결됐으며
- 기존 editor mutation 체계와 충돌 없이 녹아들었다는 것이다.

다만 현재 상태는 **“기능적으로는 됨” + “프로덕션 polish가 조금 더 필요함”** 에 가깝다.

따라서 최종 권장안은 다음과 같다.

### 권장안

- **제품 개발 진행:** Go
- **즉시 main 머지:** Conditional Go
  - 아래 3개 정리 후 머지 권장
    1. panel shell 카피 제거
    2. 타입 중복 정리
    3. safety hardening TODO 반영 또는 명시

---

## 9. 한줄 요약

**AI Chat 자동 편집 MVP는 실제로 작동 가능한 수준까지 올라왔고, 지금 필요한 것은 대규모 재설계가 아니라 작은 정리와 안전성 보강이다.**
