import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildChangesOnlySystemPrompt, buildUserPrompt } from "./prompts";
import { TextBlock } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic();

async function callWithRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isOverload =
        error instanceof Anthropic.APIError &&
        (error.status === 529 || error.status === 503);
      if (!isOverload || attempt === maxAttempts) {
        if (isOverload) {
          throw new Error(
            "The AI service is currently overloaded. Please try again in a moment."
          );
        }
        throw error;
      }
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export async function generateOutput(
  outputType: string,
  projectData: Parameters<typeof buildUserPrompt>[0]
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = projectData.changesOnly
    ? buildChangesOnlySystemPrompt(outputType)
    : buildSystemPrompt(outputType, !!projectData.diffContext);
  const userPrompt = buildUserPrompt(projectData);

  const stream = await callWithRetry(() =>
    client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    })
  );

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function generateOutputFromPrompt(
  systemPrompt: string,
  userPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  const stream = await callWithRetry(() =>
    client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    })
  );

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function generateStructuredJSON(prompt: string): Promise<string> {
  const response = await callWithRetry(() =>
    client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system:
        "You are a business process analyst. Return only valid JSON with no markdown fences or additional text.",
      messages: [{ role: "user", content: prompt }],
    })
  );

  const textBlock = response.content.find(
    (c): c is TextBlock => c.type === "text"
  );
  return textBlock?.text ?? "{}";
}
