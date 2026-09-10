import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { Updater } from "electrobun";
import z from "zod";

const userConfig = z.object({
  vercelApiKey: z.string().default(""),
});
type UserConfig = z.infer<typeof userConfig>;

export function getConfigDir(): string {
  const rootDir = homedir();

  if (process.platform === "darwin") {
    // ~/Library/Application Support
    return join(rootDir, "Library", "Application Support", __APP_NAME__);
  }

  if (process.platform === "win32") {
    // C:\Users\<user>\AppData\Roaming
    return join(join(rootDir, "AppData", "Roaming"), __APP_NAME__);
  }

  // linux ~/.config/<app_name>
  return join(join(rootDir, ".config"), __APP_NAME__);
}

export async function getUserConfigPath(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  return channel === "dev"
    ? resolve(__PROJECT_ROOT__, "config.dev.json")
    : join(getConfigDir(), "config.json");
}

export async function loadUserConfig(): Promise<UserConfig> {
  const cfgPath = await getUserConfigPath();
  const cfgFile = Bun.file(cfgPath);

  const exist = await cfgFile.exists();
  if (!exist) {
    await mkdir(getConfigDir(), { recursive: true });
    const defaultConfig = userConfig.parse({});
    await Bun.write(cfgPath, JSON.stringify(defaultConfig, null, 2));

    return defaultConfig;
  }

  const cfg = userConfig.parse(await cfgFile.json());
  return cfg;
}

export async function saveUserConfig(cfg: UserConfig): Promise<UserConfig> {
  await Bun.write(await getUserConfigPath(), JSON.stringify(cfg, null, 2));

  return cfg;
}
