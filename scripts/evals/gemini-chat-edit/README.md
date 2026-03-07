# Gemini Chat Edit Eval Harness

동일 프롬프트/동일 schema 기준으로 여러 Gemini 모델의 AI Chat 편집 계획 품질을 비교하기 위한 평가 하네스입니다.

## Compared Models (default)

- `gemini-2.5-flash-lite`
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `gemini-3.1-flash-lite-preview`
- `gemini-3-flash-preview`
- `gemini-3.1-pro-preview`

> 2026-03-07 기준 공식 문서 확인:
> - Models: <https://ai.google.dev/gemini-api/docs/models>
> - Structured outputs: <https://ai.google.dev/gemini-api/docs/structured-output>
> - Thinking: <https://ai.google.dev/gemini-api/docs/thinking>

## What it tests

- 동일 system instruction
- 동일 structured JSON schema
- 동일 카드뉴스 편집 context
- 동일 자연어 instruction 세트

평가 지표:
- scope 일치
- required operation type 포함 여부
- 금지 operation 사용 여부
- catalog(layout/font) 준수
- 예상 field 터치 여부
- latency

## Run

```bash
node --env-file=.env.local scripts/evals/gemini-chat-edit/run.mjs
```

옵션:

```bash
node --env-file=.env.local scripts/evals/gemini-chat-edit/run.mjs --max-cases=4
node --env-file=.env.local scripts/evals/gemini-chat-edit/run.mjs --models=gemini-2.5-flash,gemini-2.5-pro
node --env-file=.env.local scripts/evals/gemini-chat-edit/run.mjs --output-dir=.evals/gemini-chat-edit
```

## Output

`.evals/gemini-chat-edit/` 아래에 아래 파일이 생성됩니다.

- raw JSON report
- markdown summary report

## Prompt Engineering Principles in this harness

1. JSON 외 응답 금지
2. catalog 밖의 값 생성 금지
3. 최소 수정 원칙
4. scope 위반 금지
5. selected text 요청은 우선 해당 field만 수정
6. 모호한 요청은 warning + 최소 수정

## Note

이 하네스는 “프로덕션 모델 최종 선정”을 위한 1차 비교 도구입니다.
최종 적용 전에는 실제 UI trace(선택 상태, 로컬 preview, apply 성공률)까지 포함한 2차 eval이 필요합니다.
