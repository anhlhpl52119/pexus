import type { AgentEvent } from "@shared/model";
import type { RPCSchema, Utils } from "electrobun";
import type { UserSetting } from "../../bun/services/settings.service";
import type { Conversation, ConversationHistories, JsonConfig, StartWorkflowParams, StartWorkflowResponse } from "../model";

export interface AppRPC {
  // Bun
  bun: RPCSchema<{
    requests: {
      // file system
      openSystemExplorer: {
        params: Parameters<typeof Utils.openFileDialog>[0];
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

      // // user config
      // loadJsonConfig: {
      //   params: undefined;
      //   response: JsonConfig;
      // };

      // // workflow
      // retrieveConversationList: {
      //   params: undefined;
      //   response: Conversation[];
      // };
      // retrieveConversationHistories: {
      //   params: ConversationHistories["request"];
      //   response: ConversationHistories["response"];
      // };
      // startWorkflow: {
      //   params: StartWorkflowParams;
      //   response: StartWorkflowResponse;
      // };
      // cancelWorkflow: {
      //   params: { conversationId: string };
      //   response: { cancelled: boolean };
      // };
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
