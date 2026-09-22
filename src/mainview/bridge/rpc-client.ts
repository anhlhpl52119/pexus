import type { AppRPC } from "@shared/rpc";
import type { Utils } from "electrobun";
import type { UserSetting } from "../../bun/services/settings.service";
import { Electroview } from "electrobun/view";

let bridge: ReturnType<typeof createRPCBridge> | undefined;

function createRPCBridge() {
  const rpc = Electroview.defineRPC<AppRPC>({
    maxRequestTime: 15_000,
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
  settings: {
    load: () => getRPCBridge().request.loadSettings(),
    save: (settings: UserSetting) =>
      getRPCBridge().request.saveSettings(settings),
  },

  system: {
    openFileDialog: (options: Parameters<typeof Utils.openFileDialog>[0]) =>
      getRPCBridge().request.openSystemExplorer(options),
  },
};
