import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { CardNewsProject, CardSlide } from "@/types";
import { saveProject as persistProject, loadProject } from "@/lib/storage";

interface CardNewsStore {
  project: CardNewsProject | null;
  currentSlideIndex: number;
  generationStatus: "idle" | "planning" | "writing" | "done" | "error";
  generationProgress: number;
  isDirty: boolean;

  // Project actions
  setProject: (project: CardNewsProject) => void;
  loadProjectById: (id: string) => void;
  createNewProject: (sourceText: string, slides: CardSlide[]) => string;
  saveProject: () => void;

  // Slide actions
  updateSlide: (index: number, updates: Partial<CardSlide>) => void;
  setLayout: (slideIndex: number, layoutId: string) => void;
  setColorPreset: (slideIndex: number, preset: "light" | "dark") => void;
  addSlide: (afterIndex: number) => void;
  removeSlide: (index: number) => void;

  // Navigation
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;

  // Generation
  setGenerationStatus: (
    status: "idle" | "planning" | "writing" | "done" | "error"
  ) => void;
  setGenerationProgress: (progress: number) => void;
}

export const useCardNewsStore = create<CardNewsStore>((set, get) => ({
  project: null,
  currentSlideIndex: 0,
  generationStatus: "idle",
  generationProgress: 0,
  isDirty: false,

  setProject: (project) => set({ project, currentSlideIndex: 0, isDirty: false }),

  loadProjectById: (id) => {
    const project = loadProject(id);
    if (project) set({ project, currentSlideIndex: 0, isDirty: false });
  },

  createNewProject: (sourceText, slides) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const project: CardNewsProject = {
      id,
      title: slides[0]?.content.title || "새 카드뉴스",
      createdAt: now,
      updatedAt: now,
      sourceText,
      slides,
      settings: { profileName: "개발자의디자인" },
    };
    set({ project, currentSlideIndex: 0, isDirty: false });
    persistProject(project);
    return id;
  },

  saveProject: () => {
    const { project } = get();
    if (project) {
      persistProject(project);
      set({ isDirty: false });
    }
  },

  updateSlide: (index, updates) => {
    const { project } = get();
    if (!project) return;
    const slides = [...project.slides];
    slides[index] = { ...slides[index], ...updates };
    set({ project: { ...project, slides }, isDirty: true });
  },

  setLayout: (slideIndex, layoutId) => {
    const { updateSlide } = get();
    updateSlide(slideIndex, { layoutId });
  },

  setColorPreset: (slideIndex, preset) => {
    const { updateSlide } = get();
    updateSlide(slideIndex, { colorPreset: preset });
  },

  addSlide: (afterIndex) => {
    const { project } = get();
    if (!project) return;
    const newSlide: CardSlide = {
      id: uuidv4(),
      order: afterIndex + 1,
      type: "content",
      layoutId: "center-title",
      colorPreset: "dark",
      content: { title: "새 슬라이드", subtitle: "" },
      htmlContent: "",
    };
    const slides = [...project.slides];
    slides.splice(afterIndex + 1, 0, newSlide);
    slides.forEach((s, i) => (s.order = i));
    set({ project: { ...project, slides }, isDirty: true });
  },

  removeSlide: (index) => {
    const { project, currentSlideIndex } = get();
    if (!project || project.slides.length <= 1) return;
    const slides = project.slides.filter((_, i) => i !== index);
    slides.forEach((s, i) => (s.order = i));
    const newIndex = Math.min(currentSlideIndex, slides.length - 1);
    set({
      project: { ...project, slides },
      currentSlideIndex: newIndex,
      isDirty: true,
    });
  },

  goToSlide: (index) => {
    const { project } = get();
    if (!project) return;
    const clamped = Math.max(0, Math.min(index, project.slides.length - 1));
    set({ currentSlideIndex: clamped });
  },

  nextSlide: () => {
    const { project, currentSlideIndex } = get();
    if (!project) return;
    if (currentSlideIndex < project.slides.length - 1) {
      set({ currentSlideIndex: currentSlideIndex + 1 });
    }
  },

  prevSlide: () => {
    const { currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      set({ currentSlideIndex: currentSlideIndex - 1 });
    }
  },

  setGenerationStatus: (status) => set({ generationStatus: status }),
  setGenerationProgress: (progress) => set({ generationProgress: progress }),
}));
