import to from "await-to-js";
import z from "zod";
import { store } from "@/runtime/store";

export const userSetting = z.object({
  vercelApiKey: z.string().default(""),
});

export type UserSetting = z.infer<typeof userSetting>;

export async function saveUserSetting(settings: UserSetting) {
  const result = userSetting.safeParse(settings);
  if (result.error) {
    throw result.error.issues[0].message;
  }

  const [err] = await to(Bun.write(
    store.userSettingPath(),
    JSON.stringify(result.data, null, 2),
  ));

  if (err)
    throw err;

  return result.data;
}

export async function loadUserSetting(): Promise<UserSetting> {
  try {
    const settings = await Bun.file(store.userSettingPath()).json();
    return userSetting.parse(settings);
  }
  catch (error) {
    console.error(error);
    return {} as any;
  }
}
