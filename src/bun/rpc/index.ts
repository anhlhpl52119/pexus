import type { AppRPC, RPCResult } from "@shared/rpc";
import { BrowserView, Utils } from "electrobun";
import { loadUserSetting, saveUserSetting } from "@/services/settings.service";

export const rpc = BrowserView.defineRPC<AppRPC>({
  maxRequestTime: 15_000,
  handlers: {
    requests: {
      openSystemExplorer: payload => runRpcAction(() => Utils.openFileDialog(payload)),
      saveSettings: payload => runRpcAction(() => saveUserSetting(payload)),
      loadSettings: () => runRpcAction(() => loadUserSetting()),
    },
    messages: {
      // No browser->bun messages are currently required.
      "*": () => {},
    },
  },
});

type MaybePromise<T> = T | Promise<T>;
async function runRpcAction<T>(action: () => MaybePromise<T>): Promise<RPCResult<T>> {
  try {
    return {
      ok: true,
      data: await action(),
    };
  }
  catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
