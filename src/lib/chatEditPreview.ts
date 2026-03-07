import { getFontByFamily } from "@/data/fonts";
import type {
  CardSlide,
  SlideContent,
  SlideImage,
  SlideStyle,
  TextFieldEffects,
  TextAlignments,
} from "@/types";
import type {
  ChatEditOperation,
  ChatEditOperationChanges,
  ChatEditPlan,
  ChatEditTargetField,
} from "@/lib/chatEdit";

export interface ChatEditApplyPatch {
  slideIndex: number;
  content?: SlideContent;
  style?: SlideStyle;
  layoutId?: string;
  image?: SlideImage;
}

export interface ChatEditPreviewResult {
  slides: CardSlide[];
  patches: ChatEditApplyPatch[];
}

interface MutableApplyPatch {
  slideIndex: number;
  content?: SlideContent;
  style?: SlideStyle;
  layoutId?: string;
  image?: SlideImage;
}

const DEFAULT_IMAGE_POSITION: SlideImage["position"] = { x: 50, y: 50 };

const DEFAULT_STYLE: SlideStyle = {
  bgType: "solid",
  bgColor: "#0f0f0f",
  textColor: "#ffffff",
  accentColor: "#4ae3c0",
  fontFamily: "'Noto Sans KR', sans-serif",
};

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
  textPositions: SlideStyle["textPositions"],
): SlideStyle["textPositions"] | undefined {
  if (!textPositions) {
    return undefined;
  }

  return {
    category: textPositions.category ? { ...textPositions.category } : undefined,
    title: textPositions.title ? { ...textPositions.title } : undefined,
    subtitle: textPositions.subtitle ? { ...textPositions.subtitle } : undefined,
    body: textPositions.body ? { ...textPositions.body } : undefined,
  };
}

function cloneTextAlignments(
  textAlignments: SlideStyle["textAlignments"],
): SlideStyle["textAlignments"] | undefined {
  if (!textAlignments) {
    return undefined;
  }

  return {
    category: textAlignments.category,
    title: textAlignments.title,
    subtitle: textAlignments.subtitle,
    body: textAlignments.body,
  };
}

function cloneStyle(style?: SlideStyle): SlideStyle | undefined {
  if (!style) {
    return undefined;
  }

  return {
    ...style,
    textEffects: cloneTextEffects(style.textEffects),
    textPositions: cloneTextPositions(style.textPositions),
    textAlignments: cloneTextAlignments(style.textAlignments),
  };
}

function clearLayoutOverrides(
  style: SlideStyle | undefined,
  originalStyle: SlideStyle | undefined,
): SlideStyle | undefined {
  if (!style) {
    return undefined;
  }

  const nextStyle: SlideStyle = { ...style };

  if (nextStyle.textPositions) {
    delete nextStyle.textPositions;
  }

  const nextAlignments = nextStyle.textAlignments;
  const originalAlignments = originalStyle?.textAlignments;
  const alignmentsMatchOriginal =
    JSON.stringify(nextAlignments ?? null) === JSON.stringify(originalAlignments ?? null);

  if (alignmentsMatchOriginal && nextAlignments) {
    delete nextStyle.textAlignments;
  }

  return nextStyle;
}

function cloneImage(image?: SlideImage): SlideImage | undefined {
  if (!image) {
    return undefined;
  }

  return {
    ...image,
    position: { ...image.position },
    attribution: image.attribution ? { ...image.attribution } : undefined,
  };
}

function cloneSlide(slide: CardSlide): CardSlide {
  return {
    ...slide,
    content: cloneContent(slide.content),
    style: cloneStyle(slide.style),
    image: cloneImage(slide.image),
    overlays: slide.overlays?.map((overlay) => ({ ...overlay })),
  };
}

function getOrCreatePatch(
  patchMap: Map<number, MutableApplyPatch>,
  slideIndex: number,
): MutableApplyPatch {
  const existingPatch: MutableApplyPatch | undefined = patchMap.get(slideIndex);
  if (existingPatch) {
    return existingPatch;
  }

  const nextPatch: MutableApplyPatch = { slideIndex };
  patchMap.set(slideIndex, nextPatch);
  return nextPatch;
}

function getOperationSlideIndexes(
  slides: CardSlide[],
  currentSlideIndex: number,
  operation: ChatEditOperation,
): number[] {
  if (operation.type === "apply_style_to_all" || operation.slideRef === "all") {
    return slides.map((_, index) => index);
  }

  if (operation.slideRef === "current") {
    return [currentSlideIndex];
  }

  const match: RegExpMatchArray | null = operation.slideRef.match(/^slide-(\d+)$/);
  if (!match) {
    return [];
  }

  const slideIndex: number = Number(match[1]) - 1;
  if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= slides.length) {
    return [];
  }

  return [slideIndex];
}

