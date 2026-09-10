import z from "zod";

export const userConfig = z.object({
  vercelApiKey: z.string().default(""),
});
export type UserConfig = z.infer<typeof userConfig>;
