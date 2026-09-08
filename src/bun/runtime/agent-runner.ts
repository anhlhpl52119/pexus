import type { ModelTurn } from "@shared/model";
import type { GatewayModelId } from "ai";
import { EventType } from "@shared/event";
import { createGateway, isStepCount, ToolLoopAgent } from "ai";
import { randomUUIDv7 } from "bun";
import { loadUserSettings } from "@/config/user-settings";
import { SYSTEM_PROMPTS } from "@/harness/prompts";
import { tools } from "@/harness/tools";
import { emit } from "@/runtime/bus";

interface RunWorkflowOptions {
  prompt: string;
  workflowId?: string;
  abortSignal?: AbortSignal;
  modelId?: GatewayModelId;
  reasoning?:
    | "provider-default"
    | "none"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | "xhigh";
}

const MAX_AGENT_STEPS = 10;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runWorkflow(
  options: RunWorkflowOptions,
): Promise<ModelTurn> {
  const {
    workflowId = randomUUIDv7(),
    modelId = "inclusionai/ling-3.0-flash",
    prompt,
    abortSignal,
    reasoning,
  } = options;
  let maxStepLimitReached = false;

  try {
    const { vercelAiKey } = await loadUserSettings();
    if (!vercelAiKey) {
      throw new Error("Missing vercel API key in config");
    }

    const gateway = createGateway({ apiKey: vercelAiKey });
    const maxStepStopCondition = isStepCount(MAX_AGENT_STEPS);
    const agent = new ToolLoopAgent({
      model: gateway(modelId),
      instructions: SYSTEM_PROMPTS,
      reasoning,
      stopWhen: async ({ steps }) => {
        const shouldStop = await maxStepStopCondition({ steps });
        if (!maxStepLimitReached) {
          maxStepLimitReached = shouldStop;
        }
        return shouldStop;
      },
      tools,
      onToolExecutionStart: async ({ toolCall }) => {
        await emit({
          workflowId,
          type: EventType.ToolRequested,
          toolCallId: toolCall.toolCallId,
          name: toolCall.toolName,
          args: toolCall.input,
        });
      },
      onToolExecutionEnd: async ({ toolCall, toolOutput }) => {
        if (toolOutput.type === "tool-result") {
          await emit({
            type: EventType.ToolCompleted,
            result: toolOutput.output,
            toolCallId: toolCall.toolCallId,
            name: toolCall.toolName,
            workflowId,
          });
          return;
        }

        await emit({
          type: EventType.ToolFailed,
          error: errorMessage(toolOutput.error),
          toolCallId: toolCall.toolCallId,
          workflowId,
        });
      },
    });

    const result = await agent.stream({ prompt, abortSignal });

    for await (const chunk of result.stream) {
      if (chunk.type === "error") {
        throw chunk.error;
      }

      if (chunk.type === "abort") {
        throw new Error(`Stream aborted by provider"}`);
      }

      if (chunk.type === "text-delta") {
        await emit({
          type: EventType.ModelDelta,
          text: chunk.text,
          workflowId,
        });
      }
      else if (chunk.type === "reasoning-delta") {
        await emit({
          type: EventType.ReasoningDelta,
          text: chunk.text,
          workflowId,
        });
      }
    }

    if (maxStepLimitReached) {
      throw new Error("Hit max step limit!!");
    }

    const text = await result.text;
    const toolCalls = await result.toolCalls;
    const responseMessages = await result.responseMessages;

    await emit({ type: EventType.ModelCompleted, text, workflowId });
    await emit({ type: EventType.WorkflowCompleted, output: text, workflowId });

    return {
      responseMessages,
      text,
      toolCalls: toolCalls.map(toolCall => ({
        id: toolCall.toolCallId,
        name: toolCall.toolName,
        input: toolCall.input as Record<string, unknown>,
      })),
    } satisfies ModelTurn;
  }
  catch (error) {
    if (abortSignal?.aborted) {
      await emit({ type: EventType.WorkflowCancelled, workflowId, text: "aborted",
      });
    }
    else {
      await emit({ type: EventType.WorkflowFailed, workflowId, error: errorMessage(error),
      });
    }

    throw error;
  }
}
