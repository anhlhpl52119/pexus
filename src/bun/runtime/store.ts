import type { UserConfig } from "@shared/user-config";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { userConfig } from "@shared/user-config";
import { Updater } from "electrobun";

export async function getConfigDir(): Promise<string> {
  // development
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    return join(__PROJECT_ROOT__, ".devconfig");
  }

  const home = homedir();
  switch (process.platform) {
    case "darwin":
      return join(home, "Library", "Application Support", __APP_NAME__);

    case "win32":
      return join(home, "AppData", "Roaming", __APP_NAME__);

    default:
      return join(home, ".config", __APP_NAME__);
  }
}

export async function getConfigJSONPath(): Promise<string> {
  const configPath = await getConfigDir();
  return join(configPath, "config.json");
}

export async function loadUserConfig(): Promise<UserConfig> {
  const cfgPath = await getConfigJSONPath();
  const cfgFile = Bun.file(cfgPath);

  const exist = await cfgFile.exists();
  if (!exist) {
    await mkdir(await getConfigDir(), { recursive: true });
    const defaultConfig = userConfig.parse({});
    await Bun.write(cfgPath, JSON.stringify(defaultConfig, null, 2));

    return defaultConfig;
  }

  const cfg = userConfig.parse(await cfgFile.json());
  return cfg;
}

export async function saveUserConfig(cfg: UserConfig): Promise<UserConfig> {
  await Bun.write(await getConfigJSONPath(), JSON.stringify(cfg, null, 2));

  return cfg;
}
