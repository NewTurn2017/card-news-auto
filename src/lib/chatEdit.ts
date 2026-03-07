import type { EditableTextField, TextAlignment } from "../types";

export const CHAT_EDIT_SCOPES = [
  "selected_text",
  "current_slide",
  "all_slides",
] as const;

export type ChatEditScope = (typeof CHAT_EDIT_SCOPES)[number];

export const CHAT_EDIT_TARGET_FIELDS = [
  "category",
  "title",
  "subtitle",
  "body",
] as const satisfies readonly EditableTextField[];

export type ChatEditTargetField = EditableTextField;

export const CHAT_EDIT_OPERATION_TYPES = [
  "update_content",
  "update_style",
  "update_layout",
  "update_image",
  "apply_style_to_all",
  "update_text_effects",
] as const;

export type ChatEditOperationType = (typeof CHAT_EDIT_OPERATION_TYPES)[number];

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
] as const;

export type ChatEditLayoutId = (typeof CHAT_EDIT_ALLOWED_LAYOUT_IDS)[number];

export const CHAT_EDIT_ALLOWED_FONT_IDS = [
  "pretendard",
  "noto-sans-kr",
  "suit",
  "gmarket-sans",
  "nanum-myeongjo",
  "maruburi",
  "black-han-sans",
] as const;

export const CHAT_EDIT_ALLOWED_FONT_FAMILIES = [
  "'Pretendard', sans-serif",
  "'Noto Sans KR', sans-serif",
  "'SUIT', sans-serif",
  "'GmarketSans', sans-serif",
  "'Nanum Myeongjo', serif",
  "'MaruBuri', serif",
  "'Black Han Sans', sans-serif",
] as const;

export type ChatEditFontFamily = (typeof CHAT_EDIT_ALLOWED_FONT_FAMILIES)[number];

export const CHAT_EDIT_ALLOWED_BG_TYPES = ["solid", "gradient"] as const;

export type ChatEditBgType = (typeof CHAT_EDIT_ALLOWED_BG_TYPES)[number];

export const CHAT_EDIT_ALLOWED_IMAGE_FITS = [
  "cover",
  "contain",
  "fill",
  "free",
] as const;

export type ChatEditImageFit = (typeof CHAT_EDIT_ALLOWED_IMAGE_FITS)[number];

export const CHAT_EDIT_ALLOWED_TEXT_ALIGNMENTS = [
  "left",
  "center",
  "right",
] as const satisfies readonly TextAlignment[];

export type ChatEditTextAlignment = TextAlignment;

export const CHAT_EDIT_MAX_OPERATIONS = 12;

