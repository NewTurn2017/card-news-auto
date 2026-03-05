"use client";

import type { CardNewsProject } from "@/types";

interface ProjectCardProps {
  project: CardNewsProject;
  onClick: () => void;
  isSelected: boolean;
}

export default function ProjectCard({
  project,
  onClick,
  isSelected,
}: ProjectCardProps) {
  const coverSlide = project.slides[0];
  const date = new Date(project.updatedAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${
        isSelected
          ? "border-accent bg-accent/5"
          : "border-border hover:border-muted"
      }`}
    >
      {/* Thumbnail */}
      <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-lg bg-zinc-900 p-4">
        <p className="line-clamp-3 text-center text-sm font-bold text-white">
          {coverSlide?.content.title || "제목 없음"}
        </p>
      </div>

      {/* Info */}
      <p className="line-clamp-1 text-sm font-medium">{project.title}</p>
      <p className="text-xs text-muted">{date}</p>
    </button>
  );
}
