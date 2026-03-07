"use client";

import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Redo2,
  Sparkles,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { AIChatPanel, type AIChatMessage, type AIChatScope } from "@/components/editor/AIChatPanel";
import { AIChatDecisionDialog } from "@/components/editor/AIChatDecisionDialog";
import EditorPanel from "@/components/editor/EditorPanel";
import PhoneMockup from "@/components/preview/PhoneMockup";
import InstagramFrame from "@/components/preview/InstagramFrame";
import SwipeCarousel from "@/components/preview/SwipeCarousel";
import ExportButton from "@/components/export/ExportButton";
import InlineEditLayer from "@/components/preview/InlineEditLayer";
import { getLayoutTextAlign } from "@/data/layouts";
import {
  ASSET_AUTOSAVE_DELAY_MS,
  type AutosaveStatus,
  CONTENT_AUTOSAVE_DELAY_MS,
  STYLE_AUTOSAVE_DELAY_MS,
} from "@/lib/autosave";
import {
  BASE_SLIDE_HEIGHT,
  BASE_SLIDE_WIDTH,
  baseRectFromPoints,
  clientPointToBasePoint,
  clampDeltaToBounds,
  getBoundingRect,
  getOverlayItemId,
  getTextItemId,
  isOverlayItemId,
  isTextItemId,
  measureCanvasItems,
  rectsIntersect,
  screenDeltaToBaseDelta,
  type BaseRect,
  type CanvasItemId,
  type LayoutPaddingGuides,
  type MeasuredCanvasItem,
} from "@/lib/editorGeometry";
import { getSnapResult, type SnapGuide } from "@/lib/editorSnap";
import {
  areEditableSlideSnapshotsEqual,
  canCoalesceHistoryEntry,
  cloneEditableSlideSnapshots,
  createHistoryEntryFromSnapshots,
  limitUndoStack,
  mergeHistoryEntries,
  toEditableSnapshotImage,
  toEditableSlideSnapshot,
  type EditableSlideImage,
  type EditableSlideSnapshot,
  type EditorHistoryEntry,
  type EditorHistorySource,
} from "@/lib/editorHistory";
import {
  buildChatEditPlanRenderModel,
  normalizeChatEditPlanResponse,
  type PendingChatEdit,
} from "@/lib/chatEdit";
import { buildChatEditPreviewResult } from "@/lib/chatEditPreview";
import type {
  CardSlide,
  EditableTextField,
  SlideContent,
  SlideImage,
  SlideStyle,
  TextAlignment,
  TextAlignments,
  TextPosition,
} from "@/types";
import { getFontByFamily, getFontById } from "@/data/fonts";

const DEFAULT_STYLE: SlideStyle = {
  bgType: "solid",
  bgColor: "#0f0f0f",
  textColor: "#ffffff",
  accentColor: "#4ae3c0",
  fontFamily: "'Noto Sans KR', sans-serif",
};

const DEFAULT_PADDING_GUIDES: LayoutPaddingGuides = {
  top: 60,
  right: 60,
  bottom: 60,
  left: 60,
};

const HISTORY_STACK_LIMIT = 50;
const CONTENT_HISTORY_COALESCE_MS = CONTENT_AUTOSAVE_DELAY_MS;
const STYLE_HISTORY_COALESCE_MS = STYLE_AUTOSAVE_DELAY_MS;
const ASSET_HISTORY_COALESCE_MS = ASSET_AUTOSAVE_DELAY_MS;

const BLOCK_ALIGN_ACTIONS = [
  { command: "left", label: "좌측 정렬", icon: AlignStartVertical },
  { command: "center-x", label: "가로 중앙 정렬", icon: AlignCenterVertical },
  { command: "right", label: "우측 정렬", icon: AlignEndVertical },
  { command: "top", label: "상단 정렬", icon: AlignStartHorizontal },
  { command: "center-y", label: "세로 중앙 정렬", icon: AlignCenterHorizontal },
  { command: "bottom", label: "하단 정렬", icon: AlignEndHorizontal },
] as const;

const TEXT_ALIGN_ACTIONS = [
  { alignment: "left", label: "텍스트 왼쪽 정렬", icon: AlignLeft },
  { alignment: "center", label: "텍스트 가운데 정렬", icon: AlignCenter },
  { alignment: "right", label: "텍스트 오른쪽 정렬", icon: AlignRight },
] as const;

const AI_CHAT_SCOPE_LABELS: Record<AIChatScope, string> = {
  selected_text: "선택 텍스트",
  current_slide: "현재 슬라이드",
  all_slides: "전체 슬라이드",
};

interface ChatEditSubmitContext {
  scope: AIChatScope;
  selectedField: EditableTextField | null;
}

const EDITABLE_TEXT_FIELD_LABELS: Record<EditableTextField, string> = {
  category: "카테고리",
  title: "제목",
  subtitle: "부제",
  body: "본문",
};

type Overlay = NonNullable<CardSlide["overlays"]>[number];
type AlignCommand = (typeof BLOCK_ALIGN_ACTIONS)[number]["command"];
type TextAlignCommand = (typeof TEXT_ALIGN_ACTIONS)[number]["alignment"];
type SaveSource =
  | "content"
  | "style"
  | "layout"
  | "overlay"
  | "image"
  | "history"
  | "editor-panel-style";

interface DragSession {
  selectedIds: CanvasItemId[];
  startClientX: number;
  startClientY: number;
  slideRect: DOMRect;
  padding: LayoutPaddingGuides;
  initialRects: Record<CanvasItemId, BaseRect>;
  initialTextPositions: Partial<Record<EditableTextField, TextPosition>>;
  initialOverlays: Overlay[];
  selectionBounds: BaseRect;
}

interface MarqueeSession {
  startPoint: { x: number; y: number };
  slideRect: DOMRect;
  additive: boolean;
  initialSelection: CanvasItemId[];
  dragged: boolean;
}

interface PreviewNavButtonProps {
  direction: "previous" | "next";
  onClick: () => void;
}

interface ChatImageSearchResult {
  attribution: string;
  downloadUrl?: string;
  height: number;
  id: string;
  photographerName: string;
  photographerUrl: string;
  source: "unsplash" | "pexels";
  thumbUrl: string;
  url: string;
  width: number;
}

function toEditorSlideImage(
  image: Doc<"slides">["image"] | null | undefined,
): SlideImage | undefined {
  if (!image) {
    return undefined;
  }

  return {
    url: image.externalUrl ?? "",
    opacity: image.opacity,
    position: { ...image.position },
    size: image.size,
    fit: image.fit,
  };
}

function PreviewNavButton({ direction, onClick }: PreviewNavButtonProps) {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrevious ? "이전 슬라이드" : "다음 슬라이드"}
      title={isPrevious ? "이전 슬라이드" : "다음 슬라이드"}
      className={`absolute top-1/2 z-20 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/92 text-foreground shadow-xl backdrop-blur transition-all hover:scale-[1.03] hover:bg-background hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 md:flex ${
        isPrevious ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"
      }`}
    >
      <Icon size={28} strokeWidth={2.2} />
    </button>
  );
}

interface ToolbarIconButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  isActive?: boolean;
}

function ToolbarIconButton({
  label,
  icon: Icon,
  onClick,
  isActive = false,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
        isActive
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      <Icon size={15} strokeWidth={2} />
    </button>
  );
}

const SAVE_STATUS_META: Record<
  AutosaveStatus,
  { label: string; className: string; dotClassName: string }
> = {
  saving: {
    label: "저장 중…",
    className: "border-stone-200 bg-stone-100/80 text-stone-600",
    dotClassName: "bg-stone-400 animate-pulse",
  },
  saved: {
    label: "저장됨",
    className: "border-zinc-200 bg-zinc-100/80 text-zinc-700",
    dotClassName: "bg-zinc-500",
  },
  error: {
    label: "저장 실패",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dotClassName: "bg-rose-500",
  },
};

function mapConvexSlide(slide: Doc<"slides">): CardSlide {
  const mappedFontId =
    getFontByFamily(slide.style?.fontFamily ?? "")?.id ?? "pretendard";

  return {
    id: slide._id,
    order: slide.order,
    type: slide.type,
    layoutId: slide.layoutId,
    colorPreset: slide.style?.bgType === "gradient" ? "custom-gradient" : "dark",
    content: slide.content,
    style: slide.style,
    fontFamily: mappedFontId,
    image: toEditorSlideImage(slide.image),
    overlays: slide.overlays?.map((overlay) => ({
      assetId: overlay.assetId,
      x: overlay.x,
      y: overlay.y,
      width: overlay.width,
      opacity: overlay.opacity,
    })),
    htmlContent: "",
  };
}

function buildStyleWithTextAlignments(
  currentStyle: SlideStyle,
  layoutId: string | undefined,
  updates: Partial<TextAlignments>
): SlideStyle {
  const defaultAlignment = getLayoutTextAlign(layoutId);
  const nextAlignments = { ...(currentStyle.textAlignments ?? {}) };

  for (const [field, alignment] of Object.entries(updates) as [
    EditableTextField,
    TextAlignment | undefined,
  ][]) {
    if (!alignment || alignment === defaultAlignment) {
      delete nextAlignments[field];
      continue;
    }

    nextAlignments[field] = alignment;
  }

  if (Object.keys(nextAlignments).length === 0) {
    const { textAlignments, ...rest } = currentStyle;
    void textAlignments;
    return { ...rest };
  }

  return {
    ...currentStyle,
    textAlignments: nextAlignments,
  };
}

function getResolvedTextAlignment(
  currentStyle: SlideStyle,
  layoutId: string | undefined,
  field: EditableTextField
): TextAlignment {
  return currentStyle.textAlignments?.[field] ?? getLayoutTextAlign(layoutId);
}

