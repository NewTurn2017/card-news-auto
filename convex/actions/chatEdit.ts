"use node";

import { GoogleGenAI } from "@google/genai";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, type ActionCtx } from "../_generated/server";
import { decrypt } from "../lib/crypto";
import {
  CHAT_EDIT_ALLOWED_BG_TYPES,
  CHAT_EDIT_ALLOWED_FONT_FAMILIES,
  CHAT_EDIT_ALLOWED_FONT_IDS,
  CHAT_EDIT_ALLOWED_IMAGE_FITS,
  CHAT_EDIT_ALLOWED_LAYOUT_IDS,
  CHAT_EDIT_ALLOWED_TEXT_ALIGNMENTS,
  CHAT_EDIT_CONTENT_CHANGE_KEYS,
  CHAT_EDIT_FIELD_STYLE_CHANGE_KEYS,
  CHAT_EDIT_IMAGE_CHANGE_KEYS,
  CHAT_EDIT_MAX_OPERATIONS,
  CHAT_EDIT_OPERATION_TYPES,
  CHAT_EDIT_SCOPES,
  CHAT_EDIT_SLIDE_STYLE_CHANGE_KEYS,
  CHAT_EDIT_TARGET_FIELDS,
  CHAT_EDIT_TEXT_EFFECT_CHANGE_KEYS,
  sanitizeChatEditText,
  type ChatEditOperation,
  type ChatEditOperationChanges,
  type ChatEditOperationType,
  type ChatEditPlan,
  type ChatEditPlanResponse,
  type ChatEditScope,
  type ChatEditTargetField,
} from "../../src/lib/chatEdit";

const PROMPT_VERSION = "v3";
const MODEL_PRIMARY = "gemini-3.1-flash-lite-preview";
const MODEL_FALLBACK = "gemini-3.1-pro-preview";
const MODEL_BACKUP = "gemini-2.5-flash";
const MODEL_SEQUENCE = [MODEL_PRIMARY, MODEL_FALLBACK, MODEL_BACKUP] as const;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_INSTRUCTION_LENGTH = 600;

interface JsonParseResult {
  parsed: unknown | null;
  parseStrategy: string;
  attempts: string[];
}

interface ProjectSlideContext {
  slideRef: string;
  type: Doc<"slides">["type"];
  layoutId: string;
  content: Doc<"slides">["content"];
  style: {
    bgType: Doc<"slides">["style"]["bgType"];
    bgColor: string;
    gradientFrom?: string;
    gradientTo?: string;
    gradientDirection?: string;
    textColor: string;
    accentColor: string;
    fontFamily: string;
    categoryAlignment?: "left" | "center" | "right";
    titleAlignment?: "left" | "center" | "right";
    subtitleAlignment?: "left" | "center" | "right";
    bodyAlignment?: "left" | "center" | "right";
    titleSize?: number;
    subtitleSize?: number;
    bodySize?: number;
    titleLineHeight?: number;
    subtitleLineHeight?: number;
    bodyLineHeight?: number;
    titleLetterSpacing?: number;
    subtitleLetterSpacing?: number;
    bodyLetterSpacing?: number;
  };
  image: {
    externalUrl?: string;
    opacity: number;
    size: number;
    fit: "cover" | "contain" | "fill" | "free";
  } | null;
}

interface ProjectPromptContext {
  projectId: Id<"projects">;
  projectTitle: string;
  currentSlideRef: string;
  slides: ProjectSlideContext[];
}

interface PlanRequestContext {
  instruction: string;
  scope: ChatEditScope;
  selectedField?: ChatEditTargetField;
  currentSlideRef: string;
  project: ProjectPromptContext;
  selectedValue?: string;
}

