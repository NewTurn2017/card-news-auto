import {
  BASE_SLIDE_HEIGHT,
  BASE_SLIDE_WIDTH,
  type BaseRect,
  type LayoutPaddingGuides,
} from "@/lib/editorGeometry";

export interface SnapGuide {
  orientation: "vertical" | "horizontal";
  position: number;
  start: number;
  end: number;
}

interface SnapCandidate {
  orientation: "vertical" | "horizontal";
  position: number;
  start: number;
  end: number;
  kind: "canvas" | "object";
}

interface SnapAxisMatch {
  delta: number;
  guide: SnapGuide;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

interface SnapOptions {
  movingRect: BaseRect;
  dx: number;
  dy: number;
  otherRects: BaseRect[];
  padding: LayoutPaddingGuides;
  threshold?: number;
}

const DEFAULT_THRESHOLD = 10;
const GUIDE_MARGIN = 24;

function verticalCandidate(
  position: number,
  start: number,
  end: number,
  kind: SnapCandidate["kind"]
): SnapCandidate {
  return { orientation: "vertical", position, start, end, kind };
}

function horizontalCandidate(
  position: number,
  start: number,
  end: number,
  kind: SnapCandidate["kind"]
): SnapCandidate {
  return { orientation: "horizontal", position, start, end, kind };
}

function getVerticalCandidates(padding: LayoutPaddingGuides, otherRects: BaseRect[]): SnapCandidate[] {
  return [
    verticalCandidate(0, 0, BASE_SLIDE_HEIGHT, "canvas"),
    verticalCandidate(BASE_SLIDE_WIDTH / 2, 0, BASE_SLIDE_HEIGHT, "canvas"),
    verticalCandidate(BASE_SLIDE_WIDTH, 0, BASE_SLIDE_HEIGHT, "canvas"),
    verticalCandidate(padding.left, padding.top, BASE_SLIDE_HEIGHT - padding.bottom, "canvas"),
    verticalCandidate(
      BASE_SLIDE_WIDTH - padding.right,
      padding.top,
      BASE_SLIDE_HEIGHT - padding.bottom,
      "canvas"
    ),
    ...otherRects.flatMap((rect) => [
      verticalCandidate(rect.left, rect.top, rect.bottom, "object"),
      verticalCandidate(rect.centerX, rect.top, rect.bottom, "object"),
      verticalCandidate(rect.right, rect.top, rect.bottom, "object"),
    ]),
  ];
}

function getHorizontalCandidates(padding: LayoutPaddingGuides, otherRects: BaseRect[]): SnapCandidate[] {
  return [
    horizontalCandidate(0, 0, BASE_SLIDE_WIDTH, "canvas"),
    horizontalCandidate(BASE_SLIDE_HEIGHT / 2, 0, BASE_SLIDE_WIDTH, "canvas"),
    horizontalCandidate(BASE_SLIDE_HEIGHT, 0, BASE_SLIDE_WIDTH, "canvas"),
    horizontalCandidate(padding.top, padding.left, BASE_SLIDE_WIDTH - padding.right, "canvas"),
    horizontalCandidate(
      BASE_SLIDE_HEIGHT - padding.bottom,
      padding.left,
      BASE_SLIDE_WIDTH - padding.right,
      "canvas"
    ),
    ...otherRects.flatMap((rect) => [
      horizontalCandidate(rect.top, rect.left, rect.right, "object"),
      horizontalCandidate(rect.centerY, rect.left, rect.right, "object"),
      horizontalCandidate(rect.bottom, rect.left, rect.right, "object"),
    ]),
  ];
}

function getVerticalGuide(
  candidate: SnapCandidate,
  movingRect: BaseRect,
  dy: number
): SnapGuide {
  const movedTop = movingRect.top + dy;
  const movedBottom = movingRect.bottom + dy;

  if (candidate.kind === "object") {
    return {
      orientation: "vertical",
      position: candidate.position,
      start: Math.max(0, Math.min(candidate.start, movedTop) - GUIDE_MARGIN),
      end: Math.min(BASE_SLIDE_HEIGHT, Math.max(candidate.end, movedBottom) + GUIDE_MARGIN),
    };
  }

  return {
    orientation: "vertical",
    position: candidate.position,
    start: Math.max(0, movedTop - GUIDE_MARGIN),
    end: Math.min(BASE_SLIDE_HEIGHT, movedBottom + GUIDE_MARGIN),
  };
}

function getHorizontalGuide(
  candidate: SnapCandidate,
  movingRect: BaseRect,
  dx: number
): SnapGuide {
  const movedLeft = movingRect.left + dx;
  const movedRight = movingRect.right + dx;

  if (candidate.kind === "object") {
    return {
      orientation: "horizontal",
      position: candidate.position,
      start: Math.max(0, Math.min(candidate.start, movedLeft) - GUIDE_MARGIN),
      end: Math.min(BASE_SLIDE_WIDTH, Math.max(candidate.end, movedRight) + GUIDE_MARGIN),
    };
  }

  return {
    orientation: "horizontal",
    position: candidate.position,
    start: Math.max(0, movedLeft - GUIDE_MARGIN),
    end: Math.min(BASE_SLIDE_WIDTH, movedRight + GUIDE_MARGIN),
  };
}

function getBestVerticalMatch(
  movingRect: BaseRect,
  dx: number,
  dy: number,
  candidates: SnapCandidate[],
  threshold: number
): SnapAxisMatch | null {
  const points = [movingRect.left + dx, movingRect.centerX + dx, movingRect.right + dx];
  let best: SnapAxisMatch | null = null;

  for (const point of points) {
    for (const candidate of candidates) {
      const delta = candidate.position - point;
      if (Math.abs(delta) > threshold) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) {
        best = {
          delta,
          guide: getVerticalGuide(candidate, movingRect, dy),
        };
      }
    }
  }

  return best;
}

function getBestHorizontalMatch(
  movingRect: BaseRect,
  dx: number,
  dy: number,
  candidates: SnapCandidate[],
  threshold: number
): SnapAxisMatch | null {
  const points = [movingRect.top + dy, movingRect.centerY + dy, movingRect.bottom + dy];
  let best: SnapAxisMatch | null = null;

  for (const point of points) {
    for (const candidate of candidates) {
      const delta = candidate.position - point;
      if (Math.abs(delta) > threshold) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) {
        best = {
          delta,
          guide: getHorizontalGuide(candidate, movingRect, dx),
        };
      }
    }
  }

  return best;
}

export function getSnapResult({
  movingRect,
  dx,
  dy,
  otherRects,
  padding,
  threshold = DEFAULT_THRESHOLD,
}: SnapOptions): SnapResult {
  const verticalMatch = getBestVerticalMatch(
    movingRect,
    dx,
    dy,
    getVerticalCandidates(padding, otherRects),
    threshold
  );
  const horizontalMatch = getBestHorizontalMatch(
    movingRect,
    dx,
    dy,
    getHorizontalCandidates(padding, otherRects),
    threshold
  );

  return {
    dx: dx + (verticalMatch?.delta ?? 0),
    dy: dy + (horizontalMatch?.delta ?? 0),
    guides: [verticalMatch?.guide, horizontalMatch?.guide].filter(
      (guide): guide is SnapGuide => guide !== null && guide !== undefined
    ),
  };
}
