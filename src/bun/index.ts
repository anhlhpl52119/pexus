import type { AgentEvent } from "@shared/model";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { DevToolsTelemetry } from "@ai-sdk/devtools";
import { registerTelemetry } from "ai";
import { BrowserWindow, Updater, Utils } from "electrobun/bun";
import { rpc } from "@/rpc";

import { subscribe } from "@/runtime/bus";
import { database } from "./runtime/db";
import { setupApplicationMenu } from "./windows/application-menu";
import { setupContextMenu } from "./windows/context-menu";

async function main() {
  const baseConfigPath = await getConfigDir();

  // settings.json
  await ensureSettingsJSON(baseConfigPath);

  // database
  const chatHistoryDBConnStr = join(baseConfigPath, "chat-histories.sqlite");
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

async function ensureSettingsJSON(cfgPath: string) {
  const filePath = join(cfgPath, "settings.json");
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return;
  }
  await Bun.write(filePath, `{}`);
}

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    return "http://localhost:5173";
  }
  return "views://mainview/index.html";
}

async function getConfigDir() {
  const channel = await Updater.localInfo.channel();
  // development
  if (channel === "dev") {
    const devConfigPath = join(__PROJECT_ROOT__, ".devconfig");
    await mkdir(devConfigPath, { recursive: true });
    return devConfigPath;
  }

  // prod
  return Utils.paths.userData;
}

main()
  .catch(e => console.error("Failed to start bun", e));