const CHAT_EDIT_PLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    summary: {
      type: "string" as const,
      description: "Human-readable summary of the planned edits in Korean.",
    },
    scope: {
      type: "string" as const,
      enum: CHAT_EDIT_SCOPES,
    },
    warnings: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    operations: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: CHAT_EDIT_OPERATION_TYPES,
          },
          slideRef: {
            type: "string" as const,
            description:
              "Use 'current', 'all', or a concrete slide ref like 'slide-2'.",
          },
          targetField: {
            type: "string" as const,
            enum: CHAT_EDIT_TARGET_FIELDS,
          },
          layoutId: {
            type: "string" as const,
            enum: CHAT_EDIT_ALLOWED_LAYOUT_IDS,
          },
          changes: {
            type: "object" as const,
            properties: {
              category: { type: "string" as const },
              title: { type: "string" as const },
              subtitle: { type: "string" as const },
              body: { type: "string" as const },
              bgType: {
                type: "string" as const,
                enum: CHAT_EDIT_ALLOWED_BG_TYPES,
              },
              bgColor: { type: "string" as const },
              gradientFrom: { type: "string" as const },
              gradientTo: { type: "string" as const },
              gradientDirection: { type: "string" as const },
              textColor: { type: "string" as const },
              accentColor: { type: "string" as const },
              fontFamily: {
                type: "string" as const,
                enum: CHAT_EDIT_ALLOWED_FONT_FAMILIES,
              },
              categorySize: { type: "number" as const },
              titleSize: { type: "number" as const },
              subtitleSize: { type: "number" as const },
              bodySize: { type: "number" as const },
              categoryColor: { type: "string" as const },
              titleColor: { type: "string" as const },
              subtitleColor: { type: "string" as const },
              bodyColor: { type: "string" as const },
              categoryAlignment: {
                type: "string" as const,
                enum: CHAT_EDIT_ALLOWED_TEXT_ALIGNMENTS,
              },
              titleAlignment: {
                type: "string" as const,
                enum: CHAT_EDIT_ALLOWED_TEXT_ALIGNMENTS,
              },
              subtitleAlignment: {
                type: "string" as const,
                enum: CHAT_EDIT_ALLOWED_TEXT_ALIGNMENTS,
              },
              bodyAlignment: {
                type: "string" as const,
                enum: CHAT_EDIT_ALLOWED_TEXT_ALIGNMENTS,
              },
              titleLineHeight: { type: "number" as const },
              subtitleLineHeight: { type: "number" as const },
              bodyLineHeight: { type: "number" as const },
              titleLetterSpacing: { type: "number" as const },
              subtitleLetterSpacing: { type: "number" as const },
              bodyLetterSpacing: { type: "number" as const },
              opacity: { type: "number" as const },
              size: { type: "number" as const },
              fit: {
                type: "string" as const,
                enum: CHAT_EDIT_ALLOWED_IMAGE_FITS,
              },
              searchQuery: { type: "string" as const },
              externalUrl: { type: "string" as const },
              removeImage: { type: "boolean" as const },
              fontWeight: { type: "number" as const },
              italic: { type: "boolean" as const },
              underline: { type: "boolean" as const },
              strikethrough: { type: "boolean" as const },
              uppercase: { type: "boolean" as const },
              shadowColor: { type: "string" as const },
              shadowBlur: { type: "number" as const },
              shadowX: { type: "number" as const },
              shadowY: { type: "number" as const },
              bgPadding: { type: "number" as const },
              bgRadius: { type: "number" as const },
              strokeColor: { type: "string" as const },
              strokeWidth: { type: "number" as const },
            },
          },
          reason: {
            type: "string" as const,
            description: "Why this operation is being proposed.",
          },
        },
        required: ["type", "slideRef"],
      },
    },
  },
  required: ["summary", "scope", "operations"],
};

const SYSTEM_INSTRUCTION = `너는 카드뉴스 편집기용 AI Chat planner다.
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
14. 이미지 검색/추천/적용 요청은 update_image 에 searchQuery 를 넣어라. 직접 URL을 모르면 externalUrl 대신 searchQuery 를 사용해도 된다.
15. all_slides scope에서 "각 슬라이드에 어울리는 배경 이미지" 요청이 오면 slide별로 개별 update_image operation을 만들고, searchQuery도 슬라이드 내용에 맞게 다르게 작성하라.
16. "전체 배경을 검정색으로" 요청은 apply_style_to_all + bgType=solid + bgColor=#000000 을 우선 사용하고, 이미지가 방해되면 update_image + removeImage=true 도 함께 고려하라.
17. "왼쪽/가운데/오른쪽 정렬" 요청은 update_style 의 *Alignment 필드를 우선 사용하라.
18. 텍스트 블록 위치를 위/아래/좌상단/우하단처럼 재배치하려면 update_layout 을 사용하라.
19. 결과는 "적용 가능한 edit plan"이어야 하며, 장식적인 설명은 넣지 마라.`;

