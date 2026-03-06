"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Type,
  Palette,
  LayoutGrid,
  ImageIcon,
  ChevronDown,
  Copy,
  Save,
  FolderOpen,
  Trash2 as TrashIcon,
} from "lucide-react";
import SlideNavigation from "./SlideNavigation";
import ContentFields from "./ContentFields";
import ColorPresets from "./ColorPresets";
import FontSelector from "./FontSelector";
import LayoutSelector from "./LayoutSelector";
import ImageControls from "./ImageControls";
import SlideActions from "./SlideActions";
import ImproveModal from "./ImproveModal";
import type { SlideContent, SlideImage, SlideStyle } from "@/types";
import { colorPresets } from "@/data/presets";
import { getFontById, getFontByFamily } from "@/data/fonts";

interface EditorPanelProps {
  projectId: Id<"projects">;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slides: any[];
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
  localContent: SlideContent;
  onContentChange: (content: SlideContent) => void;
  onLocalStyleChange?: (style: SlideStyle | null) => void;
}

const ALL_SECTION_IDS = ["content", "style", "layout", "image"];

const SECTIONS = [
  { id: "content", label: "콘텐츠", icon: Type },
  { id: "style", label: "스타일", icon: Palette },
  { id: "layout", label: "레이아웃", icon: LayoutGrid },
  { id: "image", label: "이미지", icon: ImageIcon },
] as const;

const DEFAULT_STYLE: SlideStyle = {
  bgType: "solid",
  bgColor: "#0f0f0f",
  textColor: "#ffffff",
  accentColor: "#4ae3c0",
  fontFamily: "'Noto Sans KR', sans-serif",
};

