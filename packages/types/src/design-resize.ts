/**
 * Resizing one design into another placement.
 *
 * An ad that works as a square feed post has to also run as a story and a
 * landscape banner. Redrawing it three times is where a day goes, so this
 * scales the layers instead: everything keeps its proportions, keeps its
 * position relative to the centre, and a background that bled to the edges
 * still bleeds after the resize.
 *
 * Fabric renders an object at its intrinsic size times its scale, so only
 * the scale is touched here. Scaling both would compound and blow the layer
 * up by the square of the factor.
 */

export const DESIGN_FORMATS = {
  square: { label: "Square 1080 x 1080 (feed)", width: 1080, height: 1080 },
  portrait: { label: "Portrait 1080 x 1350 (4:5 feed)", width: 1080, height: 1350 },
  story: { label: "Story 1080 x 1920 (9:16)", width: 1080, height: 1920 },
  landscape: { label: "Landscape 1200 x 628", width: 1200, height: 628 },
} as const;

export type DesignFormat = keyof typeof DESIGN_FORMATS;

export interface CanvasSize {
  width: number;
  height: number;
}

/** The subset of a fabric object this maths touches. Everything else rides along. */
export interface ResizableObject {
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  [key: string]: unknown;
}

/**
 * A layer counts as full bleed when it already covers the whole frame. Those
 * are backgrounds, and a background that gets the "fit" factor would leave
 * bars down the sides of a taller format.
 */
const BLEED_TOLERANCE = 0.99;

export function isFullBleed(object: ResizableObject, from: CanvasSize): boolean {
  const renderedWidth = (object.width ?? 0) * (object.scaleX ?? 1);
  const renderedHeight = (object.height ?? 0) * (object.scaleY ?? 1);
  return (
    renderedWidth >= from.width * BLEED_TOLERANCE && renderedHeight >= from.height * BLEED_TOLERANCE
  );
}

/** Uniform factor that keeps a layer inside the new frame. */
export function fitFactor(from: CanvasSize, to: CanvasSize): number {
  return Math.min(to.width / from.width, to.height / from.height);
}

/** Uniform factor that keeps a layer covering the new frame. */
export function coverFactor(from: CanvasSize, to: CanvasSize): number {
  return Math.max(to.width / from.width, to.height / from.height);
}

export function resizeObject(object: ResizableObject, from: CanvasSize, to: CanvasSize): ResizableObject {
  const factor = isFullBleed(object, from) ? coverFactor(from, to) : fitFactor(from, to);

  // Position is measured from the frame's centre, so a layer that sat in the
  // middle stays in the middle and one that hugged a corner stays near it.
  const left = ((object.left ?? 0) - from.width / 2) * factor + to.width / 2;
  const top = ((object.top ?? 0) - from.height / 2) * factor + to.height / 2;

  return {
    ...object,
    left,
    top,
    scaleX: (object.scaleX ?? 1) * factor,
    scaleY: (object.scaleY ?? 1) * factor,
  };
}

/**
 * Rewrites a saved fabric canvas for a new frame size. Unknown keys are
 * preserved so a future fabric feature does not get dropped on resize.
 */
export function resizeCanvasJson(
  canvasJson: unknown,
  from: CanvasSize,
  to: CanvasSize,
): Record<string, unknown> {
  const canvas = (canvasJson ?? {}) as Record<string, unknown>;
  const objects = Array.isArray(canvas.objects) ? (canvas.objects as ResizableObject[]) : [];
  return {
    ...canvas,
    objects: objects.map((object) => resizeObject(object, from, to)),
  };
}

/** Slide names people can actually scan in a strip: "Slide 1 of 5". */
export function slideLabel(index: number, total: number): string {
  return `Slide ${index + 1} of ${total}`;
}

export const MAX_CAROUSEL_SLIDES = 10;

/**
 * Instagram and LinkedIn both cap carousels at 10 frames, and a carousel of
 * one is just a post, so the useful range is 2 to 10.
 */
export function clampSlideCount(requested: number): number {
  if (!Number.isFinite(requested)) return 2;
  return Math.min(MAX_CAROUSEL_SLIDES, Math.max(2, Math.round(requested)));
}
