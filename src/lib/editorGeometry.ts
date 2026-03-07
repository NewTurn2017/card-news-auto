import type { EditableTextField } from "@/types";

export const BASE_SLIDE_WIDTH = 1080;
export const BASE_SLIDE_HEIGHT = 1350;

export type CanvasItemId = `text:${EditableTextField}` | `overlay:${number}`;
export type CanvasItemKind = "text" | "overlay";

export interface BaseRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface LayoutPaddingGuides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MeasuredCanvasItem {
  id: CanvasItemId;
  kind: CanvasItemKind;
  rect: BaseRect;
  element: HTMLElement;
  field?: EditableTextField;
  index?: number;
}

export interface MeasuredCanvasState {
  items: MeasuredCanvasItem[];
  padding: LayoutPaddingGuides;
  slideRect: DOMRect | null;
}

export interface BasePoint {
  x: number;
  y: number;
}

export const EDITABLE_TEXT_FIELDS: EditableTextField[] = [
  "category",
  "title",
  "subtitle",
  "body",
];

const DEFAULT_PADDING: LayoutPaddingGuides = {
  top: 60,
  right: 60,
  bottom: 60,
  left: 60,
};

function createBaseRect(left: number, top: number, width: number, height: number): BaseRect {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);

  return {
    left,
    top,
    width: safeWidth,
    height: safeHeight,
    right: left + safeWidth,
    bottom: top + safeHeight,
    centerX: left + safeWidth / 2,
    centerY: top + safeHeight / 2,
  };
}

function parseCssPixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getTextItemId(field: EditableTextField): CanvasItemId {
  return `text:${field}`;
}

export function getOverlayItemId(index: number): CanvasItemId {
  return `overlay:${index}`;
}

export function parseCanvasItemId(id: CanvasItemId):
  | { kind: "text"; field: EditableTextField }
  | { kind: "overlay"; index: number } {
  if (id.startsWith("text:")) {
    return { kind: "text", field: id.replace("text:", "") as EditableTextField };
  }

  return {
    kind: "overlay",
    index: Number(id.replace("overlay:", "")),
  };
}

export function isTextItemId(id: CanvasItemId): id is `text:${EditableTextField}` {
  return id.startsWith("text:");
}

export function isOverlayItemId(id: CanvasItemId): id is `overlay:${number}` {
  return id.startsWith("overlay:");
}

export function domRectToBaseRect(rect: DOMRect, slideRect: DOMRect): BaseRect {
  const scaleX = slideRect.width / BASE_SLIDE_WIDTH;
  const scaleY = slideRect.height / BASE_SLIDE_HEIGHT;
  const left = (rect.left - slideRect.left) / scaleX;
  const top = (rect.top - slideRect.top) / scaleY;
  const width = rect.width / scaleX;
  const height = rect.height / scaleY;

  return createBaseRect(left, top, width, height);
}

export function baseRectFromPoints(start: BasePoint, end: BasePoint): BaseRect {
  return createBaseRect(
    Math.min(start.x, end.x),
    Math.min(start.y, end.y),
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y)
  );
}

export function clampDeltaToBounds(rect: BaseRect, dx: number, dy: number): BasePoint {
  let nextDx = dx;
  let nextDy = dy;

  if (rect.left + nextDx < 0) {
    nextDx = -rect.left;
  }
  if (rect.right + nextDx > BASE_SLIDE_WIDTH) {
    nextDx = BASE_SLIDE_WIDTH - rect.right;
  }
  if (rect.top + nextDy < 0) {
    nextDy = -rect.top;
  }
  if (rect.bottom + nextDy > BASE_SLIDE_HEIGHT) {
    nextDy = BASE_SLIDE_HEIGHT - rect.bottom;
  }

  return { x: nextDx, y: nextDy };
}

export function moveBaseRect(rect: BaseRect, dx: number, dy: number): BaseRect {
  return createBaseRect(rect.left + dx, rect.top + dy, rect.width, rect.height);
}

export function rectContainsPoint(rect: BaseRect, point: BasePoint): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

export function rectsIntersect(a: BaseRect, b: BaseRect): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

export function getBoundingRect(rects: BaseRect[]): BaseRect | null {
  if (rects.length === 0) return null;

  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return createBaseRect(left, top, right - left, bottom - top);
}

export function screenDeltaToBaseDelta(
  slideRect: DOMRect,
  startClientX: number,
  startClientY: number,
  nextClientX: number,
  nextClientY: number
): BasePoint {
  return {
    x: ((nextClientX - startClientX) / slideRect.width) * BASE_SLIDE_WIDTH,
    y: ((nextClientY - startClientY) / slideRect.height) * BASE_SLIDE_HEIGHT,
  };
}

export function clientPointToBasePoint(
  slideRect: DOMRect,
  clientX: number,
  clientY: number
): BasePoint {
  return {
    x: ((clientX - slideRect.left) / slideRect.width) * BASE_SLIDE_WIDTH,
    y: ((clientY - slideRect.top) / slideRect.height) * BASE_SLIDE_HEIGHT,
  };
}

export function measureCanvasItems(slideElement: HTMLDivElement | null): MeasuredCanvasState {
  if (!slideElement) {
    return {
      items: [],
      padding: DEFAULT_PADDING,
      slideRect: null,
    };
  }

  const slideRect = slideElement.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(slideElement);
  const padding: LayoutPaddingGuides = {
    top: parseCssPixels(computedStyle.paddingTop),
    right: parseCssPixels(computedStyle.paddingRight),
    bottom: parseCssPixels(computedStyle.paddingBottom),
    left: parseCssPixels(computedStyle.paddingLeft),
  };

  const items = Array.from(
    slideElement.querySelectorAll<HTMLElement>("[data-canvas-item-id]")
  ).flatMap((element) => {
    const rawId = element.dataset.canvasItemId;
    if (!rawId) return [];

    const id = rawId as CanvasItemId;
    const parsed = parseCanvasItemId(id);

    return [
      {
        id,
        kind: parsed.kind,
        field: parsed.kind === "text" ? parsed.field : undefined,
        index: parsed.kind === "overlay" ? parsed.index : undefined,
        element,
        rect: domRectToBaseRect(element.getBoundingClientRect(), slideRect),
      } satisfies MeasuredCanvasItem,
    ];
  });

  return {
    items,
    padding,
    slideRect,
  };
}