function applyContentChanges(
  slide: CardSlide,
  patch: MutableApplyPatch,
  changes: ChatEditOperationChanges,
): void {
  const nextContent: SlideContent = {
    ...cloneContent(slide.content),
    ...(changes.category !== undefined ? { category: changes.category } : {}),
    ...(changes.title !== undefined ? { title: changes.title } : {}),
    ...(changes.subtitle !== undefined ? { subtitle: changes.subtitle } : {}),
    ...(changes.body !== undefined ? { body: changes.body } : {}),
  };

  slide.content = nextContent;
  patch.content = nextContent;
}

function applyStyleChanges(
  slide: CardSlide,
  patch: MutableApplyPatch,
  changes: ChatEditOperationChanges,
): void {
  const currentStyle: SlideStyle = cloneStyle(slide.style) ?? DEFAULT_STYLE;
  const nextTextAlignments: TextAlignments = {
    ...(currentStyle.textAlignments ?? {}),
    ...(changes.categoryAlignment !== undefined
      ? { category: changes.categoryAlignment }
      : {}),
    ...(changes.titleAlignment !== undefined ? { title: changes.titleAlignment } : {}),
    ...(changes.subtitleAlignment !== undefined
      ? { subtitle: changes.subtitleAlignment }
      : {}),
    ...(changes.bodyAlignment !== undefined ? { body: changes.bodyAlignment } : {}),
  };

  const nextStyle: SlideStyle = {
    ...currentStyle,
    ...(changes.bgType !== undefined ? { bgType: changes.bgType } : {}),
    ...(changes.bgColor !== undefined ? { bgColor: changes.bgColor } : {}),
    ...(changes.gradientFrom !== undefined ? { gradientFrom: changes.gradientFrom } : {}),
    ...(changes.gradientTo !== undefined ? { gradientTo: changes.gradientTo } : {}),
    ...(changes.gradientDirection !== undefined
      ? { gradientDirection: changes.gradientDirection }
      : {}),
    ...(changes.textColor !== undefined ? { textColor: changes.textColor } : {}),
    ...(changes.accentColor !== undefined ? { accentColor: changes.accentColor } : {}),
    ...(changes.fontFamily !== undefined ? { fontFamily: changes.fontFamily } : {}),
    ...(changes.categorySize !== undefined ? { categorySize: changes.categorySize } : {}),
    ...(changes.titleSize !== undefined ? { titleSize: changes.titleSize } : {}),
    ...(changes.subtitleSize !== undefined ? { subtitleSize: changes.subtitleSize } : {}),
    ...(changes.bodySize !== undefined ? { bodySize: changes.bodySize } : {}),
    ...(changes.categoryColor !== undefined ? { categoryColor: changes.categoryColor } : {}),
    ...(changes.titleColor !== undefined ? { titleColor: changes.titleColor } : {}),
    ...(changes.subtitleColor !== undefined ? { subtitleColor: changes.subtitleColor } : {}),
    ...(changes.bodyColor !== undefined ? { bodyColor: changes.bodyColor } : {}),
    ...(Object.keys(nextTextAlignments).length > 0
      ? { textAlignments: nextTextAlignments }
      : {}),
    ...(changes.titleLineHeight !== undefined
      ? { titleLineHeight: changes.titleLineHeight }
      : {}),
    ...(changes.subtitleLineHeight !== undefined
      ? { subtitleLineHeight: changes.subtitleLineHeight }
      : {}),
    ...(changes.bodyLineHeight !== undefined ? { bodyLineHeight: changes.bodyLineHeight } : {}),
    ...(changes.titleLetterSpacing !== undefined
      ? { titleLetterSpacing: changes.titleLetterSpacing }
      : {}),
    ...(changes.subtitleLetterSpacing !== undefined
      ? { subtitleLetterSpacing: changes.subtitleLetterSpacing }
      : {}),
    ...(changes.bodyLetterSpacing !== undefined
      ? { bodyLetterSpacing: changes.bodyLetterSpacing }
      : {}),
  };

  slide.style = nextStyle;
  patch.style = nextStyle;

  if (changes.fontFamily) {
    const nextFontId: string | undefined = getFontByFamily(changes.fontFamily)?.id;
    if (nextFontId) {
      slide.fontFamily = nextFontId;
    }
  }
}

function applyImageChanges(
  slide: CardSlide,
  patch: MutableApplyPatch,
  changes: ChatEditOperationChanges,
): void {
  if (changes.removeImage) {
    slide.image = undefined;
    patch.image = undefined;
    return;
  }

  const currentImage: SlideImage | undefined = cloneImage(slide.image);
  if (!currentImage && changes.externalUrl === undefined) {
    return;
  }

  const nextImage: SlideImage = {
    url: changes.externalUrl ?? currentImage?.url ?? "",
    opacity: changes.opacity ?? currentImage?.opacity ?? 60,
    position: currentImage?.position ?? { ...DEFAULT_IMAGE_POSITION },
    size: changes.size ?? currentImage?.size ?? 100,
    fit: changes.fit ?? currentImage?.fit ?? "cover",
    attribution: currentImage?.attribution,
  };

  slide.image = nextImage;
  patch.image = nextImage;
}

