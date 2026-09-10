import { chmodSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHistoryStore } from "./history";
import { getConfigDir } from "./store";

const configDir = getConfigDir();
mkdirSync(configDir, { recursive: true, mode: 0o700 });
try {
  chmodSync(configDir, 0o700);
}
catch {
  // Some platforms do not support Unix file modes.
}

const productionStore = createHistoryStore(join(configDir, "history.sqlite"));

export const createChat = productionStore.createChat;
export const hasMessage = productionStore.hasMessage;
export const loadChat = productionStore.loadChat;
export const appendMessage = productionStore.appendMessage;
export const updateMessageStatus = productionStore.updateMessageStatus;