const REPAIR_SYSTEM_INSTRUCTION = `너는 JSON repair assistant다.
입력으로 깨진 JSON 또는 거의 맞는 JSON이 들어온다.
반드시 유효한 JSON 객체만 반환하라.
마크다운 코드펜스, 설명문, 주석, 사족을 절대 추가하지 마라.
의미는 최대한 보존하고 문법만 고쳐라.
필드가 누락되면 임의로 과도한 새 내용을 만들지 마라.
반드시 주어진 schema에 맞는 JSON을 반환하라.`;

function isApiKeyInvalidError(err: unknown): boolean {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: string }).message);
    return (
      message.includes("API_KEY_INVALID") ||
      message.includes("API key not valid")
    );
  }
  return false;
}

async function getDecryptedApiKey(
  ctx: Pick<ActionCtx, "runQuery">,
): Promise<string> {
  const profile = await ctx.runQuery(internal.userProfiles.getProfileByAuth);
  if (profile?.geminiApiKey) {
    if (profile.geminiApiKey.includes(":")) {
      return decrypt(profile.geminiApiKey);
    }

    return profile.geminiApiKey;
  }

  throw new ConvexError("API_KEY_REQUIRED");
}

function buildCatalogSection() {
  return {
    layoutIds: CHAT_EDIT_ALLOWED_LAYOUT_IDS,
    fontIds: CHAT_EDIT_ALLOWED_FONT_IDS,
    fontFamilies: CHAT_EDIT_ALLOWED_FONT_FAMILIES,
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
      bgType: CHAT_EDIT_ALLOWED_BG_TYPES,
      imageFit: CHAT_EDIT_ALLOWED_IMAGE_FITS,
      textFields: CHAT_EDIT_TARGET_FIELDS,
      textAlignments: CHAT_EDIT_ALLOWED_TEXT_ALIGNMENTS,
      imageSearchField: "update_image.changes.searchQuery",
    },
  };
}

function getSlideRef(order: number): string {
  return `slide-${order + 1}`;
}

function buildProjectPromptContext(
  project: Doc<"projects">,
  slides: Doc<"slides">[],
  currentSlideId: Id<"slides">,
): ProjectPromptContext {
  const currentSlide = slides.find((slide) => slide._id === currentSlideId);

  if (!currentSlide) {
    throw new ConvexError("CURRENT_SLIDE_NOT_FOUND");
  }

  return {
    projectId: project._id,
    projectTitle: project.title,
    currentSlideRef: getSlideRef(currentSlide.order),
    slides: slides.map((slide) => ({
      slideRef: getSlideRef(slide.order),
      type: slide.type,
      layoutId: slide.layoutId,
      content: slide.content,
      style: {
        bgType: slide.style.bgType,
        bgColor: slide.style.bgColor,
        gradientFrom: slide.style.gradientFrom,
        gradientTo: slide.style.gradientTo,
        gradientDirection: slide.style.gradientDirection,
        textColor: slide.style.textColor,
        accentColor: slide.style.accentColor,
        fontFamily: slide.style.fontFamily,
        categoryAlignment: slide.style.textAlignments?.category,
        titleAlignment: slide.style.textAlignments?.title,
        subtitleAlignment: slide.style.textAlignments?.subtitle,
        bodyAlignment: slide.style.textAlignments?.body,
        titleSize: slide.style.titleSize,
        subtitleSize: slide.style.subtitleSize,
        bodySize: slide.style.bodySize,
        titleLineHeight: slide.style.titleLineHeight,
        subtitleLineHeight: slide.style.subtitleLineHeight,
        bodyLineHeight: slide.style.bodyLineHeight,
        titleLetterSpacing: slide.style.titleLetterSpacing,
        subtitleLetterSpacing: slide.style.subtitleLetterSpacing,
        bodyLetterSpacing: slide.style.bodyLetterSpacing,
      },
      image: slide.image
        ? {
            externalUrl: slide.image.externalUrl,
            opacity: slide.image.opacity,
            size: slide.image.size,
            fit: slide.image.fit,
          }
        : null,
    })),
  };
}

