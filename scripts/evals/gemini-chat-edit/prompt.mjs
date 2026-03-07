import {
  CHAT_EDIT_ALLOWED_FONT_IDS,
  CHAT_EDIT_ALLOWED_LAYOUT_IDS,
} from "./schema.mjs";

export const MODEL_DOCS = {
  "gemini-2.5-flash-lite":
    "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite",
  "gemini-2.5-flash":
    "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash",
  "gemini-2.5-pro":
    "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro",
  "gemini-3.1-flash-lite-preview":
    "https://ai.google.dev/gemini-api/docs/models",
  "gemini-3-flash-preview":
    "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
  "gemini-3.1-pro-preview":
    "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
};

export const DEFAULT_MODEL_IDS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
];

export const PROMPT_VERSION = "v2";

export const SYSTEM_INSTRUCTION = `너는 카드뉴스 편집기용 AI Chat planner다.
역할은 자연어 편집 요청을 "안전한 편집 계획 JSON"으로 변환하는 것이다.

반드시 지켜야 할 규칙:
1. JSON 외의 텍스트를 출력하지 마라.
2. 사용 가능한 레이아웃과 폰트 catalog 밖의 값을 만들지 마라.
3. 요청과 무관한 필드는 수정하지 마라.
4. title을 빈 문자열로 만들지 마라.
5. scope가 current_slide면 전체 슬라이드 변경을 하지 마라.
6. scope가 selected_text면 우선 해당 field와 직접 연관된 수정만 제안하라.
7. 요청이 모호하면 warnings에 짧게 설명하고, 최소 수정 전략을 사용하라.
8. 비주얼 통일 요청은 가능하면 apply_style_to_all 또는 style 중심 변경을 우선하라.
9. 본문/카피 전체 재작성은 사용자가 명시적으로 요청한 경우에만 하라.
10. selected_text scope 에서 사용자가 "다듬어", "더 읽기 쉽게", "더 짧게", "더 임팩트 있게", "쉽게 풀어", "강하게" 같은 표현을 쓰면, 특별한 반대 지시가 없는 한 최소 1개의 update_content 를 반드시 포함하라.
11. selected_text scope 에서 가독성 요청이 있으면 update_content 와 update_style 를 함께 고려하되, 변경은 선택된 field 에만 국한하라.
12. current_slide scope 에서는 slideRef 로 "current" 를 우선 사용하고, all_slides scope 에서는 "all" 또는 apply_style_to_all 을 우선 사용하라.
13. image 제거 요청은 update_image + removeImage=true 로 표현하라.
14. 결과는 "적용 가능한 edit plan"이어야 하며, 장식적인 설명은 넣지 마라.`;

export const REPAIR_SYSTEM_INSTRUCTION = `너는 JSON repair assistant다.
입력으로 깨진 JSON 또는 거의 맞는 JSON이 들어온다.
반드시 유효한 JSON 객체만 반환하라.
마크다운 코드펜스, 설명문, 주석, 사족을 절대 추가하지 마라.
의미는 최대한 보존하고 문법만 고쳐라.
필드가 누락되면 임의로 과도한 새 내용을 만들지 마라.
반드시 주어진 schema에 맞는 JSON을 반환하라.`;

function buildCatalogSection() {
  return {
    layoutIds: CHAT_EDIT_ALLOWED_LAYOUT_IDS,
    fontIds: CHAT_EDIT_ALLOWED_FONT_IDS,
    notes: {
      stylePresets: [
        "dark",
        "light",
        "navy",
        "cream",
        "sunset",
        "ocean",
        "forest",
        "midnight",
      ],
      bgType: ["solid", "gradient"],
      imageFit: ["cover", "contain", "fill", "free"],
      textFields: ["category", "title", "subtitle", "body"],
    },
  };
}

export function buildPromptPayload(testCase) {
  return {
    promptVersion: PROMPT_VERSION,
    task: "Plan AI chat edits for a card-news editor.",
    instruction: testCase.instruction,
    scope: testCase.scope,
    selectedField: testCase.selectedField,
    catalog: buildCatalogSection(),
    currentProject: testCase.projectContext,
    policy: {
      scopeRules: {
        selected_text:
          "선택된 field와 직접 관련된 수정만 하라. 사용자가 문구 개선을 요청하면 update_content를 반드시 포함하라.",
        current_slide:
          "현재 슬라이드만 수정하라. slideRef는 가능하면 current를 사용하라.",
        all_slides:
          "전체 시각 톤/스타일 통일을 우선하라. 가능하면 apply_style_to_all을 사용하라.",
      },
      contentRules: [
        "제목은 빈 문자열 금지",
        "요청 없는 전체 재작성 금지",
        "최소 수정 원칙",
      ],
      outputRules: [
        "JSON only",
        "schema compliant",
        "no markdown fences",
      ],
    },
    expectationsHint: {
      minimalChange: true,
      keepUnchangedFieldsUntouched: true,
      respondInKorean: true,
      selectedTextRequestsPreferContentRewrite:
        testCase.scope === "selected_text",
    },
  };
}
