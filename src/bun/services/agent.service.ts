import type { RunAgentParams } from "@shared/contracts/rpc";
import { createGateway, stepCountIs, tool, ToolLoopAgent } from "ai";
import z from "zod";

const weatherTool = tool({
  description: "Get the weather in a location",
  inputSchema: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});

export async function runAgent(params: RunAgentParams) {
  const gateway = createGateway({ apiKey: params.apiKey });
  const agent = new ToolLoopAgent({
    model: gateway(params.modelId),
    instructions: "You are a helpful assistant.",
    stopWhen: stepCountIs(20),
    tools: {
      weatherTool,
    },
  });
  const result = await agent.stream({ prompt: params.prompt });
  return await result.text;
};
