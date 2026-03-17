import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { TextBlock } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic();

export async function generateOutput(
  outputType: string,
  projectData: Parameters<typeof buildUserPrompt>[0]
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = buildSystemPrompt(outputType);
  const userPrompt = buildUserPrompt(projectData);

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

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
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      "You are a business process analyst. Return only valid JSON with no markdown fences or additional text.",
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find(
    (c): c is TextBlock => c.type === "text"
  );
  return textBlock?.text ?? "{}";
}
