import z from "zod";

export const SYSTEM_PROMPTS = `You are a helper assistance agent. help me do the task.`;

export const CLASSIFICATION_SCHEMA = z.object({
  tag: z.enum(["coding", "workflow", "general"]),
});

export type ClassificationTag = z.infer<typeof CLASSIFICATION_SCHEMA>;

export const CLASSIFICATION_PROMPT = `You are an intelligent message router.

Analyze the user's message and classify it into exactly one of the following categories:
- coding: The user is asking about code, debugging, programming, software development, or technical implementation.
- workflow: The user is asking about processes, tasks, project management, organization, jira tickets, or workflow automation.
- general: The user is asking about anything else — general knowledge, casual conversation, or anything not related to coding or workflow.

Respond with ONLY a JSON object containing the tag. Do not add any other text.
Example: {"tag": "coding"}`;

export const AGENT_PROMPTS: Record<string, string> = {
  coding: `You are a coding assistant. You help users with software development, debugging, code review, and technical implementation.

Focus on delivering clean, correct code and clear explanations.`,
  workflow: `You are a workflow assistant. You help users with project management, task organization, process automation, and productivity.

Focus on actionable steps and clear organization.
`,
  general: `You are a general-purpose assistant. You help with a wide range of topics including knowledge questions, creative ideas, and casual conversation.

Be helpful, accurate, and concise.`,
};