function formatAssistantReply(pendingChatEdit: PendingChatEdit): string {
  const renderModel = buildChatEditPlanRenderModel(pendingChatEdit);
  const summaryLines = renderModel.operations.slice(0, 4).map((operation) => {
    const firstChange = operation.changes[0];
    return firstChange
      ? `- ${operation.target}: ${firstChange.label} ${firstChange.value}`
      : `- ${operation.target}: ${operation.title}`;
  });

  const baseMessage = [
    pendingChatEdit.summary,
    "",
    `변경 요약 (${pendingChatEdit.operations.length}개)`,
    ...summaryLines,
    pendingChatEdit.operations.length > 4
      ? `- 외 ${pendingChatEdit.operations.length - 4}개 변경`
      : undefined,
    "",
    "적용 여부를 팝업에서 바로 확인해 주세요.",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");

  if (pendingChatEdit.warnings.length === 0) {
    return baseMessage;
  }

  return `${baseMessage}\n\n주의사항\n- ${pendingChatEdit.warnings.join("\n- ")}`;
}

function extractChatPlannerErrorTokens(error: unknown): string[] {
  const tokens = new Set<string>();

  if (error instanceof Error) {
    tokens.add(error.message);
  } else {
    tokens.add(String(error));
  }

  const errorData =
    typeof error === "object" && error !== null && "data" in error
      ? error.data
      : undefined;

  if (typeof errorData === "string") {
    tokens.add(errorData);
  } else if (typeof errorData === "object" && errorData !== null) {
    const code =
      "code" in errorData && typeof errorData.code === "string" ? errorData.code : null;
    const message =
      "message" in errorData && typeof errorData.message === "string"
        ? errorData.message
        : null;

    if (code) {
      tokens.add(code);
    }

    if (message) {
      tokens.add(message);
    }
  }

  return Array.from(tokens);
}

function formatChatPlannerError(error: unknown): string {
  const errorTokens = extractChatPlannerErrorTokens(error);
  const hasErrorToken = (needle: string): boolean =>
    errorTokens.some((token) => token.includes(needle));

  if (hasErrorToken("API_KEY_REQUIRED")) {
    return "AI 편집을 사용하려면 설정에서 Gemini API 키를 먼저 저장해 주세요.";
  }

  if (hasErrorToken("API_KEY_INVALID")) {
    return "저장된 Gemini API 키를 확인해 주세요. 현재 키로는 편집 계획을 생성할 수 없어요.";
  }

  if (hasErrorToken("SELECTED_FIELD_REQUIRED")) {
    return "선택 텍스트 범위를 사용하려면 제목·부제·본문·카테고리 중 하나를 먼저 선택해 주세요.";
  }

  if (hasErrorToken("INSTRUCTION_REQUIRED")) {
    return "어떤 변경을 원하는지 한 문장 이상 입력해 주세요.";
  }

  if (hasErrorToken("AI_EDIT_PLAN_FAILED")) {
    return "AI가 안전한 편집 계획을 만들지 못했어요. 표현을 조금 더 구체적으로 바꿔 다시 시도해 주세요.";
  }

  if (hasErrorToken("AI_CHAT_PLAN_INVALID")) {
    return "AI 응답을 편집 계획으로 해석하지 못했어요. 정렬이나 레이아웃처럼 원하는 결과를 조금 더 구체적으로 적어 주세요.";
  }

  return "AI 편집 계획을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function buildMutationImage(
  image: EditableSlideImage | undefined,
): Doc<"slides">["image"] | undefined {
  if (!image) {
    return undefined;
  }

  return {
    ...(image.storageId ? { storageId: image.storageId } : {}),
    ...(image.externalUrl ? { externalUrl: image.externalUrl } : {}),
    opacity: image.opacity,
    position: { ...image.position },
    size: image.size,
    fit: image.fit,
  };
}

function buildSnapshotMutationImage(
  snapshot: EditableSlideSnapshot,
): {
  clearImage?: boolean;
  image?: NonNullable<Doc<"slides">["image"]>;
} {
  if (!snapshot.image) {
    return { clearImage: true };
  }

  return {
    image: buildMutationImage(snapshot.image),
  };
}

function buildEditableSlideSnapshot(
  slide: Doc<"slides">,
  overrides: {
    content?: SlideContent;
    style?: SlideStyle;
    layoutId?: string;
    overlays?: Overlay[];
    image?: EditableSlideImage | null;
  } = {},
): EditableSlideSnapshot {
  const nextStyle = overrides.style ?? slide.style ?? DEFAULT_STYLE;

  return toEditableSlideSnapshot(
    {
      id: slide._id,
      order: slide.order,
      type: slide.type,
      layoutId: overrides.layoutId ?? slide.layoutId,
      colorPreset: nextStyle.bgType === "gradient" ? "custom-gradient" : "dark",
      content: overrides.content ?? slide.content ?? { title: "" },
      style: nextStyle,
      fontFamily: getFontByFamily(nextStyle.fontFamily)?.id ?? "pretendard",
      image: toEditorSlideImage(
        overrides.image === null ? undefined : (overrides.image ?? slide.image)
      ),
      overlays:
        overrides.overlays ??
        slide.overlays?.map((overlay) => ({
          assetId: overlay.assetId,
          x: overlay.x,
          y: overlay.y,
          width: overlay.width,
          opacity: overlay.opacity,
        })) ??
        [],
      htmlContent: "",
    },
    {
      baseImage: overrides.image === null ? undefined : (overrides.image ?? slide.image),
    },
  );
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest("input, textarea, [contenteditable='true']"));
}

