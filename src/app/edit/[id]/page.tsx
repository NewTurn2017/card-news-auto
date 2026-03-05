"use client";

import { useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCardNewsStore } from "@/store/card-news-store";
import EditorPanel from "@/components/editor/EditorPanel";
import PhoneMockup from "@/components/preview/PhoneMockup";
import InstagramFrame from "@/components/preview/InstagramFrame";
import CardSlideRenderer from "@/components/preview/CardSlideRenderer";
import SlideNavigation from "@/components/editor/SlideNavigation";
import { exportSlideToPng } from "@/lib/export-png";

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const slideRef = useRef<HTMLDivElement>(null);
  const {
    project,
    currentSlideIndex,
    loadProjectById,
    saveProject,
    goToSlide,
    nextSlide,
    prevSlide,
    addSlide,
  } = useCardNewsStore();

  useEffect(() => {
    if (params.id && typeof params.id === "string") {
      const store = useCardNewsStore.getState();
      // Only load from storage if we don't already have this project in memory
      if (!store.project || store.project.id !== params.id) {
        loadProjectById(params.id);
      }
    }
  }, [params.id, loadProjectById]);

  const handleExportPng = useCallback(async () => {
    if (!slideRef.current || !project) return;
    const slideName = `card-news-${currentSlideIndex + 1}.png`;
    await exportSlideToPng(slideRef.current, slideName);
  }, [currentSlideIndex, project]);

  const handleRegenerate = useCallback(() => {
    if (!project) return;
    router.push("/create");
  }, [project, router]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        프로젝트를 불러오는 중...
      </div>
    );
  }

  const currentSlide = project.slides[currentSlideIndex];
  if (!currentSlide) return null;

  // Calculate scale to fit within iPhone mockup (~324px content width)
  const previewScale = 324 / 1080;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <button
            onClick={() => router.push("/projects")}
            className="hover:text-foreground"
          >
            목록
          </button>
          <span>›</span>
          <span>카드뉴스 만들기</span>
          <span>›</span>
          <span className="text-foreground">편집</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveProject}
            className="rounded-lg border border-border px-4 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
          >
            💾 저장
          </button>
          <button
            onClick={handleRegenerate}
            className="rounded-lg border border-border px-4 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
          >
            🔄 다시 생성
          </button>
          <button
            onClick={handleExportPng}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-background hover:bg-accent-hover"
          >
            📥 내보내기 (PNG)
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor Panel */}
        <div className="w-[400px] shrink-0 border-r border-border overflow-y-auto">
          <EditorPanel />
        </div>

        {/* Right: Preview */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-8">
          <PhoneMockup>
            <InstagramFrame
              profileName={project.settings.profileName}
              totalSlides={project.slides.length}
              currentSlide={currentSlideIndex}
              onSlideSelect={goToSlide}
            >
              <div
                style={{
                  width: 324,
                  height: 324 * (1350 / 1080),
                  overflow: "hidden",
                }}
              >
                <CardSlideRenderer
                  ref={slideRef}
                  slide={currentSlide}
                  scale={previewScale}
                />
              </div>
            </InstagramFrame>
          </PhoneMockup>

          {/* Bottom pagination */}
          <SlideNavigation
            current={currentSlideIndex}
            total={project.slides.length}
            onPrev={prevSlide}
            onNext={nextSlide}
            onAdd={() => addSlide(currentSlideIndex)}
            onFirst={() => goToSlide(0)}
            onLast={() => goToSlide(project.slides.length - 1)}
          />
        </div>
      </div>
    </div>
  );
}
