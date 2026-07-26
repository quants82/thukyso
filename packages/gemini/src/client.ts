import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { ANALYSIS_SYSTEM_INSTRUCTION } from "./prompts/common.js";

export type SourceInput =
  | { kind: "pdf"; bytes: Uint8Array }
  | { kind: "text"; text: string };

export interface InteractionGateway {
  analyze<T>(
    prompt: string,
    source: SourceInput,
    jsonSchema: Record<string, unknown>,
    validator: ZodType<T>
  ): Promise<T>;
}

export class GeminiInteractionsClient implements InteractionGateway {
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async analyze<T>(
    prompt: string,
    source: SourceInput,
    jsonSchema: Record<string, unknown>,
    validator: ZodType<T>
  ): Promise<T> {
    const sourcePart =
      source.kind === "pdf"
        ? {
            type: "document" as const,
            data: Buffer.from(source.bytes).toString("base64"),
            mime_type: "application/pdf" as const
          }
        : { type: "text" as const, text: source.text };

    const interaction = await this.client.interactions.create({
      model: this.model,
      store: false,
      system_instruction: ANALYSIS_SYSTEM_INSTRUCTION,
      input: [{ type: "text", text: prompt }, sourcePart],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: jsonSchema
      }
    });

    if (!interaction.output_text) {
      throw new Error("GEMINI_EMPTY_RESPONSE");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(interaction.output_text);
    } catch {
      throw new Error("GEMINI_INVALID_JSON");
    }
    const result = validator.safeParse(parsed);
    if (!result.success) {
      throw new Error("GEMINI_SCHEMA_VALIDATION_FAILED");
    }
    return result.data;
  }
}
