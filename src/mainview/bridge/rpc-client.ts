import type { AppRPC, OpenSystemExplorerParams, RunAgentParams } from "@shared/contracts/rpc";
import type { UserSetting } from "../../bun/services/settings.service";
import { Electroview } from "electrobun/view";

let bridge: ReturnType<typeof createRPCBridge> | undefined;

function createRPCBridge() {
  const rpc = Electroview.defineRPC<AppRPC>({
    maxRequestTime: 120_000,
    handlers: {
      messages: {
        agentEvent: () => {},
      },
    },
  });

  return new Electroview({ rpc }).rpc;
}

export function initRPCBridge() {
  return bridge ??= createRPCBridge();
}

function getRPCBridge() {
  if (!bridge) {
    throw new Error("RPC bridge has not been initialized");
  }

  return bridge;
}

export const rpcClient = {
  system: {
    openExplorer: (params: OpenSystemExplorerParams) => getRPCBridge().request.openSystemExplorer(params),
  },
  settings: {
    load: () => getRPCBridge().request.loadSettings(),
    save: (params: UserSetting) =>
      getRPCBridge().request.saveSettings(params),
  },

  agent: {
    invoke: (params: RunAgentParams) => getRPCBridge().request.invokeAgent(params),
  },
};
