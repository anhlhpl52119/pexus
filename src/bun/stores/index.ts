import type { UserConfig } from "@shared/user-config";
import { chmodSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { userConfig } from "@shared/user-config";
import { Updater } from "electrobun";

export async function getConfigDir(): Promise<string> {
  const channel = await Updater.localInfo.channel();

  // development
  if (channel === "dev") {
    return join(__PROJECT_ROOT__, ".devconfig");
  }

  const home = homedir();
  switch (process.platform) {
    case "darwin":
      // ~/Library/Application Support/<__APP_NAME__>
      return join(home, "Library", "Application Support", __APP_NAME__);

    case "win32":
      // C:\Users\<user>\AppData\Roaming\<__APP_NAME__>
      return join(home, "AppData", "Roaming", __APP_NAME__);

    default:
      // linux ~/.config/<__APP_NAME__>
      return join(home, ".config", __APP_NAME__);
  }
}

export async function enureConfigDir() {
  try {
    const cfgDir = await getConfigDir();
    await mkdir(cfgDir, { recursive: true });
    chmodSync(cfgDir, 0o700);

    const jsonSettingPath = join(cfgDir, "config.json");
    const settingsJsonFile = Bun.file(jsonSettingPath);
    if (!await settingsJsonFile.exists()) {
      Bun.write(jsonSettingPath, JSON.stringify({ vercelApiKey: "" }));
    }
  }
  catch (err) {
    console.error(err);
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
