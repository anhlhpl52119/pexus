import type { AgentEvent } from "@shared/contracts/agent-events";
import type { UIMessage } from "ai";
import { last } from "es-toolkit/compat";
import { nanoid } from "nanoid";
import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { rpcClient } from "@/bridge/rpc-client";

interface Conversation {
  id: string;
  title: string;
  cwd: string | null;
  lastUpdatedAt: Date;
  stage: "working" | "completed" | "pending" | "default";
}

export const useChatStore = defineStore("chat", () => {
  const conversations = reactive<Conversation[]>([]);
  const conversationMessages = reactive<Map<string, UIMessage[]>>(new Map());
  const activeWorkflow = reactive<Set<string>>(new Set());
  const tempRes = ref<any>();

  interface SubmitOptions {
    conversationId: string | null;
    prompt: string;
    cwd: string | null;
  }
  async function submit(opts: SubmitOptions) {
    const workflowId = nanoid();
    activeWorkflow.add(workflowId);
    if (!opts.conversationId) {
      const res = await rpcClient.agent.invoke({ conversationId: null, cwd: opts.cwd, modelId: "", prompt: opts.prompt, workflowId });
      console.log(res);
      tempRes.value = res;
    }
    else {
      const res = await rpcClient.agent.invoke({ conversationId: opts.conversationId, cwd: opts.cwd, modelId: "", prompt: opts.prompt, workflowId });
      console.log(res);
      tempRes.value = res;
    }
  };

  async function messageChunkResponseHandler(event: AgentEvent) {
    const messages = conversationMessages.get(event.conversationId);
    if (!messages) {
      console.warn("cannot find corresponding conversation ID");
      return;
    }

    const lastMsg = last(messages);
    if (event.type === "model.delta") {
      if (lastMsg?.role === "user") {
        messages.push({ id: nanoid(), role: "assistant", parts: [{ type: "text", text: event.text }] });
      }
      else {
        const lastPart = last(lastMsg?.parts ?? []);
        if (lastPart?.type === "text") {
          lastPart.text += event.text;
        }
        else {
          lastMsg?.parts.push({ type: "text", text: event.text });
        }
      }
    }
  };
  return { conversations, messageChunkResponseHandler, submit, tempRes };
});
