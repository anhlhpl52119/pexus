import type { JsonConfig } from "@shared/model";
import type { AppRPC } from "@shared/types";
import to from "await-to-js";
import { BrowserView, Utils } from "electrobun";

async function loadConfigFile(path: string): Promise<JsonConfig> {
  const [err, config] = await to(
    Bun.file(path).json(),
  );
  if (err) {
    throw new Error("Invalid format of config file");
  }

  return config;
}

export const rpc = BrowserView.defineRPC<AppRPC>({
  handlers: {
    requests: {
      openSystemExplorer: Utils.openFileDialog,
      // getUserConfig: loadConfigFile,
    },
    messages: {
      "*": () => {
        // No browser->bun messages are currently required.
      },
    },
  },
});
