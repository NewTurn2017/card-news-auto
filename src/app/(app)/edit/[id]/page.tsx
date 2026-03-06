"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ArrowLeft, RefreshCw } from "lucide-react";
import EditorPanel from "@/components/editor/EditorPanel";
import PhoneMockup from "@/components/preview/PhoneMockup";
import InstagramFrame from "@/components/preview/InstagramFrame";
import SwipeCarousel from "@/components/preview/SwipeCarousel";
import ExportButton from "@/components/export/ExportButton";
import InlineEditLayer, { type SlideClickInfo } from "@/components/preview/InlineEditLayer";
import type { CardSlide, SlideContent, SlideStyle } from "@/types";
import { getFontById } from "@/data/fonts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConvexSlide(slide: any): CardSlide {
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
    htmlContent: "",
  };
}

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const allSlideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [slideClickInfo, setSlideClickInfo] = useState<SlideClickInfo | null>(null);

  // Optimistic UI state
  const [localContent, setLocalContent] = useState<SlideContent | null>(null);
  const [localStyle, setLocalStyle] = useState<SlideStyle | null>(null);
  const localSlideIdRef = useRef<string | null>(null); // tracks which slide localContent belongs to
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const projectId = params.id as Id<"projects">;
  const project = useQuery(api.projects.getProject, { projectId });
  const slides = useQuery(api.slides.getSlides, { projectId });
  const updateSlideMutation = useMutation(api.slides.updateSlide);
  const updateStyleMutation = useMutation(api.slides.updateSlideStyle);
  const createSlideMutation = useMutation(api.slides.createSlide);
  const styleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const safeIndex = slides
    ? Math.min(currentSlideIndex, Math.max(0, slides.length - 1))
    : 0;
  const convexSlide = slides?.[safeIndex];

  // Sync localContent from server when no pending edits
  useEffect(() => {
    if (!pendingRef.current && convexSlide) {
      setLocalContent(convexSlide.content ?? { title: "" });
      localSlideIdRef.current = convexSlide._id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexSlide?.content]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Reset local state on slide change
  useEffect(() => {
    if (convexSlide) {
      pendingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      setLocalContent(convexSlide.content ?? { title: "" });
      setLocalStyle(null);
      localSlideIdRef.current = convexSlide._id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex]);

  const handleContentChange = useCallback(
    (content: SlideContent) => {
      setLocalContent(content);
      pendingRef.current = true;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        if (!convexSlide) return;
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
        pendingRef.current = false;
      }, 500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convexSlide?._id, updateSlideMutation]
  );

  const goToSlide = useCallback(
    (i: number) => {
      if (!slides) return;
      setCurrentSlideIndex(Math.max(0, Math.min(i, slides.length - 1)));
    },
    [slides]
  );

  const handleAddSlide = useCallback(async () => {
    if (!slides) return;
    const lastSlide = slides[slides.length - 1];
    await createSlideMutation({
      projectId,
      order: slides.length,
      type: "content",
      layoutId: "center-left",
      content: { title: "새 슬라이드" },
      style: lastSlide?.style ?? {
        bgType: "solid",
        bgColor: "#0f0f0f",
        textColor: "#ffffff",
        accentColor: "#4ae3c0",
        fontFamily: "'Noto Sans KR', sans-serif",
      },
    });
  }, [slides, projectId, createSlideMutation]);

  // Dynamic preview sizing
  const [cardWidth, setCardWidth] = useState(324);
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 768;

      if (isMobile) {
        setCardWidth(Math.min(vw - 80, 300));
      } else {
        const phoneChrome = 130;
        const availableCardHeight = vh * 0.7 - phoneChrome;
        const w = availableCardHeight * (1080 / 1350);
        setCardWidth(Math.round(Math.min(Math.max(w, 280), 540)));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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

  // Build all slides with optimistic state for the editing slide
  // Only apply localContent if it belongs to the current slide (prevents stale data on slide switch)
  const isLocalContentFresh = localSlideIdRef.current === convexSlide._id;
  const allSlides: CardSlide[] = slides.map((s, i) => {
    const mapped = mapConvexSlide(s);
    if (i === safeIndex) {
      return {
        ...mapped,
        content: (isLocalContentFresh ? localContent : null) ?? s.content ?? { title: "" },
        style: localStyle ?? s.style,
      };
    }
    return mapped;
  });

  const previewScale = cardWidth / 1080;
  const cardHeight = cardWidth * (1350 / 1080);

  // Build export refs as array of ref-like objects
  const exportRefs = allSlideRefs.current.map((el) => ({ current: el }));

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
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
          <span className="hidden rounded-lg border border-border px-3 py-1.5 text-xs text-muted md:inline-flex">
            자동 저장
          </span>
          <button
            onClick={() => router.push("/create")}
            className="flex items-center gap-1.5 rounded-lg border border-border p-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:px-4 md:py-1.5"
          >
            <RefreshCw size={14} />
            <span className="hidden md:inline">다시 생성</span>
          </button>
          <ExportButton
            slideRefs={exportRefs}
            allSlideRefs={allSlideRefs}
            projectTitle={project.title}
            currentSlideIndex={safeIndex}
            totalSlides={slides.length}
          />
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex border-b border-border md:hidden">
        <button
          onClick={() => setMobileTab("edit")}
          className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors ${
            mobileTab === "edit"
              ? "border-b-2 border-accent text-accent"
              : "text-muted"
          }`}
        >
          편집
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors ${
            mobileTab === "preview"
              ? "border-b-2 border-accent text-accent"
              : "text-muted"
          }`}
        >
          미리보기
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor Panel */}
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
          />
        </div>

        {/* Right: Preview - centered */}
        <div
          className={`flex flex-1 flex-col items-center justify-center bg-surface-hover p-4 md:p-8 ${
            mobileTab !== "preview" ? "hidden md:flex" : ""
          }`}
        >
          <p className="mb-2 text-center text-[11px] text-muted">
            콘텐츠 내용을 클릭해서 수정하세요
          </p>
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
                  onSlideClick={(e) => setSlideClickInfo({ clientX: e.clientX, clientY: e.clientY, timestamp: Date.now() })}
                />
              </InstagramFrame>
            </PhoneMockup>
            <InlineEditLayer
              containerRef={previewContainerRef}
              slideRef={allSlideRefs.current[safeIndex] ?? null}
              currentStyle={localStyle ?? convexSlide.style ?? { bgType: "solid", bgColor: "#0f0f0f", textColor: "#ffffff", accentColor: "#4ae3c0", fontFamily: "'Noto Sans KR', sans-serif" }}
              currentContent={localContent ?? convexSlide.content ?? { title: "" }}
              onStyleChange={(partial) => {
                const current = localStyle ?? convexSlide.style ?? { bgType: "solid" as const, bgColor: "#0f0f0f", textColor: "#ffffff", accentColor: "#4ae3c0", fontFamily: "'Noto Sans KR', sans-serif" };
                const newStyle = { ...current, ...partial };
                setLocalStyle(newStyle);
                if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
                styleTimerRef.current = setTimeout(() => {
                  updateStyleMutation({ slideId: convexSlide._id as Id<"slides">, style: newStyle });
                }, 300);
              }}
              onFontChange={(fontId) => {
                const font = getFontById(fontId);
                const current = localStyle ?? convexSlide.style ?? { bgType: "solid" as const, bgColor: "#0f0f0f", textColor: "#ffffff", accentColor: "#4ae3c0", fontFamily: "'Noto Sans KR', sans-serif" };
                const newStyle = { ...current, fontFamily: font.family };
                setLocalStyle(newStyle);
                if (styleTimerRef.current) clearTimeout(styleTimerRef.current);
                styleTimerRef.current = setTimeout(() => {
                  updateStyleMutation({ slideId: convexSlide._id as Id<"slides">, style: newStyle });
                }, 300);
              }}
              onContentChange={handleContentChange}
              clickInfo={slideClickInfo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
