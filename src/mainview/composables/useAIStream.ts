import type { UIMessage, UIMessageChunk } from "ai";
import type { AgentStream } from "../electroview";
import { EventType } from "@shared/model";
import { uuid } from "@shared/utils";
import { readUIMessageStream } from "ai";
import { onUnmounted, ref } from "vue";
import { createNewChat, loadChat, requestApproval, startAgentStream } from "../electroview";

const ACTIVE_CHAT_ID_KEY = "pexus.active-chat-id";

function setActiveChatId(chatId: string): void {
  try {
    localStorage.setItem(ACTIVE_CHAT_ID_KEY, chatId);
  }
  catch {
    // Persistence is optional when WebView storage is unavailable.
  }
}

function getActiveChatId(): string {
  try {
    const storedChatId = localStorage.getItem(ACTIVE_CHAT_ID_KEY);
    if (storedChatId && /^[\w-]{1,128}$/.test(storedChatId)) {
      return storedChatId;
    }
  }
  catch {
    // Fall back to an in-memory ID when WebView storage is unavailable.
  }

  const chatId = uuid();
  setActiveChatId(chatId);
  return chatId;
}

interface UseAIStreamOptions {
  createOnFirstSubmit?: boolean;
}

export function useAIStream(options: UseAIStreamOptions = {}) {
  let chatId = getActiveChatId();
  let newChatRequested = options.createOnFirstSubmit === true;
  const conversation = ref<UIMessage[]>([]);
  const error = ref<string | null>(null);
  const loading = ref(false);
  const approvalDialogOpen = ref(false);
  const pendingApproval = ref<{ toolCallId: string; command: string } | null>(null);
  let activeStream: AgentStream | undefined;
  let activeChunkController: ReadableStreamDefaultController<UIMessageChunk> | undefined;
  let unsubscribe: (() => void) | undefined;
  let submissionId = 0;
  let resetPromise: Promise<void> | undefined;

  function closeChunkStream(): void {
    const controller = activeChunkController;
    activeChunkController = undefined;
    try {
      controller?.close();
    }
    catch {
      // The reader may have already closed or errored the stream.
    }
  }

  let initializationPromise: Promise<void> | undefined;

  async function initialize(): Promise<void> {
    if (!initializationPromise) {
      initializationPromise = loadChat(chatId)
        .then((chat) => {
          conversation.value = chat.messages;
        })
        .catch((cause) => {
          error.value = cause instanceof Error ? cause.message : String(cause);
          throw cause;
        });
    }
    await initializationPromise;
  }

  async function disposeActiveStream(cancel = false): Promise<void> {
    const stream = activeStream;
    activeStream = undefined;
    unsubscribe?.();
    unsubscribe = undefined;
    closeChunkStream();

    if (!stream) {
      return;
    }

    if (cancel) {
      try {
        await stream.cancel();
      }
      catch (cause) {
        console.error("Could not cancel agent stream:", cause);
      }
    }

    stream.dispose();
  }

  async function submit(prompt: string, modelId: string, cwd: string | null) {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || loading.value || resetPromise) {
      return;
    }

    const requestId = ++submissionId;
    loading.value = true;
    error.value = null;

    try {
      if (newChatRequested) {
        const result = await createNewChat(normalizedPrompt, cwd ?? null);
        if (requestId !== submissionId) {
          return;
        }
        if (result.error || !result.conversationId) {
          throw new Error(result.error ?? "Could not create the conversation.");
        }

        chatId = result.conversationId;
        setActiveChatId(chatId);
        newChatRequested = false;
        initializationPromise = Promise.resolve();
      }
      else {
        await initialize();
      }

      if (requestId !== submissionId) {
        return;
      }

      const userMessage: UIMessage = {
        role: "user",
        id: uuid(),
        parts: [{ type: "text", text: normalizedPrompt }],
      };
      conversation.value.push(userMessage);

      await disposeActiveStream(true);

      if (requestId !== submissionId) {
        return;
      }

      const stream = await startAgentStream(chatId, userMessage, modelId, cwd ?? null);
      if (requestId !== submissionId) {
        await stream.cancel().catch(() => {});
        stream.dispose();
        return;
      }

      activeStream = stream;
      const chunkStream = new ReadableStream<UIMessageChunk>({
        start(controller) {
          activeChunkController = controller;
        },
      });
      const responseStream = readUIMessageStream<UIMessage>({
        stream: chunkStream,
        terminateOnError: true,
        onError: (cause) => {
          error.value = cause instanceof Error ? cause.message : String(cause);
        },
      });

      const responseDone = (async () => {
        const reader = responseStream.getReader();
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) {
              break;
            }

            const responseMessage = result.value;
            const messageIndex = conversation.value.findIndex(
              message => message.id === responseMessage.id,
            );
            if (messageIndex === -1) {
              conversation.value.push(responseMessage);
            }
            else {
              conversation.value[messageIndex] = responseMessage;
            }
          }
        }
        finally {
          reader.releaseLock();
        }
      })();

      let endedWhileSubscribing = false;
      const streamUnsubscribe = stream.subscribe((event) => {
        if (event.type === EventType.AgentUIChunk) {
          try {
            activeChunkController?.enqueue(event.chunk);
          }
          catch (cause) {
            console.error("Could not process agent stream chunk:", cause);
          }
          return;
        }

        if (event.type === EventType.ApprovalRequested) {
          pendingApproval.value = {
            toolCallId: event.toolCallId,
            command: (event.args as Record<string, unknown>)?.command as string ?? "",
          };
          approvalDialogOpen.value = true;
          return;
        }

        if (event.type === EventType.ApprovalResolved) {
          approvalDialogOpen.value = false;
          pendingApproval.value = null;
          return;
        }

        if (event.type === EventType.WorkflowFailed) {
          error.value = event.error;
        }

        if (
          event.type === EventType.WorkflowCompleted
          || event.type === EventType.WorkflowFailed
          || event.type === EventType.WorkflowCancelled
        ) {
          endedWhileSubscribing = true;
          closeChunkStream();
          if (activeStream === stream) {
            activeStream = undefined;
          }
          stream.dispose();
          loading.value = false;
        }
      });

      if (endedWhileSubscribing) {
        streamUnsubscribe();
      }
      else {
        unsubscribe = streamUnsubscribe;
      }

      await responseDone;
    }
    catch (cause) {
      if (requestId === submissionId) {
        await disposeActiveStream(true);
        error.value = cause instanceof Error ? cause.message : String(cause);
        loading.value = false;
      }
    }
  }

  async function reset() {
    ++submissionId;
    conversation.value = [];
    error.value = null;
    loading.value = false;
    approvalDialogOpen.value = false;
    pendingApproval.value = null;
    initializationPromise = undefined;
    newChatRequested = options.createOnFirstSubmit === true;
    chatId = getActiveChatId();
    const pendingReset = disposeActiveStream(true);
    resetPromise = pendingReset;
    try {
      await pendingReset;
    }
    finally {
      if (resetPromise === pendingReset) {
        resetPromise = undefined;
      }
    }
  }

  async function cancel() {
    ++submissionId;
    await disposeActiveStream(true);
    loading.value = false;
  }

  async function handleApproval(approved: boolean) {
    if (pendingApproval.value) {
      await requestApproval(pendingApproval.value.toolCallId, approved);
    }
    approvalDialogOpen.value = false;
    pendingApproval.value = null;
  }

  onUnmounted(() => {
    ++submissionId;
    void disposeActiveStream(true);
  });

  return {
    chatId,
    conversation,
    initialize,
    reset,
    error,
    loading,
    submit,
    cancel,
    approvalDialogOpen,
    pendingApproval,
    handleApproval,
  };
}
