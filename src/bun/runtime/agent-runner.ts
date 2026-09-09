import type { ModelTurn } from "@shared/model";
import type { GatewayModelId, UIMessage } from "ai";
import { EventType } from "@shared/event";
import { createAgentUIStream, createGateway, isStepCount, Output, ToolLoopAgent } from "ai";
import { randomUUIDv7 } from "bun";
import { loadUserSettings } from "@/config/user-settings";
import {
  AGENT_PROMPTS,
  CLASSIFICATION_PROMPT,
  CLASSIFICATION_SCHEMA,
  SYSTEM_PROMPTS,
} from "@/harness/prompts";
import { createTools } from "@/harness/tools";
import { emit } from "@/runtime/bus";

// --- Classification ---

export type ClassificationTag = "coding" | "workflow" | "general";

export interface AgentConfig {
  tag: ClassificationTag;
  systemPrompt: string;
  modelId?: GatewayModelId;
  maxSteps?: number;
}

export const AGENT_REGISTRY: Record<ClassificationTag, AgentConfig> = {
  coding: {
    tag: "coding",
    systemPrompt: AGENT_PROMPTS.coding,
    maxSteps: 15,
  },
  workflow: {
    tag: "workflow",
    systemPrompt: AGENT_PROMPTS.workflow,
    maxSteps: 15,
  },
  general: {
    tag: "general",
    systemPrompt: AGENT_PROMPTS.general,
    maxSteps: 10,
  },
};

export async function classifyMessage(prompt: string): Promise<ClassificationTag> {
  const { vercelAiKey } = await loadUserSettings();
  if (!vercelAiKey) {
    throw new Error("Missing vercel API key in config");
  }

  const gateway = createGateway({ apiKey: vercelAiKey });

  const classifier = new ToolLoopAgent({
    model: gateway("openai/gpt-5.6-luna"),
    instructions: CLASSIFICATION_PROMPT,
    output: Output.object({
      schema: CLASSIFICATION_SCHEMA,
    }),
  });

  const { output } = await classifier.generate({
    prompt,
  });

  return output.tag;
}

// --- Workflow Execution ---

interface RunWorkflowOptions {
  prompt: string;
  /** Existing UI history loaded by Bun for this chat. */
  messages?: UIMessage[];
  chatId?: string;
  assistantMessageId?: string;
  onAssistantMessage?: (message: UIMessage) => Promise<void>;
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
  /** Optional agent config to override instructions and modelId */
  config?: AgentConfig;
  cwd: string | null;
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
    messages,
    chatId,
    assistantMessageId,
    onAssistantMessage,
    abortSignal,
    reasoning,
    config,
    cwd,
  } = options;
  let toolRejected = false;

  // Bind every tool instance to the client-provided workflow context. The model
  // receives no CWD argument and cannot override this value.
  const workflowTools = createTools({
    workflowId,
    cwd,
    abortSignal,
    onToolRejected: () => {
      toolRejected = true;
    },
  });

  // Use agent config overrides when provided
  const instructions = config?.systemPrompt ?? SYSTEM_PROMPTS;
  const agentTools = workflowTools;
  const effectiveModelId = config?.modelId ?? modelId;
  const maxSteps = config?.maxSteps ?? MAX_AGENT_STEPS;
  let maxStepLimitReached = false;

  try {
    const { vercelAiKey } = await loadUserSettings();
    if (!vercelAiKey) {
      throw new Error("Missing vercel API key in config");
    }

    const gateway = createGateway({ apiKey: vercelAiKey });
    const maxStepStopCondition = isStepCount(maxSteps);
    const agent = new ToolLoopAgent({
      model: gateway(effectiveModelId),
      instructions,
      reasoning,
      // A denied tool result must not be followed by another model turn. The
      // SDK evaluates stopWhen after the current tool step completes.
      stopWhen: async ({ steps }) => {
        if (toolRejected) {
          return true;
        }

        const shouldStop = await maxStepStopCondition({ steps });
        if (!maxStepLimitReached) {
          maxStepLimitReached = shouldStop;
        }
        return shouldStop;
      },
      tools: agentTools,
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

    if (messages) {
      if (!chatId) {
        throw new Error("A chat ID is required when streaming UI messages.");
      }

      let responseMessage: UIMessage | undefined;
      let streamError: unknown;
      let streamAborted = false;
      let streamFinishReason: string | undefined;
      const uiStream = await createAgentUIStream({
        agent,
        uiMessages: messages,
        abortSignal,
        generateMessageId: assistantMessageId
          ? () => assistantMessageId
          : undefined,
        onError: (cause) => {
          streamError = cause;
          return errorMessage(cause);
        },
        onEnd: async ({ responseMessage: completedMessage, isAborted, finishReason }) => {
          responseMessage = completedMessage;
          streamAborted = isAborted;
          streamFinishReason = finishReason;
          if (!isAborted && !streamError && !maxStepLimitReached && finishReason !== "error") {
            await onAssistantMessage?.(completedMessage);
          }
        },
      });

      let sequence = 0;
      for await (const chunk of uiStream) {
        await emit({
          type: EventType.AgentUIChunk,
          workflowId,
          chatId,
          sequence: ++sequence,
          chunk,
        });
      }

      if (streamError) {
        throw streamError;
      }
      if (streamAborted || abortSignal?.aborted || streamFinishReason === "error") {
        throw new Error("Stream aborted before completion.");
      }
      if (maxStepLimitReached) {
        throw new Error("Hit max step limit!!");
      }

      const text = responseMessage?.parts
        .filter(part => part.type === "text")
        .map(part => part.text)
        .join("") ?? "";
      await emit({ type: EventType.ModelCompleted, text, workflowId });
      await emit({ type: EventType.WorkflowCompleted, output: text, workflowId });

      return {
        responseMessages: [],
        text,
        toolCalls: responseMessage?.parts
          .filter(part => part.type === "dynamic-tool")
          .map(part => ({
            id: part.toolCallId,
            name: part.toolName,
            input: (part.input ?? {}) as Record<string, unknown>,
          })) ?? [],
      } satisfies ModelTurn;
    }

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
      await emit({ type: EventType.WorkflowCancelled, workflowId, text: "aborted" });
    }
    else {
      await emit({ type: EventType.WorkflowFailed, workflowId, error: errorMessage(error) });
    }

    throw error;
  }
}

// --- Router ---

export async function runAgent(
  prompt: string,
  cwd: string | null,
  abortSignal?: AbortSignal,
): Promise<ModelTurn> {
  const tag = await classifyMessage(prompt);
  const config = AGENT_REGISTRY[tag];

  const workflowId = randomUUIDv7();

  return runWorkflow({
    prompt,
    workflowId,
    abortSignal,
    config,
    cwd,
  });
}
