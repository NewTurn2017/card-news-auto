import type { Doc } from "../../convex/_generated/dataModel";
import type { CardSlide, SlideContent, SlideImage, SlideStyle } from "@/types";

export type EditableOverlay = NonNullable<CardSlide["overlays"]>[number];
export type EditableSlideImage = NonNullable<Doc<"slides">["image"]>;

export interface EditableSlideSnapshot {
  slideId: CardSlide["id"];
  layoutId: string;
  content: SlideContent;
  style: SlideStyle;
  image?: EditableSlideImage;
  overlays: EditableOverlay[];
}

export type EditorHistorySource =
  | "manual"
  | "ai_apply"
  | "preset"
  | "improve"
  | "apply_to_all";

export interface EditorHistoryPatch {
  slideId: CardSlide["id"];
  before: EditableSlideSnapshot;
  after: EditableSlideSnapshot;
}

export interface EditorHistoryEntry {
  id: string;
  source: EditorHistorySource;
  createdAt: number;
  focusSlideId: CardSlide["id"] | null;
  coalescingKey?: string;
  patches: EditorHistoryPatch[];
}

interface CreateHistoryEntryOptions {
  afterSlides: EditableSlideSnapshot[];
  beforeSlides: EditableSlideSnapshot[];
  coalescingKey?: string;
  createdAt?: number;
  focusSlideId: CardSlide["id"] | null;
  id?: string;
  source: EditorHistorySource;
}

interface ToEditableSlideSnapshotOptions {
  baseImage?: EditableSlideImage;
}

function cloneContent(content: SlideContent): SlideContent {
  return { ...content };
}

function cloneTextEffects(
  effects: SlideStyle["textEffects"],
): SlideStyle["textEffects"] | undefined {
  if (!effects) {
    return undefined;
  }

  return {
    category: effects.category ? { ...effects.category } : undefined,
    title: effects.title ? { ...effects.title } : undefined,
    subtitle: effects.subtitle ? { ...effects.subtitle } : undefined,
    body: effects.body ? { ...effects.body } : undefined,
  };
}

function cloneTextPositions(
  positions: SlideStyle["textPositions"],
): SlideStyle["textPositions"] | undefined {
  if (!positions) {
    return undefined;
  }

  return {
    category: positions.category ? { ...positions.category } : undefined,
    title: positions.title ? { ...positions.title } : undefined,
    subtitle: positions.subtitle ? { ...positions.subtitle } : undefined,
    body: positions.body ? { ...positions.body } : undefined,
  };
}

function cloneTextAlignments(
  alignments: SlideStyle["textAlignments"],
): SlideStyle["textAlignments"] | undefined {
  if (!alignments) {
    return undefined;
  }

  return {
    category: alignments.category,
    title: alignments.title,
    subtitle: alignments.subtitle,
    body: alignments.body,
  };
}

function cloneStyle(style: SlideStyle): SlideStyle {
  return {
    ...style,
    textEffects: cloneTextEffects(style.textEffects),
    textPositions: cloneTextPositions(style.textPositions),
    textAlignments: cloneTextAlignments(style.textAlignments),
  };
}

function cloneImage(image?: EditableSlideImage): EditableSlideImage | undefined {
  if (!image) {
    return undefined;
  }

  return {
    ...image,
    position: { ...image.position },
  };
}

function cloneOverlays(overlays: EditableOverlay[]): EditableOverlay[] {
  return overlays.map((overlay) => ({ ...overlay }));
}

export function cloneEditableSlideSnapshot(
  snapshot: EditableSlideSnapshot,
): EditableSlideSnapshot {
  return {
    slideId: snapshot.slideId,
    layoutId: snapshot.layoutId,
    content: cloneContent(snapshot.content),
    style: cloneStyle(snapshot.style),
    image: cloneImage(snapshot.image),
    overlays: cloneOverlays(snapshot.overlays),
  };
}

export function cloneEditableSlideSnapshots(
  slides: EditableSlideSnapshot[],
): EditableSlideSnapshot[] {
  return slides.map((slide) => cloneEditableSlideSnapshot(slide));
}

function normalizeComparableValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparableValue(item));
  }

  const normalizedEntries = Object.entries(value as Record<string, unknown>)
    .filter(([, nestedValue]) => nestedValue !== undefined)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(
      ([key, nestedValue]) =>
        [key, normalizeComparableValue(nestedValue)] as const,
    );

  return Object.fromEntries(normalizedEntries);
}

