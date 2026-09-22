import type { AgentEvent } from "@shared/contracts/agent-events";
import type { StreamTextResult } from "ai";
import type { RPCSchema, Utils } from "electrobun";
import type { UserSetting } from "../../bun/services/settings.service";

export interface AppRPC {
  // Bun
  bun: RPCSchema<{
    requests: {
      // file system
      openSystemExplorer: {
        params: OpenSystemExplorerParams;
        response: RPCResult<string[]>;
      };

      saveSettings: {
        params: UserSetting;
        response: RPCResult<UserSetting>;
      };
      loadSettings: {
        params: undefined;
        response: RPCResult<UserSetting>;
      };
      invokeAgent: {
        params: RunAgentParams;
        response: RPCResult<string>;
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

export type RPCResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: string;
};

export type OpenSystemExplorerParams = Parameters<typeof Utils.openFileDialog>[0];

export interface RunAgentParams {
  modelId: string;
  prompt: string;
  cwd: string | null;
  conversationId: string;
  apiKey: string;
  abortSignal?: AbortSignal;
}