export interface ChatEditOperationChanges {
  category?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  bgType?: ChatEditBgType;
  bgColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: ChatEditFontFamily;
  categorySize?: number;
  titleSize?: number;
  subtitleSize?: number;
  bodySize?: number;
  categoryColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  bodyColor?: string;
  categoryAlignment?: ChatEditTextAlignment;
  titleAlignment?: ChatEditTextAlignment;
  subtitleAlignment?: ChatEditTextAlignment;
  bodyAlignment?: ChatEditTextAlignment;
  titleLineHeight?: number;
  subtitleLineHeight?: number;
  bodyLineHeight?: number;
  titleLetterSpacing?: number;
  subtitleLetterSpacing?: number;
  bodyLetterSpacing?: number;
  opacity?: number;
  size?: number;
  fit?: ChatEditImageFit;
  searchQuery?: string;
  externalUrl?: string;
  removeImage?: boolean;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  uppercase?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  bgPadding?: number;
  bgRadius?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export const CHAT_EDIT_CONTENT_CHANGE_KEYS = [
  "category",
  "title",
  "subtitle",
  "body",
] as const satisfies readonly (keyof ChatEditOperationChanges)[];

export const CHAT_EDIT_SLIDE_STYLE_CHANGE_KEYS = [
  "bgType",
  "bgColor",
  "gradientFrom",
  "gradientTo",
  "gradientDirection",
  "textColor",
  "accentColor",
  "fontFamily",
  "categorySize",
  "titleSize",
  "subtitleSize",
  "bodySize",
  "categoryColor",
  "titleColor",
  "subtitleColor",
  "bodyColor",
  "categoryAlignment",
  "titleAlignment",
  "subtitleAlignment",
  "bodyAlignment",
  "titleLineHeight",
  "subtitleLineHeight",
  "bodyLineHeight",
  "titleLetterSpacing",
  "subtitleLetterSpacing",
  "bodyLetterSpacing",
] as const satisfies readonly (keyof ChatEditOperationChanges)[];

export const CHAT_EDIT_IMAGE_CHANGE_KEYS = [
  "searchQuery",
  "opacity",
  "size",
  "fit",
  "externalUrl",
  "removeImage",
] as const satisfies readonly (keyof ChatEditOperationChanges)[];

export const CHAT_EDIT_TEXT_EFFECT_CHANGE_KEYS = [
  "opacity",
  "fontWeight",
  "italic",
  "underline",
  "strikethrough",
  "uppercase",
  "shadowColor",
  "shadowBlur",
  "shadowX",
  "shadowY",
  "bgColor",
  "bgPadding",
  "bgRadius",
  "strokeColor",
  "strokeWidth",
] as const satisfies readonly (keyof ChatEditOperationChanges)[];

export const CHAT_EDIT_FIELD_STYLE_CHANGE_KEYS: Record<
  ChatEditTargetField,
  readonly (keyof ChatEditOperationChanges)[]
> = {
  category: ["categorySize", "categoryColor", "categoryAlignment"],
  title: [
    "titleSize",
    "titleColor",
    "titleAlignment",
    "titleLineHeight",
    "titleLetterSpacing",
  ],
  subtitle: [
    "subtitleSize",
    "subtitleColor",
    "subtitleAlignment",
    "subtitleLineHeight",
    "subtitleLetterSpacing",
  ],
  body: [
    "bodySize",
    "bodyColor",
    "bodyAlignment",
    "bodyLineHeight",
    "bodyLetterSpacing",
  ],
};

export interface ChatEditOperation {
  type: ChatEditOperationType;
  slideRef: string;
  targetField?: ChatEditTargetField;
  layoutId?: ChatEditLayoutId;
  changes?: ChatEditOperationChanges;
  reason?: string;
}

export interface ChatEditPlan {
  summary: string;
  scope: ChatEditScope;
  warnings: string[];
  operations: ChatEditOperation[];
}

export interface ChatEditPlanMetadata {
  model: string;
  attemptedModels: string[];
  fallbackUsed: boolean;
  repaired: boolean;
  parseStrategy: string;
  promptVersion: string;
}

export interface ChatEditPlanResponse extends ChatEditPlan {
  metadata: ChatEditPlanMetadata;
}

export interface PendingChatEdit extends ChatEditPlanResponse {
  createdAt: number;
  instruction: string;
  referenceSlideId: string;
  selectedField: ChatEditTargetField | null;
}

export interface ChatEditNormalizationPolicy {
  scope: ChatEditScope;
  selectedField?: ChatEditTargetField | null;
}

export interface ChatEditRenderOperation {
  key: string;
  title: string;
  target: string;
  changes: Array<{ label: string; value: string }>;
  reason?: string;
}

export interface ChatEditRenderModel {
  summary: string;
  scopeLabel: string;
  warnings: string[];
  operations: ChatEditRenderOperation[];
  metadataLabel: string;
}

const CHAT_EDIT_SCOPE_LABELS: Record<ChatEditScope, string> = {
  selected_text: "선택 영역",
  current_slide: "현재 슬라이드",
  all_slides: "전체 슬라이드",
};

const CHAT_EDIT_OPERATION_LABELS: Record<ChatEditOperationType, string> = {
  update_content: "카피 수정",
  update_style: "스타일 수정",
  update_layout: "레이아웃 변경",
  update_image: "이미지 수정",
  apply_style_to_all: "전체 스타일 적용",
  update_text_effects: "텍스트 효과 수정",
};

const CHAT_EDIT_FIELD_LABELS: Record<ChatEditTargetField, string> = {
  category: "카테고리",
  title: "제목",
  subtitle: "부제",
  body: "본문",
};

const CHAT_EDIT_LAYOUT_LABELS: Record<ChatEditLayoutId, string> = {
  "top-left": "좌상단",
  "top-center": "상단 중앙",
  "top-right": "우상단",
  "center-left": "좌측 중앙",
  center: "중앙",
  "center-right": "우측 중앙",
  "bottom-left": "좌하단",
  "bottom-center": "하단 중앙",
  "bottom-right": "우하단",
  "big-title": "빅 타이틀",
  split: "상하 분할",
  editorial: "에디토리얼",
};

const CHAT_EDIT_CHANGE_KEY_LABELS: Record<keyof ChatEditOperationChanges, string> = {
  category: "카테고리",
  title: "제목",
  subtitle: "부제",
  body: "본문",
  bgType: "배경 타입",
  bgColor: "배경 색상",
  gradientFrom: "그라데이션 시작",
  gradientTo: "그라데이션 끝",
  gradientDirection: "그라데이션 방향",
  textColor: "기본 텍스트 색상",
  accentColor: "포인트 색상",
  fontFamily: "폰트",
  categorySize: "카테고리 크기",
  titleSize: "제목 크기",
  subtitleSize: "부제 크기",
  bodySize: "본문 크기",
  categoryColor: "카테고리 색상",
  titleColor: "제목 색상",
  subtitleColor: "부제 색상",
  bodyColor: "본문 색상",
  categoryAlignment: "카테고리 정렬",
  titleAlignment: "제목 정렬",
  subtitleAlignment: "부제 정렬",
  bodyAlignment: "본문 정렬",
  titleLineHeight: "제목 줄간격",
  subtitleLineHeight: "부제 줄간격",
  bodyLineHeight: "본문 줄간격",
  titleLetterSpacing: "제목 자간",
  subtitleLetterSpacing: "부제 자간",
  bodyLetterSpacing: "본문 자간",
  opacity: "투명도",
  size: "크기",
  fit: "맞춤 방식",
  searchQuery: "이미지 검색어",
  externalUrl: "이미지 URL",
  removeImage: "이미지 제거",
  fontWeight: "글자 두께",
  italic: "기울임",
  underline: "밑줄",
  strikethrough: "취소선",
  uppercase: "대문자",
  shadowColor: "그림자 색상",
  shadowBlur: "그림자 흐림",
  shadowX: "그림자 X",
  shadowY: "그림자 Y",
  bgPadding: "배경 여백",
  bgRadius: "배경 모서리",
  strokeColor: "외곽선 색상",
  strokeWidth: "외곽선 두께",
};

const STRING_CHANGE_KEYS = [
  "category",
  "title",
  "subtitle",
  "body",
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
] as const satisfies readonly (keyof ChatEditOperationChanges)[];

const NUMBER_CHANGE_KEYS = [
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
] as const satisfies readonly (keyof ChatEditOperationChanges)[];

const BOOLEAN_CHANGE_KEYS = [
  "removeImage",
  "italic",
  "underline",
  "strikethrough",
  "uppercase",
] as const satisfies readonly (keyof ChatEditOperationChanges)[];

const ALIGNMENT_CHANGE_KEYS = [
  "categoryAlignment",
  "titleAlignment",
  "subtitleAlignment",
  "bodyAlignment",
] as const satisfies readonly (keyof ChatEditOperationChanges)[];

const CHANGE_RENDER_ORDER = [
  ...CHAT_EDIT_CONTENT_CHANGE_KEYS,
  ...CHAT_EDIT_SLIDE_STYLE_CHANGE_KEYS,
  ...CHAT_EDIT_IMAGE_CHANGE_KEYS,
  ...CHAT_EDIT_TEXT_EFFECT_CHANGE_KEYS,
] as const;

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

function normalizeStringList(
  value: unknown,
  maxLength: number,
  maxItems: number,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          typeof item === "string" ? sanitizeChatEditText(item, maxLength) : undefined,
        )
        .filter((item): item is string => item !== undefined),
    ),
  ).slice(0, maxItems);
}

