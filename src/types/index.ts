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
  colorPreset: string;
  fontFamily?: string;
  style?: SlideStyle;
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
  attribution?: {
    name: string;
    profileUrl: string;
    source: "unsplash" | "pexels";
  };
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
  textPosition: "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
  textAlign: "left" | "center" | "right";
}

export interface ColorPreset {
  id: string;
  name: string;
  bgType: "solid" | "gradient";
  bgColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: string;
  textColor: string;
  accentColor: string;
  subtextColor?: string;
}

export interface SlideStyle {
  bgType: "solid" | "gradient";
  bgColor: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  categorySize?: number;
  titleSize?: number;
  subtitleSize?: number;
  bodySize?: number;
  categoryColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  bodyColor?: string;
  titleLineHeight?: number;
  titleLetterSpacing?: number;
  subtitleLineHeight?: number;
  subtitleLetterSpacing?: number;
  bodyLineHeight?: number;
  bodyLetterSpacing?: number;
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
