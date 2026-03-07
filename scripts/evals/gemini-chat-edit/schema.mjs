export const CHAT_EDIT_ALLOWED_OPERATION_TYPES = [
  "update_content",
  "update_style",
  "update_layout",
  "update_image",
  "apply_style_to_all",
  "update_text_effects",
];

export const CHAT_EDIT_ALLOWED_LAYOUT_IDS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "big-title",
  "split",
  "editorial",
];

export const CHAT_EDIT_ALLOWED_FONT_IDS = [
  "pretendard",
  "noto-sans-kr",
  "suit",
  "maru-buri",
  "nanum-myeongjo",
];

export const CHAT_EDIT_ALLOWED_FONT_FAMILIES = [
  "'Pretendard', sans-serif",
  "'Noto Sans KR', sans-serif",
  "'SUIT', sans-serif",
  "'MaruBuri', serif",
  "'Nanum Myeongjo', serif",
];

export const CHAT_EDIT_ALLOWED_SCOPE = [
  "selected_text",
  "current_slide",
  "all_slides",
];

export const CHAT_EDIT_PLAN_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Human-readable summary of the planned edits in Korean.",
    },
    scope: {
      type: "string",
      enum: CHAT_EDIT_ALLOWED_SCOPE,
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    operations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: CHAT_EDIT_ALLOWED_OPERATION_TYPES,
          },
          slideRef: {
            type: "string",
            description:
              "Use 'current', 'all', or a concrete slide ref like 'slide-2'.",
          },
          targetField: {
            type: "string",
            enum: ["category", "title", "subtitle", "body"],
          },
          layoutId: {
            type: "string",
            enum: CHAT_EDIT_ALLOWED_LAYOUT_IDS,
          },
          changes: {
            type: "object",
            properties: {
              category: { type: "string" },
              title: { type: "string" },
              subtitle: { type: "string" },
              body: { type: "string" },
              bgType: {
                type: "string",
                enum: ["solid", "gradient"],
              },
              bgColor: { type: "string" },
              gradientFrom: { type: "string" },
              gradientTo: { type: "string" },
              gradientDirection: { type: "string" },
              textColor: { type: "string" },
              accentColor: { type: "string" },
              fontFamily: {
                type: "string",
                enum: CHAT_EDIT_ALLOWED_FONT_FAMILIES,
              },
              titleSize: { type: "number" },
              subtitleSize: { type: "number" },
              bodySize: { type: "number" },
              titleLineHeight: { type: "number" },
              bodyLineHeight: { type: "number" },
              titleLetterSpacing: { type: "number" },
              bodyLetterSpacing: { type: "number" },
              opacity: { type: "number" },
              size: { type: "number" },
              fit: {
                type: "string",
                enum: ["cover", "contain", "fill", "free"],
              },
              externalUrl: { type: "string" },
              removeImage: { type: "boolean" },
              fontWeight: { type: "number" },
              italic: { type: "boolean" },
              underline: { type: "boolean" },
              uppercase: { type: "boolean" },
              shadowColor: { type: "string" },
              shadowBlur: { type: "number" },
              bgPadding: { type: "number" },
            },
          },
          reason: {
            type: "string",
            description: "Why this operation is being proposed.",
          },
        },
        required: ["type", "slideRef"],
      },
    },
  },
  required: ["summary", "scope", "operations"],
};