function normalizeChangeText(
  value: string,
  key: keyof ChatEditOperationChanges,
): string | undefined {
  const maxLength = key === "body" ? 600 : key === "externalUrl" ? 1_000 : 240;
  const normalized = sanitizeChatEditText(value, maxLength);
  if (!normalized) {
    return undefined;
  }

  if (key === "externalUrl") {
    return normalizeExternalUrl(normalized);
  }

  if (key === "gradientDirection") {
    return normalizeGradientDirection(normalized);
  }

  return normalized;
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
  key: typeof NUMBER_CHANGE_KEYS[number],
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
  }
}

function buildOperationFingerprint(operation: ChatEditOperation): string {
  return JSON.stringify({
    type: operation.type,
    slideRef: operation.slideRef,
    targetField: operation.targetField ?? null,
    layoutId: operation.layoutId ?? null,
    changes: operation.changes ?? null,
  });
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

function resolveOperationTargetField(
  operation: ChatEditOperation,
  policy: ChatEditNormalizationPolicy,
): ChatEditTargetField | undefined {
  if (operation.targetField) {
    return operation.targetField;
  }

  if (policy.scope === "selected_text") {
    return policy.selectedField ?? undefined;
  }

  return undefined;
}

function operationTouchesSelectedField(
  operation: ChatEditOperation,
  policy: ChatEditNormalizationPolicy,
): boolean {
  if (policy.scope !== "selected_text" || !policy.selectedField) {
    return true;
  }

  const targetField = resolveOperationTargetField(operation, policy);
  if (targetField === policy.selectedField) {
    return true;
  }

  if (operation.changes?.[policy.selectedField] !== undefined) {
    return true;
  }

  return CHAT_EDIT_FIELD_STYLE_CHANGE_KEYS[policy.selectedField].some(
    (key) => operation.changes?.[key] !== undefined,
  );
}

function validateSelectedTextOperation(
  operation: ChatEditOperation,
  policy: ChatEditNormalizationPolicy,
): boolean {
  if (policy.scope !== "selected_text" || !policy.selectedField) {
    return true;
  }

  switch (operation.type) {
    case "update_content":
      return hasAnyKeys(operation.changes, [policy.selectedField]);
    case "update_style":
      return hasAnyKeys(
        operation.changes,
        CHAT_EDIT_FIELD_STYLE_CHANGE_KEYS[policy.selectedField],
      );
    case "update_text_effects":
      return resolveOperationTargetField(operation, policy) === policy.selectedField;
    default:
      return false;
  }
}

function isAllowedSlideRefForScope(
  slideRef: string,
  scope: ChatEditScope,
): boolean {
  if (scope === "all_slides") {
    return slideRef === "all" || /^slide-\d+$/.test(slideRef);
  }

  return slideRef === "current" || /^slide-\d+$/.test(slideRef);
}

function validateOperation(
  operation: ChatEditOperation,
  policy: ChatEditNormalizationPolicy,
): boolean {
  if (!isAllowedSlideRefForScope(operation.slideRef, policy.scope)) {
    return false;
  }

  if (
    policy.scope !== "all_slides" &&
    (operation.type === "apply_style_to_all" || operation.slideRef === "all")
  ) {
    return false;
  }

  if (
    policy.scope === "selected_text" &&
    !operationTouchesSelectedField(operation, policy)
  ) {
    return false;
  }

  if (!validateSelectedTextOperation(operation, policy)) {
    return false;
  }

  switch (operation.type) {
    case "update_content":
      return hasAnyKeys(operation.changes, CHAT_EDIT_CONTENT_CHANGE_KEYS);
    case "update_style":
    case "apply_style_to_all":
      return hasAnyKeys(
        operation.changes,
        getAllowedChatEditChangeKeysForOperation(operation.type, policy),
      );
    case "update_layout":
      return operation.layoutId !== undefined;
    case "update_image":
      return hasAnyKeys(operation.changes, CHAT_EDIT_IMAGE_CHANGE_KEYS);
    case "update_text_effects":
      return (
        resolveOperationTargetField(operation, policy) !== undefined &&
        hasAnyKeys(operation.changes, CHAT_EDIT_TEXT_EFFECT_CHANGE_KEYS)
      );
  }
}

function normalizeChanges(value: unknown): ChatEditOperationChanges | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const normalized: ChatEditOperationChanges = {};

  for (const key of STRING_CHANGE_KEYS) {
    const nextValue = readString(value, key);
    if (nextValue !== undefined) {
      const sanitized = normalizeChangeText(nextValue, key);
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

  for (const key of ALIGNMENT_CHANGE_KEYS) {
    const nextValue = readEnum(value, key, CHAT_EDIT_ALLOWED_TEXT_ALIGNMENTS);
    if (nextValue !== undefined) {
      normalized[key] = nextValue;
    }
  }

  const fontFamily = readEnum(
    value,
    "fontFamily",
    CHAT_EDIT_ALLOWED_FONT_FAMILIES,
  );
  if (fontFamily) {
    normalized.fontFamily = fontFamily;
  }

  for (const key of NUMBER_CHANGE_KEYS) {
    const nextValue = readNumber(value, key);
    if (nextValue !== undefined) {
      normalized[key] = normalizeNumericChange(key, nextValue);
    }
  }

  for (const key of BOOLEAN_CHANGE_KEYS) {
    const nextValue = readBoolean(value, key);
    if (nextValue !== undefined) {
      normalized[key] = nextValue;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeOperation(
  value: unknown,
  policy: ChatEditNormalizationPolicy,
): ChatEditOperation | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = readEnum(value, "type", CHAT_EDIT_OPERATION_TYPES);
  if (!type) {
    return null;
  }

  const slideRef = sanitizeChatEditText(readString(value, "slideRef"), 32);
  if (!slideRef) {
    return null;
  }

  const targetField = readEnum(value, "targetField", CHAT_EDIT_TARGET_FIELDS);
  const layoutId = readEnum(value, "layoutId", CHAT_EDIT_ALLOWED_LAYOUT_IDS);
  const changes = pickChanges(
    normalizeChanges(value.changes),
    getAllowedChatEditChangeKeysForOperation(type, policy),
  );
  const reason = sanitizeChatEditText(readString(value, "reason"), 240);

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
    normalized.reason = reason;
  }

  return validateOperation(normalized, policy) ? normalized : null;
}

function normalizeMetadata(value: unknown): ChatEditPlanMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  const model = sanitizeChatEditText(readString(value, "model"), 120);
  const parseStrategy = sanitizeChatEditText(readString(value, "parseStrategy"), 120);
  const promptVersion = sanitizeChatEditText(readString(value, "promptVersion"), 32);
  const fallbackUsed = readBoolean(value, "fallbackUsed");
  const repaired = readBoolean(value, "repaired");
  const attemptedModels = normalizeStringList(value.attemptedModels, 120, 8);

  if (
    !model ||
    !parseStrategy ||
    !promptVersion ||
    fallbackUsed === undefined ||
    repaired === undefined ||
    attemptedModels.length === 0
  ) {
    return null;
  }

  return {
    model,
    attemptedModels,
    fallbackUsed,
    repaired,
    parseStrategy,
    promptVersion,
  };
}

function formatSlideRef(slideRef: string): string {
  if (slideRef === "current") {
    return "현재 슬라이드";
  }

  if (slideRef === "all") {
    return "전체 슬라이드";
  }

  const slideMatch = slideRef.match(/^slide-(\d+)$/);
  if (slideMatch) {
    return `슬라이드 ${slideMatch[1]}`;
  }

  return slideRef;
}

function formatChangeValue(
  key: keyof ChatEditOperationChanges,
  value: ChatEditOperationChanges[keyof ChatEditOperationChanges],
): string {
  if (typeof value === "boolean") {
    return value ? "예" : "아니오";
  }

  if (typeof value === "number") {
    if (key === "opacity" || key === "size") {
      return `${value}%`;
    }

    return String(value);
  }

  if (typeof value === "string") {
    switch (key) {
      case "categoryAlignment":
      case "titleAlignment":
      case "subtitleAlignment":
      case "bodyAlignment":
        return value === "left" ? "왼쪽" : value === "center" ? "가운데" : "오른쪽";
    }
  }

  return value ?? "";
}

function inferOperationField(
  operation: ChatEditOperation,
): ChatEditTargetField | undefined {
  if (operation.targetField) {
    return operation.targetField;
  }

  for (const field of CHAT_EDIT_TARGET_FIELDS) {
    if (operation.changes?.[field] !== undefined) {
      return field;
    }

    if (
      CHAT_EDIT_FIELD_STYLE_CHANGE_KEYS[field].some(
        (key) => operation.changes?.[key] !== undefined,
      )
    ) {
      return field;
    }
  }

  return undefined;
}

function buildRenderTarget(operation: ChatEditOperation): string {
  const parts = [formatSlideRef(operation.slideRef)];
  const inferredField = inferOperationField(operation);
  if (inferredField) {
    parts.push(CHAT_EDIT_FIELD_LABELS[inferredField]);
  }

  return parts.join(" · ");
}

export function getAllowedChatEditChangeKeysForOperation(
  type: ChatEditOperationType,
  policy: ChatEditNormalizationPolicy,
): readonly (keyof ChatEditOperationChanges)[] {
  switch (type) {
    case "update_content":
      return policy.scope === "selected_text" && policy.selectedField
        ? [policy.selectedField]
        : CHAT_EDIT_CONTENT_CHANGE_KEYS;
    case "update_style":
      return policy.scope === "selected_text" && policy.selectedField
        ? CHAT_EDIT_FIELD_STYLE_CHANGE_KEYS[policy.selectedField]
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

export function sanitizeChatEditText(
  value: string | null | undefined,
  maxLength = 280,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (normalized.length === 0) {
    return undefined;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getChatEditScopeLabel(scope: ChatEditScope): string {
  return CHAT_EDIT_SCOPE_LABELS[scope];
}

export function getChatEditOperationLabel(
  operationType: ChatEditOperationType,
): string {
  return CHAT_EDIT_OPERATION_LABELS[operationType];
}

export function normalizeChatEditPlanResponse(
  value: unknown,
  policy: ChatEditNormalizationPolicy,
): ChatEditPlanResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const summary = sanitizeChatEditText(readString(value, "summary"), 320);
  const scope = readEnum(value, "scope", CHAT_EDIT_SCOPES);
  const metadata = normalizeMetadata(value.metadata);
  if (!summary || !scope || scope !== policy.scope || !metadata) {
    return null;
  }

  if (!Array.isArray(value.operations)) {
    return null;
  }

  const seenFingerprints = new Set<string>();
  const operations = value.operations
    .map((operation) => normalizeOperation(operation, policy))
    .filter((operation): operation is ChatEditOperation => {
      if (operation === null) {
        return false;
      }

      const fingerprint = buildOperationFingerprint(operation);
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
    policy.scope === "selected_text" &&
    !operations.some((operation) => operationTouchesSelectedField(operation, policy))
  ) {
    return null;
  }

  return {
    summary,
    scope,
    warnings: normalizeStringList(value.warnings, 180, 8),
    operations,
    metadata,
  };
}

export function buildChatEditPlanRenderModel(
  plan: ChatEditPlanResponse,
): ChatEditRenderModel {
  return {
    summary: sanitizeChatEditText(plan.summary, 320) ?? "AI 편집 계획이 준비되었습니다.",
    scopeLabel: getChatEditScopeLabel(plan.scope),
    warnings: plan.warnings
      .map((warning) => sanitizeChatEditText(warning, 180))
      .filter((warning): warning is string => warning !== undefined),
    operations: plan.operations.map((operation, index) => {
      const changeEntries = CHANGE_RENDER_ORDER
        .filter((key) => operation.changes?.[key] !== undefined)
        .map((key) => ({
          label: CHAT_EDIT_CHANGE_KEY_LABELS[key],
          value: formatChangeValue(key, operation.changes?.[key]),
        }))
        .filter((entry) => entry.value.length > 0);

      if (operation.layoutId) {
        changeEntries.unshift({
          label: "레이아웃",
          value: CHAT_EDIT_LAYOUT_LABELS[operation.layoutId] ?? operation.layoutId,
        });
      }

      return {
        key: `${operation.type}-${operation.slideRef}-${index}`,
        title: getChatEditOperationLabel(operation.type),
        target: buildRenderTarget(operation),
        changes: changeEntries,
        reason: sanitizeChatEditText(operation.reason, 240),
      };
    }),
    metadataLabel: `${plan.metadata.model} · ${plan.metadata.promptVersion}`,
  };
}