function applyTextEffectsChanges(
  slide: CardSlide,
  patch: MutableApplyPatch,
  targetField: ChatEditTargetField | undefined,
  changes: ChatEditOperationChanges,
): void {
  if (!targetField) {
    return;
  }

  const currentStyle: SlideStyle = cloneStyle(slide.style) ?? DEFAULT_STYLE;
  const currentFieldEffects: TextFieldEffects = {
    ...(currentStyle.textEffects?.[targetField] ?? {}),
  };
  const nextFieldEffects: TextFieldEffects = {
    ...currentFieldEffects,
    ...(changes.opacity !== undefined ? { opacity: changes.opacity } : {}),
    ...(changes.fontWeight !== undefined ? { fontWeight: changes.fontWeight } : {}),
    ...(changes.italic !== undefined ? { italic: changes.italic } : {}),
    ...(changes.underline !== undefined ? { underline: changes.underline } : {}),
    ...(changes.strikethrough !== undefined
      ? { strikethrough: changes.strikethrough }
      : {}),
    ...(changes.uppercase !== undefined ? { uppercase: changes.uppercase } : {}),
    ...(changes.shadowColor !== undefined ? { shadowColor: changes.shadowColor } : {}),
    ...(changes.shadowBlur !== undefined ? { shadowBlur: changes.shadowBlur } : {}),
    ...(changes.shadowX !== undefined ? { shadowX: changes.shadowX } : {}),
    ...(changes.shadowY !== undefined ? { shadowY: changes.shadowY } : {}),
    ...(changes.bgColor !== undefined ? { bgColor: changes.bgColor } : {}),
    ...(changes.bgPadding !== undefined ? { bgPadding: changes.bgPadding } : {}),
    ...(changes.bgRadius !== undefined ? { bgRadius: changes.bgRadius } : {}),
    ...(changes.strokeColor !== undefined ? { strokeColor: changes.strokeColor } : {}),
    ...(changes.strokeWidth !== undefined ? { strokeWidth: changes.strokeWidth } : {}),
  };

  const nextStyle: SlideStyle = {
    ...currentStyle,
    textEffects: {
      ...currentStyle.textEffects,
      [targetField]: nextFieldEffects,
    },
  };

  slide.style = nextStyle;
  patch.style = nextStyle;
}

export function buildChatEditPreviewResult(
  slides: CardSlide[],
  currentSlideIndex: number,
  plan: ChatEditPlan,
): ChatEditPreviewResult {
  const originalSlides: CardSlide[] = slides.map(cloneSlide);
  const nextSlides: CardSlide[] = slides.map(cloneSlide);
  const patchMap: Map<number, MutableApplyPatch> = new Map<number, MutableApplyPatch>();

  for (const operation of plan.operations) {
    const targetSlideIndexes: number[] = getOperationSlideIndexes(
      nextSlides,
      currentSlideIndex,
      operation,
    );

    for (const slideIndex of targetSlideIndexes) {
      const targetSlide: CardSlide | undefined = nextSlides[slideIndex];
      const originalSlide: CardSlide | undefined = originalSlides[slideIndex];
      if (!targetSlide) {
        continue;
      }

      const patch: MutableApplyPatch = getOrCreatePatch(patchMap, slideIndex);

      switch (operation.type) {
        case "update_content": {
          if (!operation.changes) {
            continue;
          }
          applyContentChanges(targetSlide, patch, operation.changes);
          break;
        }
        case "update_style":
        case "apply_style_to_all": {
          if (!operation.changes) {
            continue;
          }
          applyStyleChanges(targetSlide, patch, operation.changes);
          break;
        }
        case "update_layout": {
          if (!operation.layoutId) {
            continue;
          }

          targetSlide.layoutId = operation.layoutId;
          patch.layoutId = operation.layoutId;
          const nextStyle = clearLayoutOverrides(
            cloneStyle(targetSlide.style),
            originalSlide?.style,
          );
          if (nextStyle) {
            targetSlide.style = nextStyle;
            patch.style = nextStyle;
          }
          break;
        }
        case "update_image": {
          if (!operation.changes) {
            continue;
          }
          applyImageChanges(targetSlide, patch, operation.changes);
          break;
        }
        case "update_text_effects": {
          if (!operation.changes) {
            continue;
          }
          applyTextEffectsChanges(
            targetSlide,
            patch,
            operation.targetField,
            operation.changes,
          );
          break;
        }
      }
    }
  }

  return {
    slides: nextSlides,
    patches: Array.from(patchMap.values()).sort(
      (left: MutableApplyPatch, right: MutableApplyPatch) => left.slideIndex - right.slideIndex,
    ),
  };
}
