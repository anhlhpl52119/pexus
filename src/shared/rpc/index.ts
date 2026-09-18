import type { AgentEvent } from "@shared/model";
import type { RPCSchema } from "electrobun";
import type { Conversation, ConversationHistories, JsonConfig, StartWorkflowParams, StartWorkflowResponse } from "../model";

export interface AppRPC {
  // Bun
  bun: RPCSchema<{
    requests: {
      // file system
      selectWorkspace: {
        params: undefined;
        response: string | null;
      };

      // user config
      loadJsonConfig: {
        params: undefined;
        response: JsonConfig;
      };
      saveJsonConfig: {
        params: JsonConfig;
        response: boolean;
      };

      // workflow
      retrieveConversationList: {
        params: undefined;
        response: Conversation[];
      };
      retrieveConversationHistories: {
        params: ConversationHistories["request"];
        response: ConversationHistories["response"];
      };
      startWorkflow: {
        params: StartWorkflowParams;
        response: StartWorkflowResponse;
      };
      cancelWorkflow: {
        params: { conversationId: string };
        response: { cancelled: boolean };
      };
    };
  }>;

  // Webview
  webview: RPCSchema<{
    messages: {
      agentEvent: AgentEvent;
    };
  }>;
}
