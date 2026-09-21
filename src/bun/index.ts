import type { AgentEvent } from "@shared/model";
import { join } from "node:path";
import { DevToolsTelemetry } from "@ai-sdk/devtools";
import { registerTelemetry } from "ai";
import { BrowserWindow, Updater } from "electrobun/bun";
import { rpc } from "@/rpc";

import { subscribe } from "@/runtime/bus";
import { store } from "@/runtime/store";
import { database } from "./runtime/db";
import { setupApplicationMenu } from "./windows/application-menu";

import { setupContextMenu } from "./windows/context-menu";

async function main() {
  await store.setup();

  // settings.json
  await ensureSettingsJSON(store.userSettingPath());

  // database
  const chatHistoryDBConnStr = join(store.getConfigDir(), "chat-histories.sqlite");
  database.setup(chatHistoryDBConnStr);

  // window
  const bw = new BrowserWindow({
    title: __APP_NAME__,
    url: await getMainViewUrl(),
    rpc,
    frame: {
      width: 1200,
      height: 900,
      x: 200,
      y: 200,
    },
  });

  subscribe((event: AgentEvent) => {
    bw.webview.rpc?.send.agentEvent(event);
  });

  setupApplicationMenu();
  setupContextMenu();

  // devtool
  registerTelemetry(DevToolsTelemetry());

  console.warn("🌐 Bun started!! ");
}

async function ensureSettingsJSON(path: string) {
  const file = Bun.file(path);
  if (await file.exists()) {
    return;
  }
  await Bun.write(path, `{}`);
}

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    return "http://localhost:5173";
  }
  return "views://mainview/index.html";
}

main()
  .catch(e => console.error("Failed to start bun", e));
