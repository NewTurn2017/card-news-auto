export interface CardNewsProject {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceText: string;
  sourceUrl?: string;
  slides: CardSlide[];
  settings: ProjectSettings;
}

export interface CardSlide {
  id: string;
  order: number;
  type: "cover" | "content" | "ending";
  layoutId: string;
  colorPreset: "light" | "dark";
  content: SlideContent;
  image?: SlideImage;
  htmlContent: string;
}

export interface SlideContent {
  category?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  source?: string;
}

export interface SlideImage {
  url: string;
  opacity: number;
  position: { x: number; y: number };
  size: number;
  fit: "cover" | "contain" | "fill";
}

export interface ProjectSettings {
  profileName: string;
  profileAvatar?: string;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  className: string;
  textPosition: "top" | "center" | "bottom" | "top-left" | "bottom-left";
  textAlign: "left" | "center" | "right";
}

export interface ColorPreset {
  id: "light" | "dark";
  name: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  subtextColor: string;
}

export interface GenerateRequest {
  sourceText: string;
  slideCount?: number;
}

export interface GenerateEvent {
  type: "phase" | "slide" | "complete" | "error";
  phase?: "planning" | "writing";
  progress?: number;
  slideIndex?: number;
  data?: unknown;
  error?: string;
}
