import type { AgentEvent } from "@shared/event";
import type { UserSettings } from "@shared/settings";
import type { UIMessage } from "ai";
import type { RPCSchema } from "electrobun";

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
      getSettings: {
        params: undefined;
        response: UserSettings;
      };
      saveSettings: {
        params: UserSettings;
        response: UserSettings;
      };
      createChat: {
        params: { chatId: string };
        response: { id: string; messages: UIMessage[] };
      };
      loadChat: {
        params: { chatId: string };
        response: { id: string; messages: UIMessage[] };
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
