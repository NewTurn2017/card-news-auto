# Analysis: AI Chat Auto Edit Gemini Model Comparison

> Feature Reference:
> - `docs/01-plan/features/ai-chat-auto-edit.plan.md`
> - `docs/02-design/features/ai-chat-auto-edit.design.md`
>
> Analysis Date: 2026-03-07
> Latest Eval Report:
> - `.evals/gemini-chat-edit/gemini-chat-edit-comparison-2026-03-07T11-02-36.080Z.json`
> - `.evals/gemini-chat-edit/gemini-chat-edit-comparison-2026-03-07T11-02-36.080Z.md`

---

## Summary

동일한 8개 편집 케이스를 기준으로,

- **prompt v2**
- **structured JSON schema**
- **invalid JSON recovery layer**
- **동일 카드뉴스 context**

를 사용해 Gemini 모델을 재비교했다.

### Overall Winner
- **기본 모델 1순위:** `gemini-3.1-flash-lite-preview`

### Best Stable Backup
- **stable 계열 1순위:** `gemini-2.5-flash`

### Best Quality Oracle
- **고난도 fallback / oracle:** `gemini-3.1-pro-preview`

### Avoid for Default
- `gemini-2.5-pro`
- `gemini-2.5-flash-lite`

---

## What changed from v1

이번 v2에서는 다음을 추가했다.

1. **selected_text prompt 강화**
   - “더 읽기 쉽게”, “다듬어”, “짧게”, “강하게” 같은 요청은
     `update_content`를 반드시 포함하도록 유도

2. **JSON recovery layer**
   - direct parse 실패 시:
     - fence/object extraction
     - trailing comma 제거
     - 그래도 실패하면 같은 모델에 JSON repair 재요청

3. **scope 규칙 강화**
   - `current_slide`는 `current`
   - `all_slides`는 `all` / `apply_style_to_all`

---

## Result Table (Prompt v2 + Recovery)

| Model | Pass | Repaired | Avg Score | Avg Latency (ms) | Verdict |
|------|------:|---------:|----------:|-----------------:|---------|
| `gemini-3.1-flash-lite-preview` | 8/8 | 0 | 100 | 2,025 | **추천 1순위** |
| `gemini-2.5-flash` | 8/8 | 1 | 100 | 4,819 | **stable 백업 1순위** |
| `gemini-3-flash-preview` | 8/8 | 0 | 100 | 8,900 | 느리지만 품질 통과 |
| `gemini-3.1-pro-preview` | 8/8 | 0 | 100 | 9,260 | **oracle / fallback** |
| `gemini-2.5-pro` | 6/8 | 1 | 75 | 9,982 | default 부적합 |
| `gemini-2.5-flash-lite` | 7/8 | 0 | 91 | 1,473 | 빠르지만 scope 안정성 부족 |

---

## Main Findings

### 1) `gemini-3.1-flash-lite-preview`
강점:
- 8/8 통과
- 평균 2.0초대
- repair layer 없이도 안정적
- selected_text 개선 케이스도 정상 통과

판단:
- 현재 편집기용 AI Chat 기본 모델로 가장 적합

### 2) `gemini-2.5-flash`
강점:
- 8/8 통과
- stable 계열
- repair layer 1회로 전체 통과

약점:
- 3.1 Flash-Lite Preview보다 느림

판단:
- preview 회피가 필요할 때 가장 현실적인 백업 모델

### 3) `gemini-3.1-pro-preview`
강점:
- 8/8 통과
- repair 불필요
- 품질 안정적

약점:
- 약 9.3초 평균

판단:
- 기본 모델로는 무겁고, 고난도 요청 fallback으로 적합

### 4) `gemini-3-flash-preview`
v1에서는 JSON 안정성 이슈가 있었지만,
v2 프롬프트에서는 8/8 통과했다.

약점:
- 평균 8.9초로 느림

판단:
- 가능은 하지만 3.1 Flash-Lite Preview 대비 메리트가 적음

### 5) `gemini-2.5-pro`
문제:
- 2건 timeout/abort
- 평균 지연이 김

판단:
- “상위 reasoning 모델”이라고 해서 이 use case에 자동으로 더 낫지 않음
- 현재 chat planning 작업에는 과한 편

### 6) `gemini-2.5-flash-lite`
강점:
- 가장 빠른 축

문제:
- 모호한 요청에서 `current_slide` 대신 `all_slides`로 과확장

판단:
- classification/초경량 라우팅에는 적합할 수 있으나, 기본 planner로는 덜 안전

---

## Failure Analysis

### `gemini-2.5-flash-lite`
실패 케이스:
- `minimal-safe-ambiguous`

실패 내용:
- 기대 scope: `current_slide`
- 실제 scope: `all_slides`

의미:
- 모호한 요청에서 안전한 최소 수정 대신 과도한 전체 수정으로 확장될 수 있음

### `gemini-2.5-pro`
실패 케이스:
- `luxury-minimal-current`
- `all-slides-luxury-theme`

실패 내용:
- abort / timeout

의미:
- 현재 timeout budget과 editor use case 기준에서 responsiveness가 떨어짐

---

## Practical Recommendation

### Production Routing

#### Default
- `gemini-3.1-flash-lite-preview`

#### Fallback for hard / broad requests
- `gemini-3.1-pro-preview`

#### Stable backup
- `gemini-2.5-flash`

### Suggested escalation rules
- `all_slides` + 추상적인 브랜딩 지시
- 1차 모델 JSON parse 실패
- 1차 모델이 warning을 2개 이상 반환
- 대규모 rewrite / complex multi-op plan

---

## Product Readiness

현재 기준으로는 다음이 준비되었다.

- 동일 프롬프트 비교 하네스
- prompt v2
- JSON repair layer
- 8개 representative cases
- 모델별 latency / quality 비교 리포트

즉, **이제 실제 제품 코드에 모델 라우팅을 넣어도 될 수준의 사전 비교는 끝난 상태**다.

---

## Next Recommended Build Step

다음 구현 순서는 아래가 가장 좋다.

1. `planChatEdit` action 생성
2. 기본 모델을 `gemini-3.1-flash-lite-preview`로 설정
3. repair layer / fallback routing 포함
4. `/edit/[id]` AI Chat drawer UI 연결
5. preview-first apply 구현

---

## Final Decision

최종 권장안:

- **기본 모델:** `gemini-3.1-flash-lite-preview`
- **고난도 fallback:** `gemini-3.1-pro-preview`
- **stable backup:** `gemini-2.5-flash`

즉, 지금은 높은 모델을 기본으로 두는 것이 아니라,
**빠르고 안정적인 3.1 Flash-Lite Preview를 기본으로 두고, 3.1 Pro Preview를 승격 경로로 사용하는 설계**가 가장 합리적이다.
