"use client";

import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
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
  type LucideIcon,
} from "lucide-react";
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
import { getFontById } from "@/data/fonts";

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

type Overlay = NonNullable<CardSlide["overlays"]>[number];
type AlignCommand = (typeof BLOCK_ALIGN_ACTIONS)[number]["command"];
type TextAlignCommand = (typeof TEXT_ALIGN_ACTIONS)[number]["alignment"];
type SaveSource = "content" | "style" | "overlay" | "image" | "editor-panel-style";

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
  return {
    id: slide._id,
    order: slide.order,
    type: slide.type,
    layoutId: slide.layoutId,
    colorPreset: slide.style?.bgType === "gradient" ? "custom-gradient" : "dark",
    content: slide.content,
    style: slide.style,
    fontFamily: slide.style?.fontFamily ?? "pretendard",
    image: slide.image
      ? {
          url: slide.image.externalUrl ?? "",
          opacity: slide.image.opacity,
          position: slide.image.position,
          size: slide.image.size,
          fit: slide.image.fit,
        }
      : undefined,
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

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const allSlideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const marqueeSessionRef = useRef<MarqueeSession | null>(null);
  const initializedSlideIdRef = useRef<string | null>(null);

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

  const [localContent, setLocalContent] = useState<SlideContent | null>(null);
  const [localStyle, setLocalStyle] = useState<SlideStyle | null>(null);
  const [localOverlays, setLocalOverlays] = useState<Overlay[] | null>(null);
  const [localImage, setLocalImage] = useState<SlideImage | null | undefined>(undefined);

  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stylePendingRef = useRef(false);
  const overlayPendingRef = useRef(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const imagePendingRef = useRef(false);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const styleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeSaveSourcesRef = useRef<Set<SaveSource>>(new Set());

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
  const resetFieldMutation = useMutation(api.slides.resetFieldToOriginal);
  const updateOverlaysMutation = useMutation(api.slides.updateSlideOverlays);
  const applyOverlaysToAllMutation = useMutation(api.slides.applyOverlaysToAll);

  const safeIndex = slides ? Math.min(currentSlideIndex, Math.max(0, slides.length - 1)) : 0;
  const convexSlide = slides?.[safeIndex];

  const getCurrentStyle = useCallback((): SlideStyle => {
    return localStyle ?? (convexSlide?.style as SlideStyle | undefined) ?? DEFAULT_STYLE;
  }, [convexSlide, localStyle]);

  const getCurrentOverlays = useCallback((): Overlay[] => {
    return localOverlays ?? (convexSlide?.overlays as Overlay[] | undefined) ?? [];
  }, [convexSlide, localOverlays]);

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

  const scheduleStylePersist = useCallback(
    (nextStyle: SlideStyle) => {
      if (!convexSlide) return;
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
    [convexSlide, finalizeSaveSource, markSaveSourcePending, updateStyleMutation]
  );

  const scheduleOverlayPersist = useCallback(
    (nextOverlays: Overlay[]) => {
      if (!convexSlide) return;
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
    [convexSlide, finalizeSaveSource, markSaveSourcePending, updateOverlaysMutation]
  );

  const handleContentChange = useCallback(
    (content: SlideContent) => {
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
    [convexSlide, finalizeSaveSource, markSaveSourcePending, updateSlideMutation]
  );

  useEffect(() => {
    if (pendingRef.current || !convexSlide) return;

    const rafId = window.requestAnimationFrame(() => {
      setLocalContent(convexSlide.content ?? { title: "" });
      setLocalContentSlideId(convexSlide._id);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [convexSlide?.content, convexSlide]);

  useEffect(() => {
    if (stylePendingRef.current || !convexSlide) return;

    const rafId = window.requestAnimationFrame(() => {
      setLocalStyle((convexSlide.style as SlideStyle | undefined) ?? DEFAULT_STYLE);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [convexSlide?.style, convexSlide]);

  useEffect(() => {
    if (overlayPendingRef.current || !convexSlide) return;

    const rafId = window.requestAnimationFrame(() => {
      setLocalOverlays((convexSlide.overlays as Overlay[] | undefined) ?? []);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [convexSlide?.overlays, convexSlide]);

  useEffect(() => {
    if (imagePendingRef.current || !convexSlide) return;

    const rafId = window.requestAnimationFrame(() => {
      setLocalImage(
        convexSlide.image
          ? {
              url: convexSlide.image.externalUrl ?? "",
              opacity: convexSlide.image.opacity,
              position: convexSlide.image.position,
              size: convexSlide.image.size,
              fit: convexSlide.image.fit,
            }
          : null
      );
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [convexSlide?.image, convexSlide]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
      if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
    };
  }, []);

  useEffect(() => {
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
      setLocalOverlays((convexSlide.overlays as Overlay[] | undefined) ?? []);
      setLocalImage(
        convexSlide.image
          ? {
              url: convexSlide.image.externalUrl ?? "",
              opacity: convexSlide.image.opacity,
              position: convexSlide.image.position,
              size: convexSlide.image.size,
              fit: convexSlide.image.fit,
            }
          : null
      );
      clearSelection();
      setLocalContentSlideId(convexSlide._id);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [clearSelection, convexSlide]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearSelection]);

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

  const selectedTextAlignment = useMemo<TextAlignCommand | null>(() => {
    if (selectedTextFields.length === 0) return null;

    const currentStyle = getCurrentStyle();
    const alignments = selectedTextFields.map((field) =>
      getResolvedTextAlignment(currentStyle, convexSlide?.layoutId, field)
    );

    return alignments.every((alignment) => alignment === alignments[0]) ? alignments[0] : null;
  }, [convexSlide?.layoutId, getCurrentStyle, selectedTextFields]);

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
        buildStyleWithTextAlignments(currentStyle, convexSlide?.layoutId, nextTextAlignments)
      );
    },
    [convexSlide?.layoutId, getCurrentStyle, scheduleStylePersist, selectedTextFields]
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

  const isLocalContentFresh = localContentSlideId === convexSlide._id;
  const allSlides: CardSlide[] = slides.map((slide, index) => {
    const mapped = mapConvexSlide(slide);
    if (index === safeIndex) {
      return {
        ...mapped,
        content: (isLocalContentFresh ? localContent : null) ?? slide.content ?? { title: "" },
        style: localStyle ?? slide.style,
        overlays: localOverlays ?? mapped.overlays,
        image: localImage !== undefined ? (localImage ?? undefined) : mapped.image,
      };
    }
    return mapped;
  });

  const previewScale = cardWidth / BASE_SLIDE_WIDTH;
  const cardHeight = cardWidth * (BASE_SLIDE_HEIGHT / BASE_SLIDE_WIDTH);
  const canGoToPreviousPreviewSlide = isDesktopCanvas && safeIndex > 0;
  const canGoToNextPreviewSlide = isDesktopCanvas && safeIndex < allSlides.length - 1;
  const autosaveStatusMeta = SAVE_STATUS_META[autosaveStatus];

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
            onLocalStyleChange={setLocalStyle}
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
              setLocalOverlays(nextOverlays);
              updateOverlaysMutation({
                slideId: convexSlide._id as Id<"slides">,
                overlays: nextOverlays as Parameters<typeof updateOverlaysMutation>[0]["overlays"],
              });
            }}
            onApplyOverlaysToAll={() => {
              const current = getCurrentOverlays();
              if (current.length === 0) return;
              applyOverlaysToAllMutation({
                projectId,
                overlays: current as Parameters<typeof applyOverlaysToAllMutation>[0]["overlays"],
              });
            }}
            localImage={localImage !== undefined ? (localImage ?? undefined) : undefined}
            onImageChange={(image: SlideImage | undefined) => {
              setLocalImage(image ?? null);
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
                      image: image
                        ? {
                            externalUrl: image.url,
                            opacity: image.opacity,
                            position: image.position,
                            size: image.size,
                            fit: image.fit,
                          }
                        : undefined,
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
            }}
          />
        </div>

        <div
          className={`flex flex-1 flex-col items-center justify-center bg-surface-hover p-4 md:p-8 ${
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
                    allowSwipe={!isDesktopCanvas}
                    allowCanvasSelection={isDesktopCanvas}
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
                    isInteractive={true}
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
              <InlineEditLayer
                containerRef={previewContainerRef}
                slideRef={activeSlideElement}
                currentStyle={getCurrentStyle()}
                currentContent={localContent ?? convexSlide.content ?? { title: "" }}
                selectedField={editingTextField}
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
                onResetField={async (field) => {
                  await resetFieldMutation({
                    slideId: convexSlide._id as Id<"slides">,
                    field,
                  });
                }}
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
      </div>
    </div>
  );
}
