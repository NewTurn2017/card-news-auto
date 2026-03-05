import type { CardNewsProject } from "@/types";

const STORAGE_KEY = "card-news-projects";

export function listProjects(): CardNewsProject[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CardNewsProject[];
  } catch {
    return [];
  }
}

export function loadProject(id: string): CardNewsProject | null {
  const projects = listProjects();
  return projects.find((p) => p.id === id) ?? null;
}

export function saveProject(project: CardNewsProject): void {
  const projects = listProjects();
  const index = projects.findIndex((p) => p.id === project.id);
  const updated = { ...project, updatedAt: new Date().toISOString() };

  if (index >= 0) {
    projects[index] = updated;
  } else {
    projects.unshift(updated);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  const projects = listProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