function pickBestChatImageResult(
  results: ChatImageSearchResult[],
): ChatImageSearchResult | null {
  if (results.length === 0) {
    return null;
  }

  const targetAspectRatio = BASE_SLIDE_WIDTH / BASE_SLIDE_HEIGHT;

  return [...results].sort((left, right) => {
    const leftAspectPenalty = Math.abs(left.width / left.height - targetAspectRatio);
    const rightAspectPenalty = Math.abs(right.width / right.height - targetAspectRatio);
    const leftResolution = Math.min(left.width, left.height);
    const rightResolution = Math.min(right.width, right.height);

    if (leftAspectPenalty !== rightAspectPenalty) {
      return leftAspectPenalty - rightAspectPenalty;
    }

    return rightResolution - leftResolution;
  })[0] ?? null;
}

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const allSlideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const marqueeSessionRef = useRef<MarqueeSession | null>(null);
  const initializedSlideIdRef = useRef<string | null>(null);
  const slideTopologySignatureRef = useRef<string | null>(null);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [localContentSlideId, setLocalContentSlideId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<CanvasItemId[]>([]);
  const [editingTextField, setEditingTextField] = useState<EditableTextField | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<BaseRect | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("saved");
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [showGuideOverlay, setShowGuideOverlay] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [cardWidth, setCardWidth] = useState(324);
  const [isDesktopCanvas, setIsDesktopCanvas] = useState(false);
  const [measuredItems, setMeasuredItems] = useState<MeasuredCanvasItem[]>([]);
  const [guidePadding, setGuidePadding] = useState<LayoutPaddingGuides>(DEFAULT_PADDING_GUIDES);
  const [activeSlideElement, setActiveSlideElement] = useState<HTMLDivElement | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [chatScope, setChatScope] = useState<AIChatScope>("current_slide");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [isPlanningEdit, setIsPlanningEdit] = useState(false);
  const [isApplyingChatEdit, setIsApplyingChatEdit] = useState(false);
  const [isReplayingHistory, setIsReplayingHistory] = useState(false);
  const [pendingChatEdit, setPendingChatEdit] = useState<PendingChatEdit | null>(null);
  const [pendingReplaySync, setPendingReplaySync] = useState<EditableSlideSnapshot[] | null>(null);

  const [localContent, setLocalContent] = useState<SlideContent | null>(null);
  const [localStyle, setLocalStyle] = useState<SlideStyle | null>(null);
  const [localLayoutId, setLocalLayoutId] = useState<string | null>(null);
  const [localOverlays, setLocalOverlays] = useState<Overlay[] | null>(null);
  const [localImage, setLocalImage] = useState<EditableSlideImage | null | undefined>(undefined);
  const [undoStack, setUndoStack] = useState<EditorHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<EditorHistoryEntry[]>([]);

  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stylePendingRef = useRef(false);
  const overlayPendingRef = useRef(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const imagePendingRef = useRef(false);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const styleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeSaveSourcesRef = useRef<Set<SaveSource>>(new Set());
  const historyReplayRef = useRef(false);

  const projectId = params.id as Id<"projects">;
  const project = useQuery(api.projects.getProject, { projectId });
  const slides = useQuery(api.slides.getSlides, { projectId });
  const assetsQuery = useQuery(api.userAssets.listAssets);

  const resolvedOverlayUrls = useMemo(() => {
    const assets = assetsQuery ?? [];
    const map: Record<string, { url: string; name: string }> = {};
    for (const asset of assets) {
      if (asset.url) {
        map[asset._id] = { url: asset.url, name: asset.name };
      }
    }
    return map;
  }, [assetsQuery]);

  const updateSlideMutation = useMutation(api.slides.updateSlide);
  const updateStyleMutation = useMutation(api.slides.updateSlideStyle);
  const updateImageMutation = useMutation(api.slides.updateSlideImage);
  const updateLayoutMutation = useMutation(api.slides.updateSlideLayout);
  const applySlideSnapshotsMutation = useMutation(api.slides.applySlideSnapshots);
  const updateOverlaysMutation = useMutation(api.slides.updateSlideOverlays);
  const planChatEditAction = useAction(api.actions.chatEdit.planChatEdit);
  const improveSlideAction = useAction(api.actions.generate.improveSlide);
  const searchImagesAction = useAction(api.actions.images.searchImages);
  const triggerUnsplashDownloadAction = useAction(
    api.actions.images.triggerUnsplashDownload,
  );

  const safeIndex = slides ? Math.min(currentSlideIndex, Math.max(0, slides.length - 1)) : 0;
  const convexSlide = slides?.[safeIndex];

  const getCurrentStyle = useCallback((): SlideStyle => {
    return localStyle ?? (convexSlide?.style as SlideStyle | undefined) ?? DEFAULT_STYLE;
  }, [convexSlide, localStyle]);

  const getCurrentOverlays = useCallback((): Overlay[] => {
    return localOverlays ?? (convexSlide?.overlays as Overlay[] | undefined) ?? [];
  }, [convexSlide, localOverlays]);

  const getCurrentLayoutId = useCallback((): string => {
    return localLayoutId ?? convexSlide?.layoutId ?? "center-left";
  }, [convexSlide, localLayoutId]);

  const getCurrentPersistedImage = useCallback((): EditableSlideImage | undefined => {
    if (localImage !== undefined) {
      return localImage ?? undefined;
    }

    return convexSlide?.image ?? undefined;
  }, [convexSlide, localImage]);

  const invalidateHistoryStacks = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const markSaveSourcePending = useCallback((source: SaveSource) => {
    activeSaveSourcesRef.current.add(source);
    setAutosaveStatus("saving");
  }, []);

  const finalizeSaveSource = useCallback((source: SaveSource, status: "saved" | "error") => {
    activeSaveSourcesRef.current.delete(source);
    setAutosaveStatus((currentStatus) => {
      if (status === "error") return "error";
      if (activeSaveSourcesRef.current.size > 0) return currentStatus === "error" ? "error" : "saving";
      return currentStatus === "error" ? "error" : "saved";
    });
  }, []);

  const handleEditorPanelStyleAutosaveStatusChange = useCallback((status: AutosaveStatus) => {
    if (status === "saving") {
      markSaveSourcePending("editor-panel-style");
      return;
    }

    finalizeSaveSource("editor-panel-style", status);
  }, [finalizeSaveSource, markSaveSourcePending]);

  const clearSelection = useCallback(() => {
    dragSessionRef.current = null;
    marqueeSessionRef.current = null;
    setSelectedItemIds([]);
    setEditingTextField(null);
    setMarqueeRect(null);
    setSnapGuides([]);
    setIsDraggingSelection(false);
  }, []);

  const refreshMeasurements = useCallback(() => {
    const slideElement = allSlideRefs.current[safeIndex] ?? null;
    if (!slideElement || typeof window === "undefined") {
      setMeasuredItems([]);
      setGuidePadding(DEFAULT_PADDING_GUIDES);
      setActiveSlideElement(null);
      return;
    }

    const measured = measureCanvasItems(slideElement);
    setMeasuredItems(measured.items);
    setGuidePadding(measured.padding);
    setActiveSlideElement(slideElement);
  }, [safeIndex]);

  const getWorkingSlidesSnapshot = useCallback((): EditableSlideSnapshot[] => {
    if (!slides || !convexSlide) {
      return [];
    }

    const isLocalContentFresh = localContentSlideId === convexSlide._id;
    return slides.map((slide, index) => {
      if (index !== safeIndex) {
        return buildEditableSlideSnapshot(slide);
      }

      return buildEditableSlideSnapshot(slide, {
        layoutId: localLayoutId ?? slide.layoutId,
        content: (isLocalContentFresh ? localContent : null) ?? slide.content ?? { title: "" },
        style: localStyle ?? slide.style ?? DEFAULT_STYLE,
        overlays: localOverlays ?? (slide.overlays as Overlay[] | undefined) ?? [],
        image: localImage !== undefined ? localImage : undefined,
      });
    });
  }, [
    convexSlide,
    localContent,
    localContentSlideId,
    localImage,
    localLayoutId,
    localOverlays,
    localStyle,
    safeIndex,
    slides,
  ]);

  const pushHistoryEntry = useCallback(
    (entry: EditorHistoryEntry, maxAgeMs: number) => {
      setUndoStack((current) => {
        const previous = current[current.length - 1];
        const nextStack = canCoalesceHistoryEntry(previous, entry, maxAgeMs)
          ? [...current.slice(0, -1), mergeHistoryEntries(previous, entry)]
          : [...current, entry];

        return limitUndoStack(nextStack, HISTORY_STACK_LIMIT);
      });
      setRedoStack([]);
    },
    []
  );

  const applySnapshotToActiveSlide = useCallback(
    (snapshot: EditableSlideSnapshot) => {
      setLocalContent(snapshot.content);
      setLocalContentSlideId(snapshot.slideId);
      setLocalStyle(snapshot.style);
      setLocalLayoutId(snapshot.layoutId);
      setLocalOverlays(snapshot.overlays);
      setLocalImage(snapshot.image ?? null);
    },
    []
  );

  const recordHistoryChange = useCallback(
    (
      afterSnapshots: EditableSlideSnapshot[],
      source: EditorHistorySource,
      coalescingKey: string | undefined,
      maxAgeMs: number,
      focusSlideId: CardSlide["id"] | null,
    ) => {
      if (historyReplayRef.current) {
        return;
      }

      const entry = createHistoryEntryFromSnapshots({
        afterSlides: cloneEditableSlideSnapshots(afterSnapshots),
        beforeSlides: getWorkingSlidesSnapshot(),
        coalescingKey,
        focusSlideId,
        source,
      });

      if (!entry) {
        return;
      }

      pushHistoryEntry(entry, maxAgeMs);
    },
    [getWorkingSlidesSnapshot, pushHistoryEntry]
  );

  const scheduleStylePersist = useCallback(
    (nextStyle: SlideStyle) => {
      if (!convexSlide || historyReplayRef.current) return;

      recordHistoryChange(
        getWorkingSlidesSnapshot().map((slideSnapshot) =>
          slideSnapshot.slideId === convexSlide._id
            ? { ...slideSnapshot, style: nextStyle, layoutId: getCurrentLayoutId() }
            : slideSnapshot
        ),
        "manual",
        `style:${convexSlide._id}`,
        STYLE_HISTORY_COALESCE_MS,
        convexSlide._id
      );

      setLocalStyle(nextStyle);
      if (!stylePendingRef.current) {
        markSaveSourcePending("style");
      }
      stylePendingRef.current = true;
      if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
      styleTimerRef.current = setTimeout(() => {
        void (async () => {
          let wasSuccessful = false;

          try {
            await updateStyleMutation({
              slideId: convexSlide._id as Id<"slides">,
              style: nextStyle,
            });
            wasSuccessful = true;
          } catch (error) {
            console.error("Failed to autosave slide style", error);
          } finally {
            stylePendingRef.current = false;
            finalizeSaveSource("style", wasSuccessful ? "saved" : "error");
          }
        })();
      }, STYLE_AUTOSAVE_DELAY_MS);
    },
    [
      convexSlide,
      finalizeSaveSource,
      getCurrentLayoutId,
      getWorkingSlidesSnapshot,
      markSaveSourcePending,
      recordHistoryChange,
      updateStyleMutation,
    ]
  );

  const scheduleLayoutPersist = useCallback(
    async (nextLayoutId: string): Promise<void> => {
      if (!convexSlide || historyReplayRef.current) return;

      recordHistoryChange(
        getWorkingSlidesSnapshot().map((slideSnapshot) =>
          slideSnapshot.slideId === convexSlide._id
            ? { ...slideSnapshot, layoutId: nextLayoutId }
            : slideSnapshot
        ),
        "manual",
        `layout:${convexSlide._id}`,
        STYLE_HISTORY_COALESCE_MS,
        convexSlide._id
      );

      setLocalLayoutId(nextLayoutId);
      markSaveSourcePending("layout");

      try {
        await updateLayoutMutation({
          slideId: convexSlide._id as Id<"slides">,
          layoutId: nextLayoutId,
        });
        finalizeSaveSource("layout", "saved");
      } catch (error) {
        console.error("Failed to autosave slide layout", error);
        finalizeSaveSource("layout", "error");
      }
    },
    [
      convexSlide,
      finalizeSaveSource,
      getWorkingSlidesSnapshot,
      markSaveSourcePending,
      recordHistoryChange,
      updateLayoutMutation,
    ]
  );

  const scheduleOverlayPersist = useCallback(
    (nextOverlays: Overlay[]) => {
      if (!convexSlide || historyReplayRef.current) return;

      recordHistoryChange(
        getWorkingSlidesSnapshot().map((slideSnapshot) =>
          slideSnapshot.slideId === convexSlide._id
            ? { ...slideSnapshot, overlays: nextOverlays, layoutId: getCurrentLayoutId() }
            : slideSnapshot
        ),
        "manual",
        `overlay:${convexSlide._id}`,
        ASSET_HISTORY_COALESCE_MS,
        convexSlide._id
      );

      setLocalOverlays(nextOverlays);
      if (!overlayPendingRef.current) {
        markSaveSourcePending("overlay");
      }
      overlayPendingRef.current = true;
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = setTimeout(() => {
        void (async () => {
          let wasSuccessful = false;

          try {
            await updateOverlaysMutation({
              slideId: convexSlide._id as Id<"slides">,
              overlays: nextOverlays as Parameters<typeof updateOverlaysMutation>[0]["overlays"],
            });
            wasSuccessful = true;
          } catch (error) {
            console.error("Failed to autosave overlays", error);
          } finally {
            overlayPendingRef.current = false;
            finalizeSaveSource("overlay", wasSuccessful ? "saved" : "error");
          }
        })();
      }, ASSET_AUTOSAVE_DELAY_MS);
    },
    [
      convexSlide,
      finalizeSaveSource,
      getCurrentLayoutId,
      getWorkingSlidesSnapshot,
      markSaveSourcePending,
      recordHistoryChange,
      updateOverlaysMutation,
    ]
  );

  const handleContentChange = useCallback(
    (content: SlideContent) => {
      if (historyReplayRef.current) {
        return;
      }

      if (convexSlide) {
        recordHistoryChange(
          getWorkingSlidesSnapshot().map((slideSnapshot) =>
            slideSnapshot.slideId === convexSlide._id
              ? { ...slideSnapshot, content, layoutId: getCurrentLayoutId() }
              : slideSnapshot
          ),
          "manual",
          `content:${convexSlide._id}`,
          CONTENT_HISTORY_COALESCE_MS,
          convexSlide._id
        );
      }

      setLocalContent(content);
      if (!pendingRef.current) {
        markSaveSourcePending("content");
      }
      pendingRef.current = true;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void (async () => {
          if (!convexSlide) return;
          let wasSuccessful = false;

          try {
            await updateSlideMutation({
              slideId: convexSlide._id as Id<"slides">,
              content: {
                title: content.title ?? "",
                category: content.category,
                subtitle: content.subtitle,
                body: content.body,
                source: content.source,
              },
            });
            wasSuccessful = true;
          } catch (error) {
            console.error("Failed to autosave slide content", error);
          } finally {
            pendingRef.current = false;
            finalizeSaveSource("content", wasSuccessful ? "saved" : "error");
          }
        })();
      }, CONTENT_AUTOSAVE_DELAY_MS);
    },
    [
      convexSlide,
      finalizeSaveSource,
      getCurrentLayoutId,
      getWorkingSlidesSnapshot,
      markSaveSourcePending,
      recordHistoryChange,
      updateSlideMutation,
    ]
  );

  const handleImageChange = useCallback(
    (image: SlideImage | undefined) => {
      if (!convexSlide || historyReplayRef.current) {
        return;
      }

      const nextPersistedImage = toEditableSnapshotImage(
        image,
        getCurrentPersistedImage(),
      );

      recordHistoryChange(
        getWorkingSlidesSnapshot().map((slideSnapshot) =>
          slideSnapshot.slideId === convexSlide._id
            ? {
                ...slideSnapshot,
                image: nextPersistedImage,
                layoutId: getCurrentLayoutId(),
              }
            : slideSnapshot
        ),
        "manual",
        `image:${convexSlide._id}`,
        ASSET_HISTORY_COALESCE_MS,
        convexSlide._id
      );

      setLocalImage(nextPersistedImage ?? null);
      if (!imagePendingRef.current) {
        markSaveSourcePending("image");
      }
      imagePendingRef.current = true;
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
      imageTimerRef.current = setTimeout(() => {
        void (async () => {
          let wasSuccessful = false;

          try {
            await updateImageMutation({
              slideId: convexSlide._id as Id<"slides">,
              image: buildMutationImage(nextPersistedImage),
            });
            wasSuccessful = true;
          } catch (error) {
            console.error("Failed to autosave slide image", error);
          } finally {
            imagePendingRef.current = false;
            finalizeSaveSource("image", wasSuccessful ? "saved" : "error");
          }
        })();
      }, ASSET_AUTOSAVE_DELAY_MS);
    },
    [
      convexSlide,
      finalizeSaveSource,
      getCurrentPersistedImage,
      getCurrentLayoutId,
      getWorkingSlidesSnapshot,
      markSaveSourcePending,
      recordHistoryChange,
      updateImageMutation,
    ]
  );

  useEffect(() => {
    if (pendingRef.current || !convexSlide || isReplayingHistory) return;

    const rafId = window.requestAnimationFrame(() => {
      setLocalContent(convexSlide.content ?? { title: "" });
      setLocalContentSlideId(convexSlide._id);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [convexSlide?.content, convexSlide, isReplayingHistory]);

  useEffect(() => {
    if (stylePendingRef.current || !convexSlide || isReplayingHistory) return;

    const rafId = window.requestAnimationFrame(() => {
      setLocalStyle((convexSlide.style as SlideStyle | undefined) ?? DEFAULT_STYLE);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [convexSlide?.style, convexSlide, isReplayingHistory]);

  useEffect(() => {
    if (stylePendingRef.current || !convexSlide || isReplayingHistory) return;

    const rafId = window.requestAnimationFrame(() => {
      setLocalLayoutId(convexSlide.layoutId);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [convexSlide?.layoutId, convexSlide, isReplayingHistory]);

  useEffect(() => {
    if (overlayPendingRef.current || !convexSlide || isReplayingHistory) return;

    const rafId = window.requestAnimationFrame(() => {
      setLocalOverlays((convexSlide.overlays as Overlay[] | undefined) ?? []);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [convexSlide?.overlays, convexSlide, isReplayingHistory]);

  useEffect(() => {
    if (imagePendingRef.current || !convexSlide || isReplayingHistory) return;

    const rafId = window.requestAnimationFrame(() => {
      setLocalImage(buildMutationImage(convexSlide.image) ?? null);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [convexSlide?.image, convexSlide, isReplayingHistory]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
      if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isReplayingHistory) {
      return;
    }

    if (!convexSlide) {
      initializedSlideIdRef.current = null;
      activeSaveSourcesRef.current.clear();
      setAutosaveStatus("saved");
      return;
    }
    if (initializedSlideIdRef.current === convexSlide._id) return;

    initializedSlideIdRef.current = convexSlide._id;
    activeSaveSourcesRef.current.clear();
    setAutosaveStatus("saved");

    pendingRef.current = false;
    stylePendingRef.current = false;
    overlayPendingRef.current = false;
    imagePendingRef.current = false;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
    if (styleTimerRef.current) clearTimeout(styleTimerRef.current);

    const rafId = window.requestAnimationFrame(() => {
      setLocalContent(convexSlide.content ?? { title: "" });
      setLocalStyle((convexSlide.style as SlideStyle | undefined) ?? DEFAULT_STYLE);
      setLocalLayoutId(convexSlide.layoutId);
      setLocalOverlays((convexSlide.overlays as Overlay[] | undefined) ?? []);
      setLocalImage(buildMutationImage(convexSlide.image) ?? null);
      clearSelection();
      setLocalContentSlideId(convexSlide._id);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [clearSelection, convexSlide, isReplayingHistory]);

  const goToSlide = useCallback(
    (index: number) => {
      if (!slides) return;
      setCurrentSlideIndex(Math.max(0, Math.min(index, slides.length - 1)));
    },
    [slides]
  );

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 768;
      setIsDesktopCanvas(!isMobile);

      if (isMobile) {
        setCardWidth(Math.min(vw - 80, 300));
      } else {
        const phoneChrome = 130;
        const availableCardHeight = vh * 0.7 - phoneChrome;
        const nextWidth = availableCardHeight * (1080 / 1350);
        setCardWidth(Math.round(Math.min(Math.max(nextWidth, 280), 540)));
      }
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useLayoutEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      refreshMeasurements();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [refreshMeasurements, localContent, localStyle, localOverlays, cardWidth, safeIndex]);

  const measuredItemMap = useMemo(() => {
    return new Map(measuredItems.map((item) => [item.id, item]));
  }, [measuredItems]);

  const selectedRects = useMemo(() => {
    return selectedItemIds
      .map((id) => measuredItemMap.get(id)?.rect)
      .filter((rect): rect is BaseRect => rect !== undefined);
  }, [measuredItemMap, selectedItemIds]);

  const selectedTextFields = useMemo(() => {
    return selectedItemIds
      .filter((itemId): itemId is `text:${EditableTextField}` => isTextItemId(itemId))
      .map((itemId) => itemId.replace("text:", "") as EditableTextField);
  }, [selectedItemIds]);

  const selectionBounds = useMemo(() => getBoundingRect(selectedRects), [selectedRects]);
  const multiSelectedRects = selectedItemIds.length > 1 ? selectedRects : [];

  const singleSelectedItemId = selectedItemIds.length === 1 ? selectedItemIds[0] : null;
  const selectedOverlayIndex = singleSelectedItemId && isOverlayItemId(singleSelectedItemId)
    ? Number(singleSelectedItemId.replace("overlay:", ""))
    : null;
  const selectedTextField = singleSelectedItemId && isTextItemId(singleSelectedItemId)
    ? (singleSelectedItemId.replace("text:", "") as EditableTextField)
    : null;
  const activeChatField = editingTextField ?? selectedTextField;

  const selectedTextAlignment = useMemo<TextAlignCommand | null>(() => {
    if (selectedTextFields.length === 0) return null;

    const currentStyle = getCurrentStyle();
    const alignments = selectedTextFields.map((field) =>
      getResolvedTextAlignment(currentStyle, getCurrentLayoutId(), field)
    );

    return alignments.every((alignment) => alignment === alignments[0]) ? alignments[0] : null;
  }, [getCurrentLayoutId, getCurrentStyle, selectedTextFields]);

  useEffect(() => {
    if (!activeChatField && chatScope === "selected_text") {
      setChatScope("current_slide");
    }
  }, [activeChatField, chatScope]);

  const handleAiChatSubmit = useCallback(async (
    instruction: string,
    submitContext?: ChatEditSubmitContext,
  ): Promise<void> => {
    const trimmedInstruction = instruction.trim();
    if (!trimmedInstruction || !convexSlide || historyReplayRef.current) return;

    const now = Date.now();
    const effectiveScope = submitContext?.scope ?? chatScope;
    const selectedChatField =
      effectiveScope === "selected_text"
        ? (submitContext ? submitContext.selectedField : (activeChatField ?? null))
        : null;
    const contextText = effectiveScope === "selected_text" && selectedChatField
      ? `${AI_CHAT_SCOPE_LABELS[effectiveScope]} (${EDITABLE_TEXT_FIELD_LABELS[selectedChatField]})`
      : AI_CHAT_SCOPE_LABELS[effectiveScope];

    setIsPlanningEdit(true);
    setIsAiChatOpen(true);
    setPendingChatEdit(null);
    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        text: trimmedInstruction,
        createdAt: now,
      },
    ]);

    try {
      const result = await planChatEditAction({
        projectId,
        currentSlideId: convexSlide._id as Id<"slides">,
        instruction: trimmedInstruction,
        scope: effectiveScope,
        selectedField: selectedChatField ?? undefined,
      });
      const normalizedResult = normalizeChatEditPlanResponse(result, {
        scope: effectiveScope,
        selectedField: selectedChatField,
      });
      if (!normalizedResult) {
        throw new Error("AI_CHAT_PLAN_INVALID");
      }

      const imageResolutionWarnings: string[] = [];
      const resolvedOperations = await Promise.all(
        normalizedResult.operations.map(async (operation) => {
          if (
            operation.type !== "update_image" ||
            !operation.changes?.searchQuery ||
            operation.changes.externalUrl
          ) {
            return operation;
          }

          try {
            const results = await searchImagesAction({
              query: operation.changes.searchQuery,
              page: 1,
              perPage: 8,
            });
            const bestResult = pickBestChatImageResult(results as ChatImageSearchResult[]);
            if (!bestResult) {
              imageResolutionWarnings.push(
                `${operation.slideRef}용 이미지 검색 결과를 찾지 못해 직접 확인이 필요해요.`,
              );
              return operation;
            }

            if (bestResult.source === "unsplash" && bestResult.downloadUrl) {
              try {
                await triggerUnsplashDownloadAction({
                  downloadUrl: bestResult.downloadUrl,
                });
              } catch (error) {
                console.error("Failed to trigger Unsplash download", error);
              }
            }

            return {
              ...operation,
              changes: {
                ...operation.changes,
                externalUrl: bestResult.url,
              },
            };
          } catch (error) {
            console.error("Failed to resolve AI image search query", error);
            imageResolutionWarnings.push(
              `${operation.slideRef}용 배경 이미지 검색 중 오류가 발생했어요.`,
            );
            return operation;
          }
        }),
      );

      const nextPendingChatEdit: PendingChatEdit = {
        ...normalizedResult,
        operations: resolvedOperations,
        warnings: Array.from(
          new Set([...normalizedResult.warnings, ...imageResolutionWarnings]),
        ),
        createdAt: now + 1,
        instruction: trimmedInstruction,
        referenceSlideId: convexSlide._id,
        selectedField: selectedChatField,
      };

      setPendingChatEdit(nextPendingChatEdit);
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          text: formatAssistantReply(nextPendingChatEdit),
          createdAt: now + 1,
        },
      ]);
    } catch (error) {
      const errorMessage = formatChatPlannerError(error);
      setPendingChatEdit(null);
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          text: `${contextText} 요청을 처리하지 못했어요.\n\n${errorMessage}`,
          createdAt: now + 1,
        },
      ]);
    } finally {
      setChatInput("");
      setIsPlanningEdit(false);
    }
  }, [
    activeChatField,
    chatScope,
    convexSlide,
    planChatEditAction,
    projectId,
    searchImagesAction,
    triggerUnsplashDownloadAction,
  ]);

  const handleCancelPendingChatEdit = useCallback((): void => {
    setPendingChatEdit(null);
    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "assistant",
        text: "이번 제안은 적용하지 않았어요. 원하면 다른 방향으로 다시 제안할게요.",
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const handleRetryPendingChatEdit = useCallback((): void => {
    if (!pendingChatEdit || isPlanningEdit) {
      return;
    }

    void handleAiChatSubmit(pendingChatEdit.instruction, {
      scope: pendingChatEdit.scope,
      selectedField: pendingChatEdit.selectedField,
    });
  }, [handleAiChatSubmit, isPlanningEdit, pendingChatEdit]);

  const baseSlides = useMemo<CardSlide[]>(() => {
    if (!slides || !convexSlide) {
      return [];
    }

    const isLocalContentFresh = localContentSlideId === convexSlide._id;
    return slides.map((slide, index) => {
      const mappedSlide = mapConvexSlide(slide);
      if (index !== safeIndex) {
        return mappedSlide;
      }

      return {
        ...mappedSlide,
        layoutId: localLayoutId ?? slide.layoutId,
        content: (isLocalContentFresh ? localContent : null) ?? slide.content ?? { title: "" },
        style: localStyle ?? slide.style,
        overlays: localOverlays ?? mappedSlide.overlays,
        image:
          localImage !== undefined
            ? toEditorSlideImage(localImage ?? undefined)
            : mappedSlide.image,
      };
    });
  }, [
    convexSlide,
    localContent,
    localContentSlideId,
    localImage,
    localLayoutId,
    localOverlays,
    localStyle,
    safeIndex,
    slides,
  ]);

  const workingSlidesSnapshot = useMemo<EditableSlideSnapshot[]>(() => {
    return getWorkingSlidesSnapshot();
  }, [getWorkingSlidesSnapshot]);

  const persistSlideSnapshots = useCallback(
    async (snapshots: EditableSlideSnapshot[], source: SaveSource): Promise<void> => {
      if (snapshots.length === 0) {
        return;
      }

      markSaveSourcePending(source);

      try {
        await applySlideSnapshotsMutation({
          projectId,
          snapshots: snapshots.map((snapshot) => {
            const imagePayload = buildSnapshotMutationImage(snapshot);

            return {
              slideId: snapshot.slideId as Id<"slides">,
              layoutId: snapshot.layoutId,
              content: {
                title: snapshot.content.title ?? "",
                category: snapshot.content.category,
                subtitle: snapshot.content.subtitle,
                body: snapshot.content.body,
                source: snapshot.content.source,
              },
              style: snapshot.style,
              overlays: snapshot.overlays.map((overlay) => ({
                assetId: overlay.assetId as Id<"userAssets">,
                x: overlay.x,
                y: overlay.y,
                width: overlay.width,
                opacity: overlay.opacity,
              })),
              ...imagePayload,
            };
          }),
        });
        finalizeSaveSource(source, "saved");
      } catch (error) {
        console.error("Failed to persist slide snapshots", error);
        finalizeSaveSource(source, "error");
        throw error;
      }
    },
    [applySlideSnapshotsMutation, finalizeSaveSource, markSaveSourcePending, projectId]
  );

  const chatPreviewResult = useMemo(() => {
    if (!pendingChatEdit || baseSlides.length === 0) {
      return null;
    }

    const referenceSlideIndex = baseSlides.findIndex(
      (slide) => slide.id === pendingChatEdit.referenceSlideId,
    );
    if (referenceSlideIndex < 0) {
      return null;
    }

    return buildChatEditPreviewResult(baseSlides, referenceSlideIndex, pendingChatEdit);
  }, [baseSlides, pendingChatEdit]);

  const pendingChatRenderModel = useMemo(() => {
    if (!pendingChatEdit) {
      return null;
    }

    return buildChatEditPlanRenderModel(pendingChatEdit);
  }, [pendingChatEdit]);

  const resetPendingPersistence = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (imageTimerRef.current) clearTimeout(imageTimerRef.current);

    pendingRef.current = false;
    stylePendingRef.current = false;
    overlayPendingRef.current = false;
    imagePendingRef.current = false;
    activeSaveSourcesRef.current.clear();
    setAutosaveStatus("saved");
  }, []);

  useEffect(() => {
    const nextSignature = slides?.map((slide) => slide._id).join(":") ?? null;
    const previousSignature = slideTopologySignatureRef.current;

    if (previousSignature && nextSignature && previousSignature !== nextSignature) {
      invalidateHistoryStacks();
      setPendingReplaySync(null);
      setPendingChatEdit(null);
      resetPendingPersistence();
      historyReplayRef.current = false;
      setIsReplayingHistory(false);
    }

    slideTopologySignatureRef.current = nextSignature;
  }, [invalidateHistoryStacks, resetPendingPersistence, slides]);

  useEffect(() => {
    if (!pendingReplaySync || !slides) {
      return;
    }

    const isReplaySynchronized = pendingReplaySync.every((expectedSnapshot) => {
      const currentSlide = slides.find((slide) => slide._id === expectedSnapshot.slideId);
      if (!currentSlide) {
        return false;
      }

      return areEditableSlideSnapshotsEqual(
        buildEditableSlideSnapshot(currentSlide),
        expectedSnapshot,
      );
    });

    if (!isReplaySynchronized) {
      return;
    }

    historyReplayRef.current = false;
    setPendingReplaySync(null);
    setIsReplayingHistory(false);
  }, [pendingReplaySync, slides]);

  const replayHistoryEntry = useCallback(
    async (entry: EditorHistoryEntry, direction: "undo" | "redo"): Promise<void> => {
      if (!slides || historyReplayRef.current) {
        return;
      }

      const targetSnapshots = entry.patches.map((patch) =>
        direction === "undo" ? patch.before : patch.after
      );

      clearSelection();
      setEditingTextField(null);
      resetPendingPersistence();
      historyReplayRef.current = true;
      setIsReplayingHistory(true);
      setPendingReplaySync(cloneEditableSlideSnapshots(targetSnapshots));

      const focusSlideId = entry.focusSlideId ?? targetSnapshots[0]?.slideId ?? null;
      const focusSnapshot =
        (focusSlideId
          ? targetSnapshots.find((snapshot) => snapshot.slideId === focusSlideId)
          : null) ?? targetSnapshots[0];

      if (focusSnapshot) {
        applySnapshotToActiveSlide(focusSnapshot);
      }

      if (focusSlideId) {
        const focusIndex = slides.findIndex((slide) => slide._id === focusSlideId);
        if (focusIndex >= 0) {
          setCurrentSlideIndex(focusIndex);
        }
      }

      try {
        await persistSlideSnapshots(targetSnapshots, "history");
      } catch (error) {
        historyReplayRef.current = false;
        setPendingReplaySync(null);
        setIsReplayingHistory(false);
        throw error;
      }
    },
    [applySnapshotToActiveSlide, clearSelection, persistSlideSnapshots, resetPendingPersistence, slides]
  );

  const handleUndo = useCallback(async (): Promise<void> => {
    if (pendingChatEdit || isApplyingChatEdit || isReplayingHistory || undoStack.length === 0) {
      return;
    }

    const entry = undoStack[undoStack.length - 1];

    try {
      await replayHistoryEntry(entry, "undo");
      setUndoStack((current) => current.slice(0, -1));
      setRedoStack((current) => [...current, entry]);
    } catch (error) {
      console.error("Failed to undo editor change", error);
    }
  }, [isApplyingChatEdit, isReplayingHistory, pendingChatEdit, replayHistoryEntry, undoStack]);

  const handleRedo = useCallback(async (): Promise<void> => {
    if (pendingChatEdit || isApplyingChatEdit || isReplayingHistory || redoStack.length === 0) {
      return;
    }

    const entry = redoStack[redoStack.length - 1];

    try {
      await replayHistoryEntry(entry, "redo");
      setRedoStack((current) => current.slice(0, -1));
      setUndoStack((current) => limitUndoStack([...current, entry], HISTORY_STACK_LIMIT));
    } catch (error) {
      console.error("Failed to redo editor change", error);
    }
  }, [isApplyingChatEdit, isReplayingHistory, pendingChatEdit, redoStack, replayHistoryEntry]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSelection();
        return;
      }

      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (isEditableElement(event.target)) {
        return;
      }

      const normalizedKey = event.key.toLowerCase();
      const isRedoShortcut =
        (normalizedKey === "z" && event.shiftKey) ||
        (normalizedKey === "y" && !event.shiftKey && event.ctrlKey);

      if (normalizedKey !== "z" && normalizedKey !== "y") {
        return;
      }

      if (pendingChatEdit || isApplyingChatEdit || isReplayingHistory) {
        event.preventDefault();
        return;
      }

      if (isRedoShortcut) {
        event.preventDefault();
        void handleRedo();
        return;
      }

      if (normalizedKey === "z" && !event.shiftKey) {
        event.preventDefault();
        void handleUndo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearSelection, handleRedo, handleUndo, isApplyingChatEdit, isReplayingHistory, pendingChatEdit]);

  const handleApplyPendingChatEdit = useCallback(async (): Promise<void> => {
    if (
      !slides ||
      !convexSlide ||
      !chatPreviewResult ||
      isApplyingChatEdit ||
      historyReplayRef.current
    ) {
      return;
    }

    setIsApplyingChatEdit(true);
    clearSelection();
    setEditingTextField(null);
    resetPendingPersistence();

    try {
      const workingSnapshotById = new Map(
        workingSlidesSnapshot.map((snapshot) => [snapshot.slideId, snapshot]),
      );
      const afterSnapshots = chatPreviewResult.slides.map((slide) =>
        toEditableSlideSnapshot(slide, {
          baseImage: workingSnapshotById.get(slide.id)?.image,
        }),
      );
      const entry = createHistoryEntryFromSnapshots({
        afterSlides: afterSnapshots,
        beforeSlides: workingSlidesSnapshot,
        focusSlideId: convexSlide._id,
        source: "ai_apply",
      });

      if (!entry) {
        setPendingChatEdit(null);
        setChatMessages((currentMessages) => [
          ...currentMessages,
          {
            role: "assistant",
            text: "적용할 변경이 없어 미리보기만 종료했어요.",
            createdAt: Date.now(),
          },
        ]);
        return;
      }

      const currentSlideSnapshot = entry.patches
        .map((patch) => patch.after)
        .find((snapshot) => snapshot.slideId === convexSlide._id);
      await persistSlideSnapshots(
        entry.patches.map((patch) => patch.after),
        "history"
      );
      if (currentSlideSnapshot) {
        applySnapshotToActiveSlide(currentSlideSnapshot);
      }

      setUndoStack((current) => limitUndoStack([...current, entry], HISTORY_STACK_LIMIT));
      setRedoStack([]);
      setPendingChatEdit(null);
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          text: "미리보기 변경을 편집 내용에 적용했어요.",
          createdAt: Date.now(),
        },
      ]);
    } catch (error) {
      console.error("Failed to apply AI chat edit plan", error);
      setAutosaveStatus("error");
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          text: "미리보기 적용 중 문제가 발생했어요. 그대로 유지한 채 다시 시도하거나 취소해 주세요.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsApplyingChatEdit(false);
    }
  }, [
    applySnapshotToActiveSlide,
    chatPreviewResult,
    clearSelection,
    convexSlide,
    isApplyingChatEdit,
    persistSlideSnapshots,
    resetPendingPersistence,
    slides,
    workingSlidesSnapshot,
  ]);

  const handleLayoutChange = useCallback(
    (layoutId: string) => {
      if (historyReplayRef.current) {
        return;
      }

      void scheduleLayoutPersist(layoutId);
    },
    [scheduleLayoutPersist]
  );

  const handleResetTextPositions = useCallback(() => {
    if (historyReplayRef.current) {
      return;
    }

    const currentStyle = getCurrentStyle();
    if (!currentStyle.textPositions) {
      return;
    }

    const { textPositions, ...rest } = currentStyle;
    void textPositions;
    scheduleStylePersist({ ...rest });
  }, [getCurrentStyle, scheduleStylePersist]);

  const handleApplyCurrentStyleToAll = useCallback(async (): Promise<void> => {
    if (!convexSlide || historyReplayRef.current) {
      return;
    }

    const currentSlideSnapshot = workingSlidesSnapshot.find(
      (snapshot) => snapshot.slideId === convexSlide._id
    );
    if (!currentSlideSnapshot) {
      return;
    }

    const afterSnapshots = workingSlidesSnapshot.map((snapshot) => ({
      ...snapshot,
      style: currentSlideSnapshot.style,
      layoutId: currentSlideSnapshot.layoutId,
      image: currentSlideSnapshot.image,
      overlays: currentSlideSnapshot.overlays,
    }));

    const entry = createHistoryEntryFromSnapshots({
      afterSlides: afterSnapshots,
      beforeSlides: workingSlidesSnapshot,
      focusSlideId: convexSlide._id,
      source: "apply_to_all",
    });

    if (!entry) {
      return;
    }

    applySnapshotToActiveSlide(currentSlideSnapshot);
    await persistSlideSnapshots(
      entry.patches.map((patch) => patch.after),
      "history"
    );
    setUndoStack((current) => limitUndoStack([...current, entry], HISTORY_STACK_LIMIT));
    setRedoStack([]);
  }, [applySnapshotToActiveSlide, convexSlide, persistSlideSnapshots, workingSlidesSnapshot]);

  const handleApplyCurrentOverlaysToAll = useCallback(async (): Promise<void> => {
    if (!convexSlide || historyReplayRef.current) {
      return;
    }

    const currentSlideSnapshot = workingSlidesSnapshot.find(
      (snapshot) => snapshot.slideId === convexSlide._id
    );
    if (!currentSlideSnapshot || currentSlideSnapshot.overlays.length === 0) {
      return;
    }

    const afterSnapshots = workingSlidesSnapshot.map((snapshot) => ({
      ...snapshot,
      overlays: currentSlideSnapshot.overlays,
    }));

    const entry = createHistoryEntryFromSnapshots({
      afterSlides: afterSnapshots,
      beforeSlides: workingSlidesSnapshot,
      focusSlideId: convexSlide._id,
      source: "apply_to_all",
    });

    if (!entry) {
      return;
    }

    applySnapshotToActiveSlide(currentSlideSnapshot);
    await persistSlideSnapshots(
      entry.patches.map((patch) => patch.after),
      "history"
    );
    setUndoStack((current) => limitUndoStack([...current, entry], HISTORY_STACK_LIMIT));
    setRedoStack([]);
  }, [applySnapshotToActiveSlide, convexSlide, persistSlideSnapshots, workingSlidesSnapshot]);

  const handleImproveContent = useCallback(
    async (instruction: string): Promise<void> => {
      if (!convexSlide || historyReplayRef.current) {
        return;
      }

      const improved = await improveSlideAction({
        slideId: convexSlide._id as Id<"slides">,
        instruction,
      });

      const nextContent: SlideContent = {
        title: improved.title ?? (localContent ?? convexSlide.content)?.title ?? "",
        category: (localContent ?? convexSlide.content)?.category,
        subtitle: improved.subtitle ?? (localContent ?? convexSlide.content)?.subtitle,
        body: improved.body ?? (localContent ?? convexSlide.content)?.body,
        source: (localContent ?? convexSlide.content)?.source,
      };

      const afterSnapshots = workingSlidesSnapshot.map((snapshot) =>
        snapshot.slideId === convexSlide._id
          ? { ...snapshot, content: nextContent }
          : snapshot
      );

      const entry = createHistoryEntryFromSnapshots({
        afterSlides: afterSnapshots,
        beforeSlides: workingSlidesSnapshot,
        focusSlideId: convexSlide._id,
        source: "improve",
      });

      setLocalContent(nextContent);
      setLocalContentSlideId(convexSlide._id);

      await persistSlideSnapshots(
        afterSnapshots.filter((snapshot) => snapshot.slideId === convexSlide._id),
        "history"
      );

      if (entry) {
        setUndoStack((current) => limitUndoStack([...current, entry], HISTORY_STACK_LIMIT));
        setRedoStack([]);
      }
    },
    [convexSlide, improveSlideAction, localContent, persistSlideSnapshots, workingSlidesSnapshot]
  );

  const handleLoadStylePreset = useCallback(
    async (preset: {
      name: string;
      style: SlideStyle;
      layoutId?: string;
      overlays?: Array<{ assetId: string; x: number; y: number; width: number; opacity: number }>;
      image?: EditableSlideImage;
    }): Promise<void> => {
      if (!convexSlide || historyReplayRef.current) {
        return;
      }

      const afterSnapshots = workingSlidesSnapshot.map((snapshot) =>
        snapshot.slideId === convexSlide._id
          ? {
              ...snapshot,
              style: preset.style,
              layoutId: preset.layoutId ?? snapshot.layoutId,
              overlays: preset.overlays?.map((overlay) => ({ ...overlay })) ?? snapshot.overlays,
              image: preset.image !== undefined ? buildMutationImage(preset.image) : snapshot.image,
            }
          : snapshot
      );

      const entry = createHistoryEntryFromSnapshots({
        afterSlides: afterSnapshots,
        beforeSlides: workingSlidesSnapshot,
        focusSlideId: convexSlide._id,
        source: "preset",
      });

      const currentSlideSnapshot = afterSnapshots.find((snapshot) => snapshot.slideId === convexSlide._id);
      if (!currentSlideSnapshot) {
        return;
      }

      applySnapshotToActiveSlide(currentSlideSnapshot);
      await persistSlideSnapshots([currentSlideSnapshot], "history");

      if (entry) {
        setUndoStack((current) => limitUndoStack([...current, entry], HISTORY_STACK_LIMIT));
        setRedoStack([]);
      }
    },
    [applySnapshotToActiveSlide, convexSlide, persistSlideSnapshots, workingSlidesSnapshot]
  );

  const handleResetFieldToOriginal = useCallback(
    async (field: EditableTextField): Promise<void> => {
      if (!convexSlide?.originalContent || historyReplayRef.current) {
        return;
      }

      const originalValue = convexSlide.originalContent[field];
      if (originalValue === undefined) {
        return;
      }

      const currentContent = localContent ?? convexSlide.content ?? { title: "" };
      const nextContent: SlideContent = {
        ...currentContent,
        [field]: originalValue,
      };

      const afterSnapshots = workingSlidesSnapshot.map((snapshot) =>
        snapshot.slideId === convexSlide._id
          ? { ...snapshot, content: nextContent }
          : snapshot
      );

      const entry = createHistoryEntryFromSnapshots({
        afterSlides: afterSnapshots,
        beforeSlides: workingSlidesSnapshot,
        focusSlideId: convexSlide._id,
        source: "manual",
      });

      setLocalContent(nextContent);
      setLocalContentSlideId(convexSlide._id);
      await persistSlideSnapshots(
        afterSnapshots.filter((snapshot) => snapshot.slideId === convexSlide._id),
        "history"
      );

      if (entry) {
        setUndoStack((current) => limitUndoStack([...current, entry], HISTORY_STACK_LIMIT));
        setRedoStack([]);
      }
    },
    [convexSlide, localContent, persistSlideSnapshots, workingSlidesSnapshot]
  );

  const beginDragSession = useCallback(
    (selectedIds: CanvasItemId[], clientX: number, clientY: number) => {
      const slideElement = allSlideRefs.current[safeIndex] ?? null;
      const measured = measureCanvasItems(slideElement);
      if (!measured.slideRect) return;

      const initialRectEntries = measured.items.reduce<Record<CanvasItemId, BaseRect>>((acc, item) => {
        acc[item.id] = item.rect;
        return acc;
      }, {} as Record<CanvasItemId, BaseRect>);

      const rects = selectedIds
        .map((id) => initialRectEntries[id])
        .filter((rect): rect is BaseRect => rect !== undefined);
      const bounds = getBoundingRect(rects);
      if (!bounds) return;

      dragSessionRef.current = {
        selectedIds,
        startClientX: clientX,
        startClientY: clientY,
        slideRect: measured.slideRect,
        padding: measured.padding,
        initialRects: initialRectEntries,
        initialTextPositions: { ...(getCurrentStyle().textPositions ?? {}) },
        initialOverlays: getCurrentOverlays().map((overlay) => ({ ...overlay })),
        selectionBounds: bounds,
      };
      setIsDraggingSelection(true);
    },
    [getCurrentOverlays, getCurrentStyle, safeIndex]
  );

  const applySelectionTransform = useCallback(
    (session: DragSession, requestedDx: number, requestedDy: number, bypassSnap: boolean) => {
      const clamped = clampDeltaToBounds(session.selectionBounds, requestedDx, requestedDy);
      let nextDx = clamped.x;
      let nextDy = clamped.y;
      let nextGuides: SnapGuide[] = [];

      if (snapEnabled && !bypassSnap) {
        const otherRects = Object.entries(session.initialRects)
          .filter(([itemId]) => !session.selectedIds.includes(itemId as CanvasItemId))
          .map(([, rect]) => rect);
        const snapped = getSnapResult({
          movingRect: session.selectionBounds,
          dx: nextDx,
          dy: nextDy,
          otherRects,
          padding: session.padding,
        });
        const snappedClamped = clampDeltaToBounds(session.selectionBounds, snapped.dx, snapped.dy);
        nextDx = snappedClamped.x;
        nextDy = snappedClamped.y;
        nextGuides = snapped.guides;
      }

      setSnapGuides(nextGuides);

      const currentStyle = getCurrentStyle();
      const selectedTextIds = session.selectedIds.filter(
        (itemId): itemId is `text:${EditableTextField}` => isTextItemId(itemId)
      );
      if (selectedTextIds.length > 0) {
        const nextTextPositions = { ...(currentStyle.textPositions ?? {}) };
        for (const itemId of selectedTextIds) {
          const field = itemId.replace("text:", "") as EditableTextField;
          const currentPosition = session.initialTextPositions[field] ?? { x: 0, y: 0 };
          nextTextPositions[field] = {
            x: Math.round(currentPosition.x + nextDx),
            y: Math.round(currentPosition.y + nextDy),
          };
        }
        scheduleStylePersist({
          ...currentStyle,
          textPositions: nextTextPositions,
        });
      }

      const selectedOverlayIds = session.selectedIds.filter(
        (itemId): itemId is `overlay:${number}` => isOverlayItemId(itemId)
      );
      if (selectedOverlayIds.length > 0) {
        const nextOverlays = session.initialOverlays.map((overlay, index) => {
          const itemId = getOverlayItemId(index) as `overlay:${number}`;
          if (!selectedOverlayIds.includes(itemId)) return overlay;

          return {
            ...overlay,
            x: Math.round(overlay.x + (nextDx / BASE_SLIDE_WIDTH) * 100),
            y: Math.round(overlay.y + (nextDy / BASE_SLIDE_HEIGHT) * 100),
          };
        });
        scheduleOverlayPersist(nextOverlays);
      }
    },
    [getCurrentStyle, scheduleOverlayPersist, scheduleStylePersist, snapEnabled]
  );

  const handleItemDragStart = useCallback(
    (itemId: CanvasItemId, options: { clientX: number; clientY: number; additive: boolean }) => {
      setEditingTextField(null);

      if (options.additive && isDesktopCanvas) {
        setSelectedItemIds((current) =>
          current.includes(itemId)
            ? current.filter((selectedId) => selectedId !== itemId)
            : [...current, itemId]
        );
        return;
      }

      const nextSelection = selectedItemIds.includes(itemId) ? selectedItemIds : [itemId];
      setSelectedItemIds(nextSelection);
      beginDragSession(nextSelection, options.clientX, options.clientY);
    },
    [beginDragSession, isDesktopCanvas, selectedItemIds]
  );

  const handleItemDragMove = useCallback(
    (_itemId: CanvasItemId, options: { clientX: number; clientY: number; bypassSnap: boolean }) => {
      const session = dragSessionRef.current;
      if (!session) return;

      const delta = screenDeltaToBaseDelta(
        session.slideRect,
        session.startClientX,
        session.startClientY,
        options.clientX,
        options.clientY
      );
      applySelectionTransform(session, delta.x, delta.y, options.bypassSnap);
    },
    [applySelectionTransform]
  );

  const handleItemDragEnd = useCallback(() => {
    dragSessionRef.current = null;
    setSnapGuides([]);
    setIsDraggingSelection(false);
    window.requestAnimationFrame(() => {
      refreshMeasurements();
    });
  }, [refreshMeasurements]);

  const handleCanvasDragStart = useCallback(
    (options: { clientX: number; clientY: number; additive: boolean }) => {
      if (!isDesktopCanvas) return;

      const slideElement = allSlideRefs.current[safeIndex] ?? null;
      const measured = measureCanvasItems(slideElement);
      if (!measured.slideRect) return;

      const startPoint = clientPointToBasePoint(measured.slideRect, options.clientX, options.clientY);
      marqueeSessionRef.current = {
        startPoint,
        slideRect: measured.slideRect,
        additive: options.additive,
        initialSelection: selectedItemIds,
        dragged: false,
      };
      setEditingTextField(null);
      setSnapGuides([]);
      setMarqueeRect(baseRectFromPoints(startPoint, startPoint));
    },
    [isDesktopCanvas, safeIndex, selectedItemIds]
  );

  const handleCanvasDragMove = useCallback((options: { clientX: number; clientY: number }) => {
    const session = marqueeSessionRef.current;
    if (!session) return;

    const nextPoint = clientPointToBasePoint(session.slideRect, options.clientX, options.clientY);
    const nextRect = baseRectFromPoints(session.startPoint, nextPoint);
    if (nextRect.width > 3 || nextRect.height > 3) {
      session.dragged = true;
    }
    setMarqueeRect(nextRect);
  }, []);

  const handleCanvasDragEnd = useCallback((options: { clientX: number; clientY: number }) => {
    const session = marqueeSessionRef.current;
    if (!session) return;

    const endPoint = clientPointToBasePoint(session.slideRect, options.clientX, options.clientY);
    const currentMarqueeRect = baseRectFromPoints(session.startPoint, endPoint);
    marqueeSessionRef.current = null;
    setMarqueeRect(null);

    if (!currentMarqueeRect || !session.dragged) {
      if (!session.additive) {
        clearSelection();
      }
      return;
    }

    const slideElement = allSlideRefs.current[safeIndex] ?? null;
    const measured = measureCanvasItems(slideElement);
    const hitIds = measured.items
      .filter((item) => rectsIntersect(item.rect, currentMarqueeRect))
      .map((item) => item.id);

    setSelectedItemIds(
      session.additive
        ? Array.from(new Set([...session.initialSelection, ...hitIds]))
        : hitIds
    );

    window.requestAnimationFrame(() => {
      refreshMeasurements();
    });
  }, [clearSelection, refreshMeasurements, safeIndex]);

  const handleAlignSelection = useCallback(
    (command: AlignCommand) => {
      if (selectedItemIds.length < 2) return;

      const slideElement = allSlideRefs.current[safeIndex] ?? null;
      const measured = measureCanvasItems(slideElement);
      const measuredMap = new Map(measured.items.map((item) => [item.id, item]));
      const bounds = getBoundingRect(
        selectedItemIds
          .map((itemId) => measuredMap.get(itemId)?.rect)
          .filter((rect): rect is BaseRect => rect !== undefined)
      );
      if (!bounds) return;

      const currentStyle = getCurrentStyle();
      const nextTextPositions = { ...(currentStyle.textPositions ?? {}) };
      let styleChanged = false;

      const nextOverlays = getCurrentOverlays().map((overlay) => ({ ...overlay }));
      let overlaysChanged = false;

      for (const itemId of selectedItemIds) {
        const item = measuredMap.get(itemId);
        if (!item) continue;

        let dx = 0;
        let dy = 0;

        switch (command) {
          case "left":
            dx = bounds.left - item.rect.left;
            break;
          case "center-x":
            dx = bounds.centerX - item.rect.centerX;
            break;
          case "right":
            dx = bounds.right - item.rect.right;
            break;
          case "top":
            dy = bounds.top - item.rect.top;
            break;
          case "center-y":
            dy = bounds.centerY - item.rect.centerY;
            break;
          case "bottom":
            dy = bounds.bottom - item.rect.bottom;
            break;
        }

        if (isTextItemId(itemId)) {
          const field = itemId.replace("text:", "") as EditableTextField;
          const currentPosition = currentStyle.textPositions?.[field] ?? { x: 0, y: 0 };
          nextTextPositions[field] = {
            x: Math.round(currentPosition.x + dx),
            y: Math.round(currentPosition.y + dy),
          };
          styleChanged = true;
          continue;
        }

        if (isOverlayItemId(itemId)) {
          const overlayIndex = Number(itemId.replace("overlay:", ""));
          const overlay = nextOverlays[overlayIndex];
          if (!overlay) continue;

          nextOverlays[overlayIndex] = {
            ...overlay,
            x: Math.round(overlay.x + (dx / BASE_SLIDE_WIDTH) * 100),
            y: Math.round(overlay.y + (dy / BASE_SLIDE_HEIGHT) * 100),
          };
          overlaysChanged = true;
        }
      }

      if (styleChanged) {
        scheduleStylePersist({
          ...currentStyle,
          textPositions: nextTextPositions,
        });
      }
      if (overlaysChanged) {
        scheduleOverlayPersist(nextOverlays);
      }

      window.requestAnimationFrame(() => {
        refreshMeasurements();
      });
    },
    [getCurrentOverlays, getCurrentStyle, refreshMeasurements, safeIndex, scheduleOverlayPersist, scheduleStylePersist, selectedItemIds]
  );

  const handleTextAlignSelection = useCallback(
    (alignment: TextAlignCommand) => {
      if (selectedTextFields.length === 0) return;

      const currentStyle = getCurrentStyle();
      const nextTextAlignments = selectedTextFields.reduce<Partial<TextAlignments>>((acc, field) => {
        acc[field] = alignment;
        return acc;
      }, {});

      scheduleStylePersist(
        buildStyleWithTextAlignments(currentStyle, getCurrentLayoutId(), nextTextAlignments)
      );
    },
    [getCurrentLayoutId, getCurrentStyle, scheduleStylePersist, selectedTextFields]
  );

  if (project === undefined || slides === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        프로젝트를 찾을 수 없습니다.
      </div>
    );
  }

  if (!convexSlide || slides.length === 0) return null;

  const allSlides: CardSlide[] = chatPreviewResult?.slides ?? baseSlides;
  const isChatPreviewActive = pendingChatEdit !== null;
  const isEditorInteractionLocked = isChatPreviewActive || isReplayingHistory;
  const canUndo =
    undoStack.length > 0 &&
    !isChatPreviewActive &&
    !isApplyingChatEdit &&
    !isReplayingHistory;
  const canRedo =
    redoStack.length > 0 &&
    !isChatPreviewActive &&
    !isApplyingChatEdit &&
    !isReplayingHistory;

  const previewScale = cardWidth / BASE_SLIDE_WIDTH;
  const cardHeight = cardWidth * (BASE_SLIDE_HEIGHT / BASE_SLIDE_WIDTH);
  const canGoToPreviousPreviewSlide = isDesktopCanvas && safeIndex > 0;
  const canGoToNextPreviewSlide = isDesktopCanvas && safeIndex < allSlides.length - 1;
  const autosaveStatusMeta = SAVE_STATUS_META[autosaveStatus];
  const historyStatusMeta = isReplayingHistory
    ? {
        label: "히스토리 반영 중…",
        className: "border-amber-200 bg-amber-50 text-amber-900",
        dotClassName: "bg-amber-500 animate-pulse",
      }
    : {
        label: `Undo ${undoStack.length} · Redo ${redoStack.length}`,
        className: "border-border bg-surface text-muted",
        dotClassName: "bg-muted/70",
      };

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg p-1.5 hover:bg-surface-hover hover:text-foreground"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="hidden text-muted md:inline">카드뉴스 만들기 ›</span>
          <span className="max-w-[150px] truncate text-foreground md:max-w-none">
            {project.title}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span
            className={`hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium md:inline-flex ${autosaveStatusMeta.className}`}
          >
            <span className={`h-2 w-2 rounded-full ${autosaveStatusMeta.dotClassName}`} />
            {autosaveStatusMeta.label}
          </span>
          <span
            className={`hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium lg:inline-flex ${historyStatusMeta.className}`}
          >
            <span className={`h-2 w-2 rounded-full ${historyStatusMeta.dotClassName}`} />
            {historyStatusMeta.label}
          </span>
          <button
            type="button"
            onClick={() => {
              void handleUndo();
            }}
            disabled={!canUndo}
            aria-label="실행 취소"
            title="실행 취소 (⌘/Ctrl+Z)"
            className="flex items-center gap-1.5 rounded-lg border border-border p-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 md:px-3 md:py-1.5"
          >
            <Undo2 size={14} />
            <span className="hidden md:inline">실행 취소</span>
          </button>
          <button
            type="button"
            onClick={() => {
              void handleRedo();
            }}
            disabled={!canRedo}
            aria-label="다시 실행"
            title="다시 실행 (⇧⌘Z / Ctrl+Y)"
            className="flex items-center gap-1.5 rounded-lg border border-border p-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 md:px-3 md:py-1.5"
          >
            <Redo2 size={14} />
            <span className="hidden md:inline">다시 실행</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAiChatOpen((current) => !current)}
            className={`flex items-center gap-1.5 rounded-lg border p-2 text-sm transition-colors md:px-4 md:py-1.5 ${
              isAiChatOpen
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Sparkles size={14} />
            <span className="hidden md:inline">AI Chat</span>
          </button>
          <button
            onClick={() => router.push("/create")}
            className="flex items-center gap-1.5 rounded-lg border border-border p-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:px-4 md:py-1.5"
          >
            <RefreshCw size={14} />
            <span className="hidden md:inline">다시 생성</span>
          </button>
          <ExportButton
            allSlideRefs={allSlideRefs}
            projectTitle={project.title}
            currentSlideIndex={safeIndex}
            totalSlides={slides.length}
          />
        </div>
      </div>

      <div className="flex border-b border-border md:hidden">
        <button
          onClick={() => setMobileTab("edit")}
          className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors ${
            mobileTab === "edit" ? "border-b-2 border-accent text-accent" : "text-muted"
          }`}
        >
          편집
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors ${
            mobileTab === "preview" ? "border-b-2 border-accent text-accent" : "text-muted"
          }`}
        >
          미리보기
        </button>
      </div>

      {!isAiChatOpen && (
        <button
          type="button"
          onClick={() => setIsAiChatOpen(true)}
          className="fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-white shadow-xl transition-transform hover:scale-[1.02] md:hidden"
        >
          <Sparkles size={16} />
          AI Chat
        </button>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`w-full shrink-0 overflow-y-auto border-r border-border md:block md:w-[420px] ${
            mobileTab !== "edit" ? "hidden" : ""
          }`}
        >
          <EditorPanel
            projectId={projectId}
            slides={slides}
            currentSlideIndex={safeIndex}
            onSlideChange={setCurrentSlideIndex}
            localContent={localContent ?? convexSlide.content ?? { title: "" }}
            onContentChange={handleContentChange}
            currentLayoutId={getCurrentLayoutId()}
            onStyleChange={scheduleStylePersist}
            onLayoutChange={handleLayoutChange}
            onApplyStyleToAll={handleApplyCurrentStyleToAll}
            onImproveContent={handleImproveContent}
            onLoadPreset={handleLoadStylePreset}
            onResetTextPositions={handleResetTextPositions}
            onStyleAutosaveStatusChange={handleEditorPanelStyleAutosaveStatusChange}
            overlays={getCurrentOverlays()}
            selectedOverlayIndex={selectedOverlayIndex}
            onSelectOverlay={(index) => {
              setSelectedItemIds([getOverlayItemId(index)]);
              setEditingTextField(null);
            }}
            onAddOverlay={(assetId) => {
              const current = getCurrentOverlays();
              if (current.length >= 5) return;
              const nextOverlays = [
                ...current,
                { assetId: assetId as string, x: 85, y: 90, width: 15, opacity: 80 },
              ];
              setSelectedItemIds([getOverlayItemId(nextOverlays.length - 1)]);
              scheduleOverlayPersist(nextOverlays);
            }}
            onUpdateOverlay={(index, partial) => {
              const nextOverlays = [...getCurrentOverlays()];
              nextOverlays[index] = { ...nextOverlays[index], ...partial };
              scheduleOverlayPersist(nextOverlays);
            }}
            onRemoveOverlay={(index) => {
              const nextOverlays = [...getCurrentOverlays()];
              nextOverlays.splice(index, 1);
              clearSelection();
              scheduleOverlayPersist(nextOverlays);
            }}
            onApplyOverlaysToAll={() => {
              void handleApplyCurrentOverlaysToAll();
            }}
            localImage={
              localImage !== undefined ? toEditorSlideImage(localImage ?? undefined) : undefined
            }
            onImageChange={handleImageChange}
            onHistoryInvalidate={invalidateHistoryStacks}
            isInteractionLocked={isReplayingHistory}
          />
        </div>

        <div className="flex min-w-0 flex-1">
          <div
            className={`flex min-w-0 flex-1 flex-col items-center justify-center bg-surface-hover p-4 md:p-8 ${
              mobileTab !== "preview" ? "hidden md:flex" : ""
            }`}
          >
            <div className="mb-3 flex flex-col items-center gap-2">
              <p className="text-center text-[11px] text-muted">
                <span className="font-medium text-foreground/70">클릭</span> 선택 · {" "}
                <span className="font-medium text-foreground/70">Shift+클릭</span> 추가 선택 · {" "}
                <span className="font-medium text-foreground/70">드래그</span> 이동 · {" "}
                <span className="font-medium text-foreground/70">더블클릭</span> 편집
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSnapEnabled((current) => !current)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    snapEnabled
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  Snap {snapEnabled ? "ON" : "OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuideOverlay((current) => !current)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    showGuideOverlay
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  Guides {showGuideOverlay ? "ON" : "OFF"}
                </button>
                {(selectedItemIds.length > 1 || selectedTextFields.length > 0) && (
                  <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface px-2 py-1.5 shadow-sm">
                    {selectedItemIds.length > 1 && (
                      <>
                        {BLOCK_ALIGN_ACTIONS.map((action) => (
                          <ToolbarIconButton
                            key={action.command}
                            label={action.label}
                            icon={action.icon}
                            onClick={() => handleAlignSelection(action.command)}
                          />
                        ))}
                      </>
                    )}

                    {selectedItemIds.length > 1 && selectedTextFields.length > 0 && (
                      <div className="mx-1 h-6 w-px bg-border" />
                    )}

                    {selectedTextFields.length > 0 && (
                      <>
                        {TEXT_ALIGN_ACTIONS.map((action) => (
                          <ToolbarIconButton
                            key={action.alignment}
                            label={action.label}
                            icon={action.icon}
                            isActive={selectedTextAlignment === action.alignment}
                            onClick={() => handleTextAlignSelection(action.alignment)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex items-center justify-center px-10 md:px-16">
              {canGoToPreviousPreviewSlide && (
                <PreviewNavButton
                  direction="previous"
                  onClick={() => {
                    goToSlide(safeIndex - 1);
                  }}
                />
              )}

              <div ref={previewContainerRef} className="relative">
                <PhoneMockup width={cardWidth}>
                  <InstagramFrame
                    profileName={project.title}
                    totalSlides={slides.length}
                    currentSlide={safeIndex}
                    onSlideSelect={goToSlide}
                  >
                    <SwipeCarousel
                      slides={allSlides}
                      currentIndex={safeIndex}
                      onIndexChange={goToSlide}
                      cardWidth={cardWidth}
                      cardHeight={cardHeight}
                      scale={previewScale}
                      slideRefs={allSlideRefs}
                      allowSwipe={!isDesktopCanvas && !isEditorInteractionLocked}
                      allowCanvasSelection={isDesktopCanvas && !isEditorInteractionLocked}
                      onSlideClick={() => {
                        clearSelection();
                      }}
                      resolvedOverlayUrls={resolvedOverlayUrls}
                      selectedOverlayIndex={selectedOverlayIndex ?? undefined}
                      selectedTextField={selectedTextField ?? undefined}
                      multiSelectedRects={multiSelectedRects}
                      selectionBounds={selectionBounds}
                      marqueeRect={marqueeRect}
                      snapGuides={snapGuides}
                      showGuideOverlay={showGuideOverlay && isDraggingSelection}
                      guidePadding={guidePadding}
                      isInteractive={!isEditorInteractionLocked}
                      onCanvasDragStart={handleCanvasDragStart}
                      onCanvasDragMove={handleCanvasDragMove}
                      onCanvasDragEnd={handleCanvasDragEnd}
                      onOverlayDragStart={handleItemDragStart}
                      onOverlayDragMove={handleItemDragMove}
                      onOverlayDragEnd={handleItemDragEnd}
                      onOverlayResize={(index, width) => {
                        const nextOverlays = [...getCurrentOverlays()];
                        nextOverlays[index] = { ...nextOverlays[index], width };
                        scheduleOverlayPersist(nextOverlays);
                      }}
                      onSwipeStart={() => {
                        clearSelection();
                      }}
                      onTextFieldDragStart={(field, options) => {
                        handleItemDragStart(getTextItemId(field), options);
                      }}
                      onTextFieldDragMove={(field, options) => {
                        handleItemDragMove(getTextItemId(field), options);
                      }}
                      onTextFieldDragEnd={() => {
                        handleItemDragEnd();
                      }}
                      onTextFieldDoubleClick={(field) => {
                        setSelectedItemIds([getTextItemId(field)]);
                        setEditingTextField(field);
                      }}
                    />
                  </InstagramFrame>
                </PhoneMockup>
                {isReplayingHistory && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[2.5rem] bg-background/55 backdrop-blur-sm">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center shadow-sm">
                      <p className="text-sm font-medium text-amber-900">
                        실행 취소 상태를 동기화하는 중입니다
                      </p>
                      <p className="mt-1 text-xs text-amber-800">
                        저장 완료 후 다시 편집할 수 있어요.
                      </p>
                    </div>
                  </div>
                )}
                <InlineEditLayer
                  containerRef={previewContainerRef}
                  slideRef={activeSlideElement}
                  currentStyle={getCurrentStyle()}
                  currentContent={localContent ?? convexSlide.content ?? { title: "" }}
                  selectedField={isEditorInteractionLocked ? null : editingTextField}
                  onStyleChange={(partial) => {
                    scheduleStylePersist({
                      ...getCurrentStyle(),
                      ...partial,
                    });
                  }}
                  onFontChange={(fontId) => {
                    const font = getFontById(fontId);
                    scheduleStylePersist({
                      ...getCurrentStyle(),
                      fontFamily: font.family,
                    });
                  }}
                  onContentChange={handleContentChange}
                  onClose={() => setEditingTextField(null)}
                  originalContent={convexSlide.originalContent as SlideContent | undefined}
                  onResetField={handleResetFieldToOriginal}
                  textEffects={getCurrentStyle().textEffects}
                  onTextEffectsChange={(field, effects) => {
                    const currentStyle = getCurrentStyle();
                    const currentEffects = currentStyle.textEffects?.[field] ?? {};
                    scheduleStylePersist({
                      ...currentStyle,
                      textEffects: {
                        ...currentStyle.textEffects,
                        [field]: { ...currentEffects, ...effects },
                      },
                    });
                  }}
                />
              </div>

              {canGoToNextPreviewSlide && (
                <PreviewNavButton
                  direction="next"
                  onClick={() => {
                    goToSlide(safeIndex + 1);
                  }}
                />
              )}
            </div>
          </div>

          <AIChatPanel
            projectTitle={project.title}
            currentSlideNumber={safeIndex + 1}
            totalSlides={slides.length}
            isOpen={isAiChatOpen}
            scope={chatScope}
            selectedField={activeChatField}
            input={chatInput}
            onInputChange={setChatInput}
            messages={chatMessages}
            isPlanning={isPlanningEdit || isReplayingHistory}
            isInteractionLocked={isReplayingHistory}
            lockReason="실행 취소/다시 실행 반영 중에는 AI 편집 요청을 잠시 보낼 수 없습니다."
            onScopeChange={setChatScope}
            onSubmit={handleAiChatSubmit}
            onClose={() => setIsAiChatOpen(false)}
          />
        </div>
      </div>

      <AIChatDecisionDialog
        isOpen={pendingChatRenderModel !== null}
        model={pendingChatRenderModel}
        isApplying={isApplyingChatEdit}
        onApply={() => {
          void handleApplyPendingChatEdit();
        }}
        onCancel={handleCancelPendingChatEdit}
        onRetry={handleRetryPendingChatEdit}
      />
    </div>
  );
}
