"use client";

import type { CardNewsProject } from "@/types";
import ProjectCard from "./ProjectCard";

interface ProjectGridProps {
  projects: CardNewsProject[];
  selectedId: string | null;
  onSelect: (project: CardNewsProject) => void;
}

export default function ProjectGrid({
  projects,
  selectedId,
  onSelect,
}: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        저장된 카드뉴스가 없습니다
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          isSelected={selectedId === project.id}
          onClick={() => onSelect(project)}
        />
      ))}
    </div>
  );
}