function buildPromptPayload(context: PlanRequestContext) {
  return {
    promptVersion: PROMPT_VERSION,
    task: "Plan AI chat edits for a card-news editor.",
    instruction: context.instruction,
    scope: context.scope,
    selectedField: context.selectedField ?? null,
    selectedValue: context.selectedValue ?? null,
    catalog: buildCatalogSection(),
    currentProject: context.project,
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
      outputRules: ["JSON only", "schema compliant", "no markdown fences"],
    },
    expectationsHint: {
      minimalChange: true,
      keepUnchangedFieldsUntouched: true,
      respondInKorean: true,
      selectedTextRequestsPreferContentRewrite:
        context.scope === "selected_text",
      alignmentExamples: [
        "제목을 가운데 정렬 -> update_style + titleAlignment=center",
        "본문을 오른쪽 정렬 -> update_style + bodyAlignment=right",
        "텍스트를 좌상단으로 배치 -> update_layout + layoutId=top-left",
      ],
      imageExamples: [
        "각 슬라이드에 맞는 배경 이미지를 찾아줘 -> slide별 update_image + searchQuery",
        "전체 배경을 검정색으로 -> apply_style_to_all + bgType=solid + bgColor=#000000",
      ],
    },
  };
}

function sanitizeForJson(text: string | null | undefined): string {
  return (text ?? "").replace(/^\uFEFF/, "").trim();
}

function clampNumber(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeExternalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeGradientDirection(value: string): string | undefined {
  if (/^-?\d{1,3}deg$/i.test(value)) {
    return value.toLowerCase();
  }

  if (/^to (left|right|top|bottom)( (left|right|top|bottom))?$/i.test(value)) {
    return value.toLowerCase();
  }

  return undefined;
}

function normalizeNumericChange(
  key: keyof ChatEditOperationChanges,
  value: number,
): number {
  switch (key) {
    case "categorySize":
    case "titleSize":
    case "subtitleSize":
    case "bodySize":
      return Math.round(clampNumber(value, 12, 160));
    case "titleLineHeight":
    case "subtitleLineHeight":
    case "bodyLineHeight":
      return Math.round(clampNumber(value, 0.8, 2.4) * 100) / 100;
    case "titleLetterSpacing":
    case "subtitleLetterSpacing":
    case "bodyLetterSpacing":
      return Math.round(clampNumber(value, -4, 24) * 100) / 100;
    case "opacity":
      return Math.round(clampNumber(value, 0, 100));
    case "size":
      return Math.round(clampNumber(value, 20, 180));
    case "fontWeight":
      return Math.round(clampNumber(value, 100, 900) / 100) * 100;
    case "shadowBlur":
      return Math.round(clampNumber(value, 0, 80));
    case "shadowX":
    case "shadowY":
      return Math.round(clampNumber(value, -80, 80));
    case "bgPadding":
    case "bgRadius":
      return Math.round(clampNumber(value, 0, 64));
    case "strokeWidth":
      return Math.round(clampNumber(value, 0, 24));
    default:
      return value;
  }
}

function tryParseJson(text: string): JsonParseResult {
  const attempts: string[] = [];

  function tryOne(label: string, candidate: string) {
    try {
      return {
        parsed: JSON.parse(candidate),
        parseStrategy: label,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempts.push(`${label}: ${message}`);
      return null;
    }
  }

  const trimmed = sanitizeForJson(text);
  const direct = tryOne("direct", trimmed);
  if (direct) {
    return { ...direct, attempts };
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    const fenced = tryOne("fence", fenceMatch[1].trim());
    if (fenced) {
      return { ...fenced, attempts };
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const objectSlice = trimmed.slice(firstBrace, lastBrace + 1);
    const sliced = tryOne("outer-object", objectSlice);
    if (sliced) {
      return { ...sliced, attempts };
    }

    const noTrailingCommas = objectSlice.replace(/,\s*([}\]])/g, "$1");
    const trailingCommaFixed = tryOne(
      "strip-trailing-commas",
      noTrailingCommas,
    );
    if (trailingCommaFixed) {
      return { ...trailingCommaFixed, attempts };
    }
  }

  return { parsed: null, parseStrategy: "failed", attempts };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function readEnum<T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  allowedValues: T,
): T[number] | undefined {
  const value = record[key];
  return typeof value === "string" &&
    (allowedValues as readonly string[]).includes(value)
    ? (value as T[number])
    : undefined;
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          typeof item === "string" ? sanitizeChatEditText(item, 180) : undefined,
        )
        .filter((item): item is string => item !== undefined),
    ),
  );
}

