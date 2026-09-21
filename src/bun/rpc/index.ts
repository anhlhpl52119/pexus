import type { AppRPC } from "@shared/types";
import { BrowserView, Utils } from "electrobun";

export const rpc = BrowserView.defineRPC<AppRPC>({
  handlers: {
    requests: {
      openSystemExplorer: Utils.openFileDialog,
    },
    messages: {
      // No browser->bun messages are currently required.
      "*": () => {},
    },
  },
});
