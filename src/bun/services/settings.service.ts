import z from "zod";

export const userSetting = z.object({
  vercelApiKey: z.string().default(""),
});

export type UserSetting = z.infer<typeof userSetting>;

export function saveUserSetting(settings: UserSetting) {
  const result = userSetting.safeParse(settings);
  if (result.error) {
    throw result.error.issues[0].message;
  }

  return result.data;
}

export function loadUserSetting() {

}