function normalizeChanges(value: unknown): ChatEditOperationChanges | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const normalized: ChatEditOperationChanges = {};

  for (const key of CHAT_EDIT_CONTENT_CHANGE_KEYS) {
    const nextValue = readString(value, key);
    if (nextValue !== undefined) {
      const sanitized = sanitizeChatEditText(nextValue, key === "body" ? 600 : 240);
      if (sanitized !== undefined) {
        normalized[key] = sanitized;
      }
    }
  }

  const bgType = readEnum(value, "bgType", CHAT_EDIT_ALLOWED_BG_TYPES);
  if (bgType) {
    normalized.bgType = bgType;
  }

  const fit = readEnum(value, "fit", CHAT_EDIT_ALLOWED_IMAGE_FITS);
  if (fit) {
    normalized.fit = fit;
  }

  const fontFamily = readEnum(
    value,
    "fontFamily",
    CHAT_EDIT_ALLOWED_FONT_FAMILIES,
  );
  if (fontFamily) {
    normalized.fontFamily = fontFamily;
  }

  const alignmentKeys = [
    "categoryAlignment",
    "titleAlignment",
    "subtitleAlignment",
    "bodyAlignment",
  ] as const;
  for (const key of alignmentKeys) {
    const nextValue = readEnum(value, key, CHAT_EDIT_ALLOWED_TEXT_ALIGNMENTS);
    if (nextValue !== undefined) {
      normalized[key] = nextValue;
    }
  }

  const stringKeys = [
    "bgColor",
    "gradientFrom",
    "gradientTo",
    "gradientDirection",
    "textColor",
    "accentColor",
    "categoryColor",
    "titleColor",
    "subtitleColor",
    "bodyColor",
    "searchQuery",
    "externalUrl",
    "shadowColor",
    "strokeColor",
  ] as const;
  for (const key of stringKeys) {
    const nextValue = readString(value, key);
    if (nextValue !== undefined) {
      const sanitized = sanitizeChatEditText(
        nextValue,
        key === "externalUrl" ? 1_000 : 240,
      );
      if (sanitized !== undefined) {
        if (key === "externalUrl") {
          const normalizedUrl = normalizeExternalUrl(sanitized);
          if (normalizedUrl !== undefined) {
            normalized[key] = normalizedUrl;
          }
          continue;
        }

        if (key === "gradientDirection") {
          const normalizedDirection = normalizeGradientDirection(sanitized);
          if (normalizedDirection !== undefined) {
            normalized[key] = normalizedDirection;
          }
          continue;
        }

        normalized[key] = sanitized;
      }
    }
  }

  const numberKeys = [
    "categorySize",
    "titleSize",
    "subtitleSize",
    "bodySize",
    "titleLineHeight",
    "subtitleLineHeight",
    "bodyLineHeight",
    "titleLetterSpacing",
    "subtitleLetterSpacing",
    "bodyLetterSpacing",
    "opacity",
    "size",
    "fontWeight",
    "shadowBlur",
    "shadowX",
    "shadowY",
    "bgPadding",
    "bgRadius",
    "strokeWidth",
  ] as const;
  for (const key of numberKeys) {
    const nextValue = readNumber(value, key);
    if (nextValue !== undefined) {
      normalized[key] = normalizeNumericChange(key, nextValue);
    }
  }

  const booleanKeys = [
    "removeImage",
    "italic",
    "underline",
    "strikethrough",
    "uppercase",
  ] as const;
  for (const key of booleanKeys) {
    const nextValue = readBoolean(value, key);
    if (nextValue !== undefined) {
      normalized[key] = nextValue;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function hasAnyKeys(
  changes: ChatEditOperationChanges | undefined,
  keys: readonly (keyof ChatEditOperationChanges)[],
): boolean {
  if (!changes) {
    return false;
  }

  return keys.some((key) => changes[key] !== undefined);
}

function assignChangeIfDefined<K extends keyof ChatEditOperationChanges>(
  target: ChatEditOperationChanges,
  key: K,
  value: ChatEditOperationChanges[K] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function pickChanges(
  changes: ChatEditOperationChanges | undefined,
  allowedKeys: readonly (keyof ChatEditOperationChanges)[],
): ChatEditOperationChanges | undefined {
  if (!changes) {
    return undefined;
  }

  const filtered: ChatEditOperationChanges = {};
  for (const key of allowedKeys) {
    assignChangeIfDefined(filtered, key, changes[key]);
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

function getAllowedChangeKeysForOperation(
  type: ChatEditOperationType,
  request: PlanRequestContext,
): readonly (keyof ChatEditOperationChanges)[] {
  switch (type) {
    case "update_content":
      return request.scope === "selected_text" && request.selectedField
        ? [request.selectedField]
        : CHAT_EDIT_CONTENT_CHANGE_KEYS;
    case "update_style":
      return request.scope === "selected_text" && request.selectedField
        ? CHAT_EDIT_FIELD_STYLE_CHANGE_KEYS[request.selectedField]
        : CHAT_EDIT_SLIDE_STYLE_CHANGE_KEYS;
    case "update_layout":
      return [];
    case "update_image":
      return CHAT_EDIT_IMAGE_CHANGE_KEYS;
    case "apply_style_to_all":
      return CHAT_EDIT_SLIDE_STYLE_CHANGE_KEYS;
    case "update_text_effects":
      return CHAT_EDIT_TEXT_EFFECT_CHANGE_KEYS;
  }
}

function resolveOperationTargetField(
  operation: ChatEditOperation,
  request: PlanRequestContext,
): ChatEditTargetField | undefined {
  if (operation.targetField) {
    return operation.targetField;
  }

  if (request.scope === "selected_text") {
    return request.selectedField;
  }

  return undefined;
}

function operationTouchesSelectedField(
  operation: ChatEditOperation,
  request: PlanRequestContext,
): boolean {
  if (request.scope !== "selected_text" || !request.selectedField) {
    return true;
  }

  const targetField = resolveOperationTargetField(operation, request);
  if (targetField === request.selectedField) {
    return true;
  }

  const contentKey = request.selectedField;
  if (operation.changes?.[contentKey] !== undefined) {
    return true;
  }

  return CHAT_EDIT_FIELD_STYLE_CHANGE_KEYS[request.selectedField].some(
    (key) => operation.changes?.[key] !== undefined,
  );
}

function isRewriteIntent(instruction: string): boolean {
  return /다듬|읽기 쉽게|더 짧게|임팩트|쉽게 풀어|강하게|가독성|자연스럽게/.test(
    instruction,
  );
}

function requiresSelectedTextContentUpdate(request: PlanRequestContext): boolean {
  return request.scope === "selected_text" && isRewriteIntent(request.instruction);
}

function validateSelectedTextOperation(
  operation: ChatEditOperation,
  request: PlanRequestContext,
): boolean {
  if (request.scope !== "selected_text" || !request.selectedField) {
    return true;
  }

  const selectedField = request.selectedField;

  switch (operation.type) {
    case "update_content":
      return hasAnyKeys(operation.changes, [selectedField]);
    case "update_style":
      return hasAnyKeys(
        operation.changes,
        CHAT_EDIT_FIELD_STYLE_CHANGE_KEYS[selectedField],
      );
    case "update_text_effects":
      return resolveOperationTargetField(operation, request) === selectedField;
    default:
      return false;
  }
}

function isAllowedSlideRefForRequest(
  slideRef: string,
  request: PlanRequestContext,
): boolean {
  if (request.scope === "all_slides") {
    return slideRef === "all" || /^slide-\d+$/.test(slideRef);
  }

  return slideRef === "current" || slideRef === request.currentSlideRef;
}

function validateOperation(
  operation: ChatEditOperation,
  request: PlanRequestContext,
): boolean {
  if (!isAllowedSlideRefForRequest(operation.slideRef, request)) {
    return false;
  }

  if (
    request.scope !== "all_slides" &&
    (operation.type === "apply_style_to_all" || operation.slideRef === "all")
  ) {
    return false;
  }

  if (
    request.scope === "selected_text" &&
    !operationTouchesSelectedField(operation, request)
  ) {
    return false;
  }

  if (!validateSelectedTextOperation(operation, request)) {
    return false;
  }

  switch (operation.type) {
    case "update_content":
      return hasAnyKeys(operation.changes, CHAT_EDIT_CONTENT_CHANGE_KEYS);
    case "update_style":
    case "apply_style_to_all":
      return hasAnyKeys(operation.changes, getAllowedChangeKeysForOperation(operation.type, request));
    case "update_layout":
      return operation.layoutId !== undefined;
    case "update_image":
      return hasAnyKeys(operation.changes, CHAT_EDIT_IMAGE_CHANGE_KEYS);
    case "update_text_effects":
      return (
        resolveOperationTargetField(operation, request) !== undefined &&
        hasAnyKeys(operation.changes, CHAT_EDIT_TEXT_EFFECT_CHANGE_KEYS)
      );
  }
}

function normalizeOperation(
  value: unknown,
  request: PlanRequestContext,
): ChatEditOperation | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = readEnum(value, "type", CHAT_EDIT_OPERATION_TYPES);
  if (!type) {
    return null;
  }

  const fallbackSlideRef =
    request.scope === "all_slides" || type === "apply_style_to_all"
      ? "all"
      : "current";
  const slideRef = readString(value, "slideRef") ?? fallbackSlideRef;
  const targetField =
    readEnum(value, "targetField", CHAT_EDIT_TARGET_FIELDS) ??
    (request.scope === "selected_text" ? request.selectedField : undefined);
  const layoutId = readEnum(value, "layoutId", CHAT_EDIT_ALLOWED_LAYOUT_IDS);
  const changes = pickChanges(
    normalizeChanges(value.changes),
    getAllowedChangeKeysForOperation(type, request),
  );
  const reason = readString(value, "reason");

  const normalized: ChatEditOperation = {
    type,
    slideRef,
  };

  if (targetField) {
    normalized.targetField = targetField;
  }
  if (layoutId) {
    normalized.layoutId = layoutId;
  }
  if (changes) {
    normalized.changes = changes;
  }
  if (reason) {
    normalized.reason = sanitizeChatEditText(reason, 240);
  }

  return validateOperation(normalized, request) ? normalized : null;
}

function normalizePlan(
  value: unknown,
  request: PlanRequestContext,
): ChatEditPlan | null {
  if (!isRecord(value)) {
    return null;
  }

  const summary = sanitizeChatEditText(readString(value, "summary"), 320);
  const scope = readEnum(value, "scope", CHAT_EDIT_SCOPES);
  if (!summary || !scope || scope !== request.scope) {
    return null;
  }

  const operationsValue = value.operations;
  if (!Array.isArray(operationsValue)) {
    return null;
  }

  const seenFingerprints = new Set<string>();
  const operations = operationsValue
    .map((operation) => normalizeOperation(operation, request))
    .filter((operation): operation is ChatEditOperation => {
      if (operation === null) {
        return false;
      }

      const fingerprint = JSON.stringify({
        type: operation.type,
        slideRef: operation.slideRef,
        targetField: operation.targetField ?? null,
        layoutId: operation.layoutId ?? null,
        changes: operation.changes ?? null,
      });
      if (seenFingerprints.has(fingerprint)) {
        return false;
      }

      seenFingerprints.add(fingerprint);
      return true;
    })
    .slice(0, CHAT_EDIT_MAX_OPERATIONS);

  if (operations.length === 0) {
    return null;
  }

  if (
    request.scope === "selected_text" &&
    !operations.some((operation) => operationTouchesSelectedField(operation, request))
  ) {
    return null;
  }

  if (
    requiresSelectedTextContentUpdate(request) &&
    !operations.some(
      (operation) =>
        operation.type === "update_content" &&
        operationTouchesSelectedField(operation, request),
    )
  ) {
    return null;
  }

  return {
    summary,
    scope,
    warnings: normalizeWarnings(value.warnings),
    operations,
  };
}

async function callModel(
  ai: GoogleGenAI,
  model: string,
  inputText: string,
  systemInstruction: string,
  timeoutMs: number,
) {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort(
      new Error(`AI edit plan request timed out after ${timeoutMs}ms`),
    );
  }, timeoutMs);

  try {
    return await ai.models.generateContent({
      model,
      contents: inputText,
      config: {
        abortSignal: abortController.signal,
        systemInstruction,
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: CHAT_EDIT_PLAN_SCHEMA,
      },
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function repairJsonPlan(
  ai: GoogleGenAI,
  model: string,
  responseText: string,
): Promise<{ parsed: unknown; parseStrategy: string }> {
  const repairPayload = {
    task: "Repair malformed JSON for card-news edit plan schema.",
    brokenJson: responseText,
    rules: [
      "Return valid JSON only",
      "Preserve semantics",
      "Do not add markdown fences",
      "Match the schema exactly",
    ],
  };

  const response = await callModel(
    ai,
    model,
    JSON.stringify(repairPayload, null, 2),
    REPAIR_SYSTEM_INSTRUCTION,
    Math.min(REQUEST_TIMEOUT_MS, 8_000),
  );
  const repairedText = sanitizeForJson(response.text);
  const recovered = tryParseJson(repairedText);
  if (!recovered.parsed) {
    throw new Error(recovered.attempts.join(" | "));
  }

  return {
    parsed: recovered.parsed,
    parseStrategy: recovered.parseStrategy,
  };
}

async function generatePlanWithModel(
  ai: GoogleGenAI,
  model: string,
  request: PlanRequestContext,
): Promise<{
  plan: ChatEditPlan;
  repaired: boolean;
  parseStrategy: string;
}> {
  const response = await callModel(
    ai,
    model,
    JSON.stringify(buildPromptPayload(request), null, 2),
    SYSTEM_INSTRUCTION,
    REQUEST_TIMEOUT_MS,
  );

  const responseText = sanitizeForJson(response.text);
  const parsedResult = tryParseJson(responseText);

  if (parsedResult.parsed) {
    const normalized = normalizePlan(parsedResult.parsed, request);
    if (normalized) {
      return {
        plan: normalized,
        repaired: false,
        parseStrategy: parsedResult.parseStrategy,
      };
    }
  }

  const repaired = await repairJsonPlan(ai, model, responseText);
  const normalized = normalizePlan(repaired.parsed, request);
  if (!normalized) {
    throw new Error("Repaired response did not match the chat edit plan schema");
  }

  return {
    plan: normalized,
    repaired: true,
    parseStrategy: repaired.parseStrategy,
  };
}

export const planChatEdit = action({
  args: {
    projectId: v.id("projects"),
    currentSlideId: v.id("slides"),
    instruction: v.string(),
    scope: v.union(
      v.literal("selected_text"),
      v.literal("current_slide"),
      v.literal("all_slides"),
    ),
    selectedField: v.optional(
      v.union(
        v.literal("category"),
        v.literal("title"),
        v.literal("subtitle"),
        v.literal("body"),
      ),
    ),
  },
  handler: async (
    ctx,
    { projectId, currentSlideId, instruction, scope, selectedField },
  ): Promise<ChatEditPlanResponse> => {
    const normalizedInstruction = sanitizeChatEditText(
      instruction,
      MAX_INSTRUCTION_LENGTH,
    );
    if (!normalizedInstruction) {
      throw new ConvexError("INSTRUCTION_REQUIRED");
    }

    if (scope === "selected_text" && !selectedField) {
      throw new ConvexError("SELECTED_FIELD_REQUIRED");
    }

    const apiKey = await getDecryptedApiKey(ctx);
    const ai = new GoogleGenAI({ apiKey });
    const profile = await ctx.runQuery(internal.userProfiles.getProfileByAuth);
    if (!profile) {
      throw new ConvexError("PROFILE_NOT_FOUND");
    }

    const project = await ctx.runQuery(internal.projects.getProjectInternal, {
      projectId,
    });
    if (!project) {
      throw new ConvexError("PROJECT_NOT_FOUND");
    }
    if (project.userId !== profile.userId) {
      throw new ConvexError("PROJECT_ACCESS_DENIED");
    }

    const slides = await ctx.runQuery(internal.slides.getSlidesInternal, {
      projectId,
    });
    if (slides.length === 0) {
      throw new ConvexError("SLIDES_NOT_FOUND");
    }

    const currentSlide = slides.find((slide) => slide._id === currentSlideId);
    if (!currentSlide) {
      throw new ConvexError("CURRENT_SLIDE_NOT_FOUND");
    }

    if (currentSlide.projectId !== projectId) {
      throw new ConvexError("CURRENT_SLIDE_PROJECT_MISMATCH");
    }

    const promptProject = buildProjectPromptContext(project, slides, currentSlideId);
    const request: PlanRequestContext = {
      instruction: normalizedInstruction,
      scope,
      selectedField,
      currentSlideRef: promptProject.currentSlideRef,
      project: promptProject,
      selectedValue: selectedField
        ? currentSlide.content[selectedField]
        : undefined,
    };

    const attemptedModels: string[] = [];
    const failures: string[] = [];

    for (const model of MODEL_SEQUENCE) {
      attemptedModels.push(model);

      try {
        const result = await generatePlanWithModel(ai, model, request);
        return {
          ...result.plan,
          metadata: {
            model,
            attemptedModels,
            fallbackUsed: attemptedModels.length > 1,
            repaired: result.repaired,
            parseStrategy: result.parseStrategy,
            promptVersion: PROMPT_VERSION,
          },
        };
      } catch (error) {
        if (isApiKeyInvalidError(error)) {
          throw new ConvexError("API_KEY_INVALID");
        }

        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${model}: ${message}`);
      }
    }

    throw new ConvexError({
      code: "AI_EDIT_PLAN_FAILED",
      message: "AI 편집 계획을 생성하지 못했습니다.",
      attempts: failures,
    });
  },
});
