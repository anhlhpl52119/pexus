import { exec } from "node:child_process";
import { EventType } from "@shared/event";
import { tool } from "ai";
import { randomUUIDv7 } from "bun";
import z from "zod";
import { emit } from "@/runtime/bus";

// const KNOWLEDGE_BASE: Record<string, string> = {
//   billing:
//     "Double charges are usually a duplicate authorization that drops off in 3–5 days. If it already settled, refund immediately.",
//   refund: "Refunds post in 5–10 business days. Pro accounts can be expedited.",
//   export:
//     "The Safari export failure is a known bug (TICKET-4412). Workaround: use Chrome or the CSV export.",
//   pricing:
//     "Team plans are $20/seat/mo with a volume discount at 25+ seats. For 50+ seats, send the pricing PDF.",
// };

/**
 * Blacklisted command prefixes that require explicit user approval.
 */
const BLACKLISTED_PREFIXES = [
  "rm",
  "rmdir",
  "delete",
  "format",
  "dd",
  "mkfs",
  "mv",
  "chmod",
  "chown",
  ":>",
];

/**
 * Check if a command starts with a blacklisted prefix.
 */
function isBlacklisted(command: string): boolean {
  const firstToken = command.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return BLACKLISTED_PREFIXES.some(
    prefix => firstToken === prefix || command.trim().startsWith(prefix),
  );
}

// --- State ---

let currentCwd: string | null = null;
let currentWorkflowId: string = "";

export function setCwd(cwd: string | null) {
  currentCwd = cwd;
}

export function setWorkflowId(id: string) {
  currentWorkflowId = id;
}

// --- Approval Mechanism ---

const pendingApprovals = new Map<
  string,
  (approved: boolean) => void
>();

export function resolveApproval(
  toolCallId: string,
  approved: boolean,
) {
  const resolver = pendingApprovals.get(toolCallId);
  if (resolver) {
    resolver(approved);
    pendingApprovals.delete(toolCallId);
  }
}

// --- Tools ---

export const tools = {
  // searchKnowledgeBase: tool({
  //   description:
  //     "Search the support knowledge base for relevant articles.",
  //   inputSchema: z.object({
  //     query: z.string().describe("what to look up"),
  //   }),
  //   execute: args =>
  //     toolsTrigger("searchKnowledgeBase", args),
  // }),

  // classifyItem: tool({
  //   description:
  //     "Classify a work item into a category.",
  //   inputSchema: z.object({
  //     itemId: z.string(),
  //     category: z.enum(["billing", "technical", "sales", "other"]),
  //   }),
  //   execute: args =>
  //     toolsTrigger("classifyItem", args),
  // }),

  // draftReply: tool({
  //   description:
  //     "Write a draft reply for a work item. Does not send anything.",
  //   inputSchema: z.object({
  //     itemId: z.string(),
  //     message: z.string(),
  //   }),
  //   execute: args =>
  //     toolsTrigger("draftReply", args),
  // }),

  // sendReply: tool({
  //   description:
  //     "Send the drafted reply to the customer. This really emails them.",
  //   inputSchema: z.object({
  //     itemId: z.string(),
  //     draftId: z.string(),
  //   }),
  //   execute: args =>
  //     toolsTrigger("sendReply", args),
  // }),

  bashExecution: tool({
    description:
      "Execute a bash command within the specified workspace directory. Use with caution.",
    inputSchema: z.object({
      command: z
        .string()
        .describe("The bash command to execute"),
      cwd: z
        .string()
        .nullable()
        .optional()
        .describe(
          "The working directory for the command. Uses the current workspace if not provided.",
        ),
    }),
    execute: async args =>
      toolsTrigger("bashExecution", args),
  }),
};

export async function toolsTrigger(
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (name) {
    // case "searchKnowledgeBase": {
    //   const query = String(args.query ?? "").toLowerCase();
    //   const hits = Object.entries(KNOWLEDGE_BASE)
    //     .filter(([key]) => query.includes(key))
    //     .map(([, article]) => article);
    //   return {
    //     articles: hits.length ? hits : ["No exact match — use your judgment."],
    //   };
    // }
    // case "classifyItem":
    //   return { ok: true, itemId: args.itemId, category: args.category };
    // case "draftReply":
    //   return { ok: true, draftId: `draft-${args.itemId}` };
    // case "sendReply":
    //   return { sent: true, itemId: args.itemId, draftId: args.draftId };
    case "bashExecution": {
      const command = String(args.command ?? "");
      const cwd = (args.cwd as string | null) ?? currentCwd;
      const workflowId = currentWorkflowId;

      // Check blacklist
      if (isBlacklisted(command)) {
        const toolCallId = randomUUIDv7();

        await emit({
          workflowId,
          type: EventType.ApprovalRequested,
          toolCallId,
          action: command,
          args: { command, cwd },
        });

        // Wait for user approval
        const approved = await new Promise<boolean>((resolve) => {
          pendingApprovals.set(toolCallId, resolve);
        });

        if (!approved) {
          return {
            success: false,
            error: "Command denied by user — blacklisted command requires approval",
          };
        }
      }

      // Execute the command
      return new Promise((resolve) => {
        exec(command, { cwd: cwd ?? undefined }, (error, stdout, stderr) => {
          const exitCode = (error as { status?: number })?.status ?? 0;
          resolve({
            success: !error,
            stdout: stdout ?? "",
            stderr: stderr ?? "",
            code: exitCode,
            message: error instanceof Error ? error.message : "",
          });
        });
      });
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}
