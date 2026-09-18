import type { AgentEvent } from "@shared/event";
import type { UIMessage } from "ai";
import type { RPCSchema } from "electrobun";
import type { Conversation } from "../bun/runtime/db";
import type { UserConfig } from "./user-config";

export interface MyWebviewRPCType {
  // functions that execute in the main process
  bun: RPCSchema<{
    requests: {
      selectWd: {
        params: undefined;
        response: string | null;
      };
      selectWorkspace: {
        params: undefined;
        response: string | null;
      };
      saveUserConfig: {
        params: UserConfig;
        response: UserConfig;
      };
      createNewChat: {
        params: { prompts: string; workingDir: string | null };
        response: { conversationId: string; error?: string };
      };
      retrieveConversationList: {
        params: undefined;
        response: Conversation[];
      };
      loadUserConfig: {
        params: undefined;
        response: UserConfig;
      };
      startAgent: {
        params: {
          chatId: string;
          workflowId: string;
          message: UIMessage;
          modelId: string;
          cwd: string | null;
        };
        response: {
          workflowId: string;
          accepted: boolean;
        };
      };
      cancelAgent: {
        params: {
          workflowId: string;
        };
        response: {
          cancelled: boolean;
        };
      };
      requestApproval: {
        params: {
          toolCallId: string;
          approved: boolean;
        };
        response: {
          approved: boolean;
        };
      };
    };
    messages: {
      logToBun: {
        msg: string;
      };
      agentEvent: AgentEvent;
    };
  }>;
  // functions that execute in the browser context
  webview: RPCSchema<{
    requests: {
      someWebviewFunction: {
        params: {
          a: number;
          b: number;
        };
        response: number;
      };
      requestApproval: {
        params: {
          toolCallId: string;
          approved: boolean;
        };
        response: {
          approved: boolean;
        };
      };
    };
    messages: {
      logToWebview: {
        msg: any;
      };
      agentEvent: AgentEvent;
    };
  }>;
}