function AccordionCard({
  label,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
      >
        <Icon size={16} className="text-muted" />
        <span>{label}</span>
        <ChevronDown
          size={16}
          className={`ml-auto text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`transition-all duration-200 ease-out overflow-hidden ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

export default function EditorPanel({
  projectId,
  slides,
  currentSlideIndex,
  onSlideChange,
  localContent,
  onContentChange,
  onLocalStyleChange,
}: EditorPanelProps) {
  // All sections open by default
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(ALL_SECTION_IDS)
  );
  const [isImproving, setIsImproving] = useState(false);
  const [showImproveModal, setShowImproveModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [showPresetLoad, setShowPresetLoad] = useState(false);

  // Local style state for instant slider feedback
  const [localStyle, setLocalStyle] = useState<SlideStyle | null>(null);
  const stylePendingRef = useRef(false);
  const styleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Convex mutations
  const updateSlideMutation = useMutation(api.slides.updateSlide);
  const updateStyleMutation = useMutation(api.slides.updateSlideStyle);
  const updateImageMutation = useMutation(api.slides.updateSlideImage);
  const deleteSlideMutation = useMutation(api.slides.deleteSlide);
  const createSlideMutation = useMutation(api.slides.createSlide);
  const updateLayoutMutation = useMutation(api.slides.updateSlideLayout);
  const applyStyleToAllMutation = useMutation(api.slides.applyStyleToAll);
  const improveSlideAction = useAction(api.actions.generate.improveSlide);

  // Style presets
  const stylePresets = useQuery(api.stylePresets.list) ?? [];
  const savePresetMutation = useMutation(api.stylePresets.save);
  const removePresetMutation = useMutation(api.stylePresets.remove);

  const slide = slides[currentSlideIndex];

  // Sync localStyle from server when no pending edits
  useEffect(() => {
    if (!stylePendingRef.current && slide) {
      setLocalStyle(slide.style ?? DEFAULT_STYLE);
    }
  }, [slide?.style, slide?._id]);

  // Reset localStyle and close modal on slide change
  useEffect(() => {
    stylePendingRef.current = false;
    if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
    if (slide) {
      setLocalStyle(slide.style ?? DEFAULT_STYLE);
    }
    setShowImproveModal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide?._id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
    };
  }, []);

  const flushStyleChange = useCallback(
    async (newStyle: SlideStyle, slideId: Id<"slides">) => {
      await updateStyleMutation({ slideId, style: newStyle });
      stylePendingRef.current = false;
    },
    [updateStyleMutation]
  );

  if (!slide) return null;

  const slideId: Id<"slides"> = slide._id;
  const currentStyle: SlideStyle = localStyle ?? slide.style ?? DEFAULT_STYLE;

  const goToSlide = (i: number) =>
    onSlideChange(Math.max(0, Math.min(i, slides.length - 1)));
  const nextSlide = () => goToSlide(currentSlideIndex + 1);
  const prevSlide = () => goToSlide(currentSlideIndex - 1);

  const handleImageChange = async (image: SlideImage | undefined) => {
    await updateImageMutation({
      slideId,
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
  };

  // Debounced style change - instant local update, delayed mutation
  const handleStyleChange = (styleOverride: Partial<SlideStyle>) => {
    const newStyle: SlideStyle = { ...currentStyle, ...styleOverride };
    setLocalStyle(newStyle);
    onLocalStyleChange?.(newStyle);
    stylePendingRef.current = true;

    if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
    styleTimerRef.current = setTimeout(() => {
      flushStyleChange(newStyle, slideId);
    }, 300);
  };

  // Color preset change - preserves font sizes
  const handleSetColorPreset = (presetId: string) => {
    const preset = colorPresets.find((p) => p.id === presetId);
    if (!preset) return;
    handleStyleChange({
      bgType: preset.bgType,
      bgColor: preset.bgColor ?? currentStyle.bgColor,
      gradientFrom: preset.gradientFrom,
      gradientTo: preset.gradientTo,
      gradientDirection: preset.gradientDirection,
      textColor: preset.textColor,
      accentColor: preset.accentColor,
      // Preserve existing values
      fontFamily: currentStyle.fontFamily,
      categorySize: currentStyle.categorySize,
      titleSize: currentStyle.titleSize,
      subtitleSize: currentStyle.subtitleSize,
      bodySize: currentStyle.bodySize,
      categoryColor: currentStyle.categoryColor,
      titleColor: currentStyle.titleColor,
      subtitleColor: currentStyle.subtitleColor,
      bodyColor: currentStyle.bodyColor,
    });
  };

  const handleSetGradient = (from: string, to: string, direction: string) => {
    handleStyleChange({
      bgType: "gradient",
      gradientFrom: from,
      gradientTo: to,
      gradientDirection: direction,
    });
  };

  const handleSetLayout = async (layoutId: string) => {
    await updateLayoutMutation({ slideId, layoutId });
  };

  const handleSetFontFamily = (fontId: string) => {
    const font = getFontById(fontId);
    handleStyleChange({ fontFamily: font.family });
  };

  const handleAddSlide = async () => {
    const lastSlide = slides[slides.length - 1];
    await createSlideMutation({
      projectId,
      order: slides.length,
      type: "content",
      layoutId: "center-left",
      content: { title: "새 슬라이드" },
      style: lastSlide?.style ?? DEFAULT_STYLE,
    });
  };

  const handleDeleteSlide = async () => {
    if (slides.length <= 1) return;
    await deleteSlideMutation({ slideId });
    if (currentSlideIndex >= slides.length - 1) {
      onSlideChange(slides.length - 2);
    }
  };

  const handleImprove = async (instruction: string) => {
    setIsImproving(true);
    try {
      const improved = await improveSlideAction({
        slideId,
        instruction,
      });
      await updateSlideMutation({
        slideId,
        content: {
          title: improved.title ?? slide.content?.title ?? "",
          category: slide.content?.category,
          subtitle: improved.subtitle ?? slide.content?.subtitle,
          body: improved.body ?? slide.content?.body,
          source: slide.content?.source,
        },
      });
      setShowImproveModal(false);
    } finally {
      setIsImproving(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleApplyToAll = async () => {
    await applyStyleToAllMutation({ projectId, style: currentStyle });
    showToast(`전체 ${slides.length}장에 스타일 적용 완료`);
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    const name = presetName.trim();
    const isOverwrite = stylePresets.some((p) => p.name === name);
    await savePresetMutation({ name, style: currentStyle });
    setPresetName("");
    setShowPresetSave(false);
    showToast(isOverwrite ? `"${name}" 프리셋 덮어쓰기 완료` : `"${name}" 프리셋 저장 완료`);
  };

  const handleLoadPreset = (name: string, style: SlideStyle) => {
    handleStyleChange(style);
    setShowPresetLoad(false);
    showToast(`"${name}" 프리셋 적용 완료`);
  };

  const handleDeletePreset = async (presetId: Id<"stylePresets">, name: string) => {
    await removePresetMutation({ presetId });
    showToast(`"${name}" 프리셋 삭제`);
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Determine which preset is active
  const matchedPreset =
    currentStyle.bgType === "gradient"
      ? "custom-gradient"
      : colorPresets.find(
          (p) => p.bgType === "solid" && p.bgColor === currentStyle.bgColor
        )?.id ?? "custom-solid";
  const colorPreset = matchedPreset;

  // Resolve stored CSS family string back to font ID for FontSelector
  const storedFamily = currentStyle.fontFamily;
  const fontId = storedFamily
    ? (getFontByFamily(storedFamily)?.id ?? "pretendard")
    : "pretendard";

  return (
    <div className="relative flex h-full flex-col">
      {/* Toast */}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-50 flex justify-center">
          <div
            className="pointer-events-auto rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lg"
            style={{ animation: "toast-in 0.2s ease-out" }}
          >
            {toast}
          </div>
        </div>
      )}

      {/* Sticky Top: Slide Navigation */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface p-4">
        <SlideNavigation
          current={currentSlideIndex}
          total={slides.length}
          onPrev={prevSlide}
          onNext={nextSlide}
          onAdd={handleAddSlide}
          onFirst={() => goToSlide(0)}
          onLast={() => goToSlide(slides.length - 1)}
        />
      </div>

      {/* Scrollable Accordion Body */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {SECTIONS.map((section) => (
          <AccordionCard
            key={section.id}
            label={section.label}
            icon={section.icon}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          >
            {section.id === "content" && (
              <ContentFields content={localContent} onChange={onContentChange} />
            )}
            {section.id === "style" && (
              <div className="flex flex-col gap-4">
                <FontSelector
                  selected={fontId}
                  onChange={handleSetFontFamily}
                />

                {/* Font Size Controls */}
                <div className="flex flex-col gap-3">
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-muted">
                    글씨 크기
                  </label>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>카테고리</span>
                      <span>{currentStyle.categorySize ?? 20}px</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={40}
                      value={currentStyle.categorySize ?? 20}
                      onChange={(e) =>
                        handleStyleChange({
                          categorySize: Number(e.target.value),
                        })
                      }
                      className="w-full accent-accent"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>제목</span>
                      <span>{currentStyle.titleSize ?? 52}px</span>
                    </div>
                    <input
                      type="range"
                      min={24}
                      max={80}
                      value={currentStyle.titleSize ?? 52}
                      onChange={(e) =>
                        handleStyleChange({
                          titleSize: Number(e.target.value),
                        })
                      }
                      className="w-full accent-accent"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>부제</span>
                      <span>{currentStyle.subtitleSize ?? 30}px</span>
                    </div>
                    <input
                      type="range"
                      min={14}
                      max={50}
                      value={currentStyle.subtitleSize ?? 30}
                      onChange={(e) =>
                        handleStyleChange({
                          subtitleSize: Number(e.target.value),
                        })
                      }
                      className="w-full accent-accent"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>본문</span>
                      <span>{currentStyle.bodySize ?? 24}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={40}
                      value={currentStyle.bodySize ?? 24}
                      onChange={(e) =>
                        handleStyleChange({
                          bodySize: Number(e.target.value),
                        })
                      }
                      className="w-full accent-accent"
                    />
                  </div>
                </div>

                {/* Text Color Controls */}
                <div className="flex flex-col gap-3">
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-muted">
                    글씨 색상
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <input
                        type="color"
                        value={currentStyle.categoryColor ?? currentStyle.accentColor}
                        onChange={(e) => handleStyleChange({ categoryColor: e.target.value })}
                        className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      />
                      <span className="text-xs text-muted">카테고리</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <input
                        type="color"
                        value={currentStyle.titleColor ?? currentStyle.textColor}
                        onChange={(e) => handleStyleChange({ titleColor: e.target.value })}
                        className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      />
                      <span className="text-xs text-muted">제목</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <input
                        type="color"
                        value={currentStyle.subtitleColor ?? currentStyle.textColor}
                        onChange={(e) => handleStyleChange({ subtitleColor: e.target.value })}
                        className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      />
                      <span className="text-xs text-muted">부제</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <input
                        type="color"
                        value={currentStyle.bodyColor ?? currentStyle.textColor}
                        onChange={(e) => handleStyleChange({ bodyColor: e.target.value })}
                        className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      />
                      <span className="text-xs text-muted">본문</span>
                    </div>
                  </div>
                </div>

                <ColorPresets
                  selected={colorPreset}
                  customSolidColor={currentStyle.bgColor ?? "#0f0f0f"}
                  gradientFrom={currentStyle.gradientFrom}
                  gradientTo={currentStyle.gradientTo}
                  gradientDirection={currentStyle.gradientDirection}
                  onChange={handleSetColorPreset}
                  onCustomSolidChange={(color) =>
                    handleStyleChange({ bgType: "solid", bgColor: color })
                  }
                  onGradientChange={handleSetGradient}
                />

                {/* Style Preset Actions */}
                <div className="flex flex-col gap-2">
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-muted">
                    스타일 프리셋
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setShowPresetSave((v) => !v);
                        setShowPresetLoad(false);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                    >
                      <Save size={13} />
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setShowPresetLoad((v) => !v);
                        setShowPresetSave(false);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                    >
                      <FolderOpen size={13} />
                      불러오기
                    </button>
                    <button
                      onClick={handleApplyToAll}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-2 py-2 text-xs text-accent transition-colors hover:bg-accent/10"
                    >
                      <Copy size={13} />
                      전체 적용
                    </button>
                  </div>

                  {/* Save Preset Input */}
                  {showPresetSave && (
                    <div className="flex gap-1.5 rounded-lg border border-border p-2">
                      <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                        placeholder="프리셋 이름"
                        className="flex-1 rounded-md border border-border bg-surface-hover px-2 py-1.5 text-xs text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
                      />
                      <button
                        onClick={handleSavePreset}
                        disabled={!presetName.trim()}
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                      >
                        저장
                      </button>
                    </div>
                  )}

                  {/* Load Preset List */}
                  {showPresetLoad && (
                    <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border">
                      {stylePresets.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-muted">
                          저장된 프리셋이 없습니다
                        </p>
                      ) : (
                        stylePresets.map((preset) => (
                          <div
                            key={preset._id}
                            className="flex items-center justify-between border-b border-border px-3 py-2 last:border-b-0 hover:bg-surface-hover"
                          >
                            <button
                              onClick={() => handleLoadPreset(preset.name, preset.style as SlideStyle)}
                              className="flex-1 text-left text-xs text-foreground"
                            >
                              <span className="font-medium">{preset.name}</span>
                              <span className="ml-2 text-muted">
                                {preset.style.bgType === "gradient"
                                  ? "그라데이션"
                                  : "단색"}
                              </span>
                            </button>
                            <button
                              onClick={() => handleDeletePreset(preset._id, preset.name)}
                              className="ml-2 rounded p-1 text-muted hover:bg-red-50 hover:text-red-500"
                            >
                              <TrashIcon size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {section.id === "layout" && (
              <LayoutSelector
                selected={slide.layoutId}
                onChange={handleSetLayout}
              />
            )}
            {section.id === "image" && (
              <ImageControls
                image={
                  slide.image
                    ? {
                        url: slide.image.externalUrl ?? "",
                        opacity: slide.image.opacity,
                        position: slide.image.position,
                        size: slide.image.size,
                        fit: slide.image.fit,
                      }
                    : undefined
                }
                onChange={handleImageChange}
              />
            )}
          </AccordionCard>
        ))}
      </div>

      {/* Sticky Bottom: Slide Actions */}
      <div className="sticky bottom-0 border-t border-border bg-surface p-4">
        <SlideActions
          onImprove={() => setShowImproveModal(true)}
          onDelete={handleDeleteSlide}
          canDelete={slides.length > 1}
          isImproving={isImproving}
        />
      </div>

      {/* Improve Modal */}
      <ImproveModal
        isOpen={showImproveModal}
        onClose={() => setShowImproveModal(false)}
        onImprove={handleImprove}
        content={localContent}
        isImproving={isImproving}
      />
    </div>
  );
}