export function areEditableSlideSnapshotsEqual(
  left: EditableSlideSnapshot,
  right: EditableSlideSnapshot,
): boolean {
  return (
    JSON.stringify(normalizeComparableValue(left)) ===
    JSON.stringify(normalizeComparableValue(right))
  );
}

export function createHistoryEntryFromSnapshots({
  afterSlides,
  beforeSlides,
  coalescingKey,
  createdAt = Date.now(),
  focusSlideId,
  id = crypto.randomUUID(),
  source,
}: CreateHistoryEntryOptions): EditorHistoryEntry | null {
  const afterById = new Map(afterSlides.map((slide) => [slide.slideId, slide]));
  const beforeById = new Map(beforeSlides.map((slide) => [slide.slideId, slide]));
  const slideIds = new Set([...beforeById.keys(), ...afterById.keys()]);

  const patches: EditorHistoryPatch[] = [];

  for (const slideId of slideIds) {
    const before = beforeById.get(slideId);
    const after = afterById.get(slideId);

    if (!before || !after) {
      continue;
    }

    if (areEditableSlideSnapshotsEqual(before, after)) {
      continue;
    }

    patches.push({
      slideId,
      before: cloneEditableSlideSnapshot(before),
      after: cloneEditableSlideSnapshot(after),
    });
  }

  if (patches.length === 0) {
    return null;
  }

  return {
    id,
    source,
    createdAt,
    focusSlideId,
    coalescingKey,
    patches,
  };
}

export function canCoalesceHistoryEntry(
  previous: EditorHistoryEntry | undefined,
  next: EditorHistoryEntry,
  maxAgeMs: number,
): boolean {
  if (!previous) {
    return false;
  }

  if (previous.source !== next.source) {
    return false;
  }

  if (!previous.coalescingKey || !next.coalescingKey) {
    return false;
  }

  if (previous.coalescingKey !== next.coalescingKey) {
    return false;
  }

  return next.createdAt - previous.createdAt <= maxAgeMs;
}

export function mergeHistoryEntries(
  previous: EditorHistoryEntry,
  next: EditorHistoryEntry,
): EditorHistoryEntry {
  const patchMap = new Map<CardSlide["id"], EditorHistoryPatch>();

  for (const patch of previous.patches) {
    patchMap.set(patch.slideId, {
      slideId: patch.slideId,
      before: cloneEditableSlideSnapshot(patch.before),
      after: cloneEditableSlideSnapshot(patch.after),
    });
  }

  for (const patch of next.patches) {
    const existing = patchMap.get(patch.slideId);
    if (existing) {
      patchMap.set(patch.slideId, {
        slideId: patch.slideId,
        before: existing.before,
        after: cloneEditableSlideSnapshot(patch.after),
      });
      continue;
    }

    patchMap.set(patch.slideId, {
      slideId: patch.slideId,
      before: cloneEditableSlideSnapshot(patch.before),
      after: cloneEditableSlideSnapshot(patch.after),
    });
  }

  return {
    ...previous,
    createdAt: next.createdAt,
    focusSlideId: next.focusSlideId,
    patches: [...patchMap.values()],
  };
}

export function limitUndoStack(
  stack: EditorHistoryEntry[],
  maxEntries: number,
): EditorHistoryEntry[] {
  if (stack.length <= maxEntries) {
    return stack;
  }

  return stack.slice(stack.length - maxEntries);
}

export function toEditableSnapshotImage(
  image: SlideImage | undefined,
  baseImage?: EditableSlideImage,
): EditableSlideImage | undefined {
  if (!image) {
    return undefined;
  }

  const shouldReuseBaseImage = (baseImage?.externalUrl ?? "") === image.url;

  return {
    ...(shouldReuseBaseImage && baseImage?.storageId
      ? { storageId: baseImage.storageId }
      : {}),
    ...(image.url ? { externalUrl: image.url } : {}),
    opacity: image.opacity,
    position: { ...image.position },
    size: image.size,
    fit: image.fit,
  };
}

export function toEditableSlideSnapshot(
  slide: CardSlide,
  options: ToEditableSlideSnapshotOptions = {},
): EditableSlideSnapshot {
  return {
    slideId: slide.id,
    layoutId: slide.layoutId,
    content: cloneContent(slide.content),
    style: cloneStyle(slide.style ?? {
      bgType: "solid",
      bgColor: "#0f0f0f",
      textColor: "#ffffff",
      accentColor: "#4ae3c0",
      fontFamily: "'Noto Sans KR', sans-serif",
    }),
    image: toEditableSnapshotImage(slide.image, options.baseImage),
    overlays: cloneOverlays(slide.overlays ?? []),
  };
}
