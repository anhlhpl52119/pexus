import type { MyWebviewRPCType } from "@shared/rpc";
import type { UIMessage } from "ai";
import { validateUIMessages } from "ai";
import { randomUUIDv7 } from "bun";
import { BrowserView, Utils } from "electrobun";
import { resolveApproval } from "@/harness/tools";
import { loadUserConfig, saveUserConfig } from "@/runtime/store";
import { runWorkflow } from "./agent-runner";
import {
  appendMessage,
  createChat,
  hasMessage,
  loadChat,
  updateMessageStatus,
} from "./history-store";

interface ActiveAgent {
  controller: AbortController;
  chatId: string;
  assistantMessageId: string;
}

const activeAgents = new Map<string, ActiveAgent>();
const activeChats = new Set<string>();

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text")
    .map(part => part.text)
    .join("")
    .trim();
}

export const rpc = BrowserView.defineRPC<MyWebviewRPCType>({
  // Native file dialogs are user-driven and may stay open for minutes.
  maxRequestTime: 120_000,
  handlers: {
    requests: {
      selectWd: async () => {
        const paths = await Utils.openFileDialog({
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });

        const folder = paths?.[0] ?? null;

        if (folder) {
          console.warn("Selected folder:", folder);
        }

        return folder;
      },
      selectWorkspace: async () => {
        const paths = await Utils.openFileDialog({
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });

        const folder = paths?.[0] ?? null;

        if (folder) {
          console.warn("Selected workspace:", folder);
        }

        return folder;
      },
      saveUserConfig,
      loadUserConfig,
      createChat: ({ chatId }) => createChat(chatId),
      loadChat: ({ chatId }) => loadChat(chatId),
      startAgent: async ({ chatId, workflowId, message, modelId, cwd }) => {
        if (!workflowId.trim()) {
          throw new Error("Workflow ID cannot be empty.");
        }
        if (activeAgents.has(workflowId) || activeChats.has(chatId)) {
          return { workflowId, accepted: false };
        }
        activeChats.add(chatId);

        try {
          const [validatedMessage] = await validateUIMessages({ messages: [message] });
          if (!validatedMessage || validatedMessage.role !== "user") {
            throw new Error("Only user messages can start an agent.");
          }

          if (hasMessage(chatId, validatedMessage.id)) {
            activeChats.delete(chatId);
            return { workflowId, accepted: false };
          }

          const normalizedPrompt = messageText(validatedMessage);
          if (!normalizedPrompt) {
            throw new Error("Prompt cannot be empty.");
          }

          appendMessage(chatId, validatedMessage, "completed");
          const contextMessages = loadChat(chatId).messages.filter(
            currentMessage => currentMessage.role !== "assistant" || currentMessage.parts.length > 0,
          );
          const assistantMessageId = randomUUIDv7();
          const assistantDraft: UIMessage = {
            id: assistantMessageId,
            role: "assistant",
            parts: [],
          };
          appendMessage(chatId, assistantDraft, "streaming");

          const controller = new AbortController();
          const activeAgent: ActiveAgent = {
            controller,
            chatId,
            assistantMessageId,
          };
          activeAgents.set(workflowId, activeAgent);

          runWorkflow({
            prompt: normalizedPrompt,
            messages: contextMessages,
            chatId,
            assistantMessageId,
            workflowId,
            abortSignal: controller.signal,
            modelId,
            cwd,
            onAssistantMessage: async (completedMessage) => {
              appendMessage(chatId, completedMessage, "completed");
            },
          })
            .catch((error) => {
              console.error(`Agent ${workflowId} failed:`, error);
              updateMessageStatus(
                chatId,
                assistantMessageId,
                controller.signal.aborted ? "cancelled" : "failed",
              );
            })
            .finally(() => {
              if (activeAgents.get(workflowId) === activeAgent) {
                activeAgents.delete(workflowId);
              }
              activeChats.delete(chatId);
            });

          return { workflowId, accepted: true };
        }
        catch (error) {
          activeChats.delete(chatId);
          throw error;
        }
      },
      cancelAgent: ({ workflowId }) => {
        const activeAgent = activeAgents.get(workflowId);
        if (!activeAgent) {
          return { cancelled: false };
        }

        activeAgent.controller.abort(new Error("Agent run cancelled"));
        return { cancelled: true };
      },
      requestApproval: ({ toolCallId, approved }) => {
        resolveApproval(toolCallId, approved);
        return { approved };
      },
    },
    messages: {
      "*": (messageName, payload) => {
        // handle message from `client` ->  `bun`
        console.warn("global message handler", messageName, payload);
      },
    },
  },
});
