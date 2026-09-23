import type { RunAgentParams } from "@shared/contracts/rpc";
import { createGateway, generateText } from "ai";
import { nanoid } from "nanoid";
import { loadUserSetting } from "@/services/settings.service";

// const weatherTool = tool({
//   description: "Get the weather in a location",
//   inputSchema: z.object({
//     location: z.string().describe("The location to get the weather for"),
//   }),
//   execute: async ({ location }) => ({
//     location,
//     temperature: 72 + Math.floor(Math.random() * 21) - 10,
//   }),
// });

async function autoTitleAgent(prompt: string) {
  try {
    const { vercelApiKey } = await loadUserSetting();
    if (!vercelApiKey) {
      throw new Error("Missing vercel API key in config");
    }

    const gateway = createGateway({ apiKey: vercelApiKey });
    const { text } = await generateText({
      model: gateway("inclusionai/ling-3.0-flash"),
      reasoning: "low",
      instructions: `
You generate a short title that represents the user's conversation.

Requirement:
- Identify the user's primary topic, task, or intent.
- Write the title in the same language as the user's prompt. If the prompt contains multiple languages, use the dominant language.
- Keep the title concise and natural.
- Keep the title concise, ideally 3 to 8 words and never more than 15 words.
- Use plain text only.
- Do not use Markdown, emojis, quotation marks, or decorative symbols.
- Output the title only. Do not add explanations, quotes, or prefixes.

If the user's intent is unclear, create a concise title describing the most specific identifiable topic without guessing.
`,
      prompt,
    });
    return text;
  }
  catch (error) {
    console.error(error);
    return "Untitled";
  }
}

export async function runAgent(params: RunAgentParams) {
  const { vercelApiKey } = await loadUserSetting();
  if (!vercelApiKey) {
    throw new Error("Missing vercel API key in config");
  }

  // new
  if (params.conversationId === null) {
    const title = await autoTitleAgent(params.prompt);
    const conversationId = nanoid();
    //  add to db
    // ...
    return {
      conversationId,
      workflowId: params.workflowId,
      conversationTitle: title,
    };
  }
  // continue previous conversation
  else {
    const title = "query from db";
    const conversationId = params.conversationId;
    return {
      conversationId,
      workflowId: params.workflowId,
      conversationTitle: title,
    };
  }
};
