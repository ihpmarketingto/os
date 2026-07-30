import { describe, expect, it } from "vitest";
import {
  clampSlideCount,
  coverFactor,
  DESIGN_FORMATS,
  fitFactor,
  isFullBleed,
  resizeCanvasJson,
  resizeObject,
  slideLabel,
} from "./design-resize";

const SQUARE = DESIGN_FORMATS.square;
const STORY = DESIGN_FORMATS.story;
const LANDSCAPE = DESIGN_FORMATS.landscape;

describe("fitFactor and coverFactor", () => {
  it("fits by the tighter axis and covers by the looser one", () => {
    // Square to story: width matches, height grows.
    expect(fitFactor(SQUARE, STORY)).toBe(1);
    expect(coverFactor(SQUARE, STORY)).toBeCloseTo(1920 / 1080, 5);
  });

  it("shrinks when the target is smaller on an axis", () => {
    // Square to landscape: height is the constraint at 628 / 1080.
    expect(fitFactor(SQUARE, LANDSCAPE)).toBeCloseTo(628 / 1080, 5);
  });
});

describe("isFullBleed", () => {
  it("recognises a background that already covers the frame", () => {
    const background = { width: 1080, height: 1080, scaleX: 1, scaleY: 1 };
    expect(isFullBleed(background, SQUARE)).toBe(true);
  });

  it("recognises a scaled-up image as full bleed", () => {
    const image = { width: 540, height: 540, scaleX: 2, scaleY: 2 };
    expect(isFullBleed(image, SQUARE)).toBe(true);
  });

  it("does not treat a headline as a background", () => {
    const headline = { type: "textbox", width: 864, height: 120, scaleX: 1, scaleY: 1 };
    expect(isFullBleed(headline, SQUARE)).toBe(false);
  });
});

describe("resizeObject", () => {
  it("keeps a centred layer centred", () => {
    const centred = { width: 200, height: 100, scaleX: 1, scaleY: 1, left: 440, top: 490 };
    const resized = resizeObject(centred, SQUARE, LANDSCAPE);
    // Centre of the layer relative to the new frame's centre.
    const factor = fitFactor(SQUARE, LANDSCAPE);
    expect(resized.left).toBeCloseTo((440 - 540) * factor + 600, 5);
    expect(resized.top).toBeCloseTo((490 - 540) * factor + 314, 5);
  });

  it("scales proportionally so nothing is stretched", () => {
    const shape = { width: 400, height: 200, scaleX: 1.5, scaleY: 1.5, left: 0, top: 0 };
    const resized = resizeObject(shape, SQUARE, LANDSCAPE);
    expect(resized.scaleX).toBeCloseTo(resized.scaleY as number, 10);
  });

  it("leaves intrinsic width and height alone so the scale does not compound", () => {
    const shape = { width: 400, height: 200, scaleX: 1, scaleY: 1, left: 10, top: 10 };
    const resized = resizeObject(shape, SQUARE, STORY);
    expect(resized.width).toBe(400);
    expect(resized.height).toBe(200);
  });

  it("keeps a full-bleed background bleeding in a taller format", () => {
    const background = { type: "image", width: 1080, height: 1080, scaleX: 1, scaleY: 1, left: 0, top: 0 };
    const resized = resizeObject(background, SQUARE, STORY);
    const renderedHeight = (resized.height as number) * (resized.scaleY as number);
    expect(renderedHeight).toBeGreaterThanOrEqual(STORY.height);
  });

  it("would have left bars if a background used the fit factor", () => {
    // Guards the branch above: the fit factor alone is not enough here.
    const background = { type: "image", width: 1080, height: 1080, scaleX: 1, scaleY: 1, left: 0, top: 0 };
    const fitted = 1080 * fitFactor(SQUARE, STORY);
    expect(fitted).toBeLessThan(STORY.height);
    const covered = 1080 * coverFactor(SQUARE, STORY);
    expect(covered).toBeGreaterThanOrEqual(STORY.height);
    expect(isFullBleed(background, SQUARE)).toBe(true);
  });

  it("preserves keys it does not understand", () => {
    const text = { type: "textbox", text: "Your headline", fill: "#622249", fontFamily: "Times New Roman" };
    const resized = resizeObject(text, SQUARE, STORY);
    expect(resized.text).toBe("Your headline");
    expect(resized.fill).toBe("#622249");
    expect(resized.fontFamily).toBe("Times New Roman");
  });
});

describe("resizeCanvasJson", () => {
  it("resizes every object and keeps canvas-level keys", () => {
    const canvas = {
      version: "6.9.1",
      background: "#F8F6F2",
      objects: [
        { type: "rect", width: 100, height: 100, scaleX: 1, scaleY: 1, left: 0, top: 0 },
        { type: "textbox", width: 200, height: 60, scaleX: 1, scaleY: 1, left: 100, top: 100 },
      ],
    };
    const resized = resizeCanvasJson(canvas, SQUARE, LANDSCAPE);
    expect(resized.background).toBe("#F8F6F2");
    expect(resized.version).toBe("6.9.1");
    expect((resized.objects as unknown[]).length).toBe(2);
  });

  it("handles an empty or missing canvas without throwing", () => {
    expect(resizeCanvasJson(null, SQUARE, STORY).objects).toEqual([]);
    expect(resizeCanvasJson({}, SQUARE, STORY).objects).toEqual([]);
  });
});

describe("carousel helpers", () => {
  it("labels slides for people, not for arrays", () => {
    expect(slideLabel(0, 5)).toBe("Slide 1 of 5");
    expect(slideLabel(4, 5)).toBe("Slide 5 of 5");
  });

  it("clamps slide counts to what the platforms accept", () => {
    expect(clampSlideCount(1)).toBe(2);
    expect(clampSlideCount(11)).toBe(10);
    expect(clampSlideCount(3)).toBe(3);
    expect(clampSlideCount(Number.NaN)).toBe(2);
  });
});
