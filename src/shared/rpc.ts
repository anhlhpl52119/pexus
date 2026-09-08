import type { AgentEvent } from "@shared/event";
import type { UserSettings } from "@shared/settings";
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
      startAgent: {
        params: {
          workflowId: string;
          prompt: string;
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
