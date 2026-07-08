/**
 * OpenAI execution adapter. The only live provider in Phase 5 core —
 * Gemini and Anthropic slots activate when their keys are supplied.
 */

export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";

// USD per token (gpt-5-mini list pricing). Cost estimates are recorded on
// every ai_runs row; treat them as estimates, not billing truth.
const INPUT_COST_PER_TOKEN = 0.25 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 2.0 / 1_000_000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  output: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export function estimateOpenAiCostUsd(inputTokens: number, outputTokens: number): number {
  const cost = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
  return Math.round(cost * 100000) / 100000;
}

export async function executeOpenAiChat(
  apiKey: string,
  messages: ChatMessage[],
  options?: { model?: string; maxOutputTokens?: number },
): Promise<ChatResult> {
  const model = options?.model ?? DEFAULT_OPENAI_MODEL;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      // gpt-5 family models spend part of this budget on internal reasoning
      // before any visible text; too small a cap yields an empty response.
      max_completion_tokens: options?.maxOutputTokens ?? 4000,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };

  const output = data.choices?.[0]?.message?.content?.trim();
  if (!output) {
    throw new Error("OpenAI returned an empty response.");
  }

  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  return {
    output,
    model: data.model ?? model,
    inputTokens,
    outputTokens,
    estimatedCostUsd: estimateOpenAiCostUsd(inputTokens, outputTokens),
  };
}
