"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { listProjects, deleteProject } from "@/lib/storage";
import ProjectGrid from "@/components/projects/ProjectGrid";
import PhoneMockup from "@/components/preview/PhoneMockup";
import InstagramFrame from "@/components/preview/InstagramFrame";
import CardSlideRenderer from "@/components/preview/CardSlideRenderer";
import type { CardNewsProject } from "@/types";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<CardNewsProject[]>([]);
  const [selected, setSelected] = useState<CardNewsProject | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  useEffect(() => {
    setProjects(listProjects());
  }, []);

  const handleSelect = (project: CardNewsProject) => {
    setSelected(project);
    setPreviewSlideIndex(0);
  };

  const handleOpen = () => {
    if (selected) router.push(`/edit/${selected.id}`);
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteProject(selected.id);
    setProjects((prev) => prev.filter((p) => p.id !== selected.id));
    setSelected(null);
  };

  const previewScale = 324 / 1080;

  return (
    <div className="flex h-full">
      {/* Left: Project list */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">작업목록</h1>
          <button
            onClick={() => router.push("/create")}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover"
          >
            만들기
          </button>
        </div>
        <ProjectGrid
          projects={projects}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
      </div>

      {/* Right: Preview */}
      {selected && (
        <div className="flex w-[400px] shrink-0 flex-col items-center justify-center gap-4 border-l border-border p-6">
          <PhoneMockup>
            <InstagramFrame
              profileName={selected.settings.profileName}
              totalSlides={selected.slides.length}
              currentSlide={previewSlideIndex}
              onSlideSelect={setPreviewSlideIndex}
            >
              <div
                style={{
                  width: 324,
                  height: 324 * (1350 / 1080),
                  overflow: "hidden",
                }}
              >
                {selected.slides[previewSlideIndex] && (
                  <CardSlideRenderer
                    slide={selected.slides[previewSlideIndex]}
                    scale={previewScale}
                  />
                )}
              </div>
            </InstagramFrame>
          </PhoneMockup>

          <div className="flex gap-2">
            <button
              onClick={handleOpen}
              className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-background hover:bg-accent-hover"
            >
              편집
            </button>
            <button
              onClick={handleDelete}
              className="rounded-lg border border-border px-4 py-2 text-sm text-red-400 hover:bg-red-400/10"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
