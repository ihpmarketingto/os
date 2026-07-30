/**
 * OpenAI image generation. Runs through the same provider layer as text so
 * generations are cost-tracked and audited identically.
 */

export const DEFAULT_IMAGE_MODEL = "gpt-image-1";

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type ImageQuality = "low" | "medium" | "high";

/**
 * Published per-image prices for gpt-image-1 (USD). Recorded as estimates on
 * every asset so creative spend is visible per client, never billed silently.
 */
const IMAGE_PRICE_USD: Record<ImageQuality, Record<ImageSize, number>> = {
  low: { "1024x1024": 0.011, "1024x1536": 0.016, "1536x1024": 0.016 },
  medium: { "1024x1024": 0.042, "1024x1536": 0.063, "1536x1024": 0.063 },
  high: { "1024x1024": 0.167, "1024x1536": 0.25, "1536x1024": 0.25 },
};

export function estimateImageCostUsd(size: ImageSize, quality: ImageQuality, count = 1): number {
  return Math.round(IMAGE_PRICE_USD[quality][size] * count * 100000) / 100000;
}

export interface GeneratedImage {
  /** Raw base64 PNG bytes, ready to upload to storage. */
  base64: string;
  model: string;
  size: ImageSize;
  quality: ImageQuality;
  estimatedCostUsd: number;
}

export async function generateOpenAiImage(
  apiKey: string,
  prompt: string,
  options?: { size?: ImageSize; quality?: ImageQuality; model?: string },
): Promise<GeneratedImage> {
  const size = options?.size ?? "1024x1024";
  const quality = options?.quality ?? "medium";
  const model = options?.model ?? DEFAULT_IMAGE_MODEL;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI image request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data.");
  }

  return {
    base64: b64,
    model,
    size,
    quality,
    estimatedCostUsd: estimateImageCostUsd(size, quality),
  };
}
