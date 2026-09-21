import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Updater, Utils } from "electrobun";

let configDir: string | null = null;
let channel: "dev" | string | null = null;

export const store = {
  async setup() {
    channel = await Updater.localInfo.channel();
    configDir = await getConfigDir();
  },

  getConfigDir() {
    if (configDir === null) {
      throw new Error("Config directory is not available!");
    }
    return configDir;
  },

  userSettingPath() {
    if (configDir === null) {
      throw new Error("Config directory is not available!");
    }
    return join(configDir, "settings.json");
  },

  getChannel() {
    if (channel === null) {
      throw new Error("Cannot determine running channel");
    }
    return channel;
  },
};

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
