import { exec } from "node:child_process";
import { cwd as getProcessCwd } from "node:process";
import { EventType } from "@shared/event";
import { tool } from "ai";
import { randomUUIDv7 } from "bun";
import z from "zod";
import { emit } from "@/runtime/bus";

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
  return BLACKLISTED_PREFIXES.includes(firstToken);
}

interface ToolContext {
  workflowId: string;
  cwd: string | null;
  abortSignal?: AbortSignal;
  onToolRejected?: () => void;
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

async function executeBash(
  command: string,
  context: {
    workflowId: string;
    cwd: string;
    abortSignal?: AbortSignal;
    onToolRejected?: () => void;
  },
): Promise<Record<string, unknown>> {
  if (isBlacklisted(command)) {
    const toolCallId = randomUUIDv7();

    await emit({
      workflowId: context.workflowId,
      type: EventType.ApprovalRequested,
      toolCallId,
      action: command,
      args: { command, cwd: context.cwd },
    });

    const approved = await new Promise<boolean>((resolve) => {
      const onAbort = () => {
        pendingApprovals.delete(toolCallId);
        resolve(false);
      };
      const settle = (value: boolean) => {
        context.abortSignal?.removeEventListener("abort", onAbort);
        pendingApprovals.delete(toolCallId);
        resolve(value);
      };

      pendingApprovals.set(toolCallId, settle);
      if (context.abortSignal?.aborted) {
        onAbort();
      }
      else {
        context.abortSignal?.addEventListener("abort", onAbort, { once: true });
      }
    });

    if (!approved) {
      context.onToolRejected?.();
      return {
        success: false,
        rejected: true,
        error: "Command denied by user — blacklisted command requires approval",
      };
    }
  }

  return new Promise((resolve) => {
    exec(command, { cwd: context.cwd, signal: context.abortSignal }, (error, stdout, stderr) => {
      const errorCode = error && (error as NodeJS.ErrnoException).code;
      const exitCode = typeof errorCode === "number" ? errorCode : error ? 1 : 0;

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

export function createTools(context: ToolContext) {
  const executionCwd = context.cwd ?? getProcessCwd();

  return {
    bashExecution: tool({
      description:
        "Execute a bash command in the client-selected workspace. The working directory is controlled by the client.",
      inputSchema: z.object({
        command: z
          .string()
          .trim()
          .min(1)
          .describe("The bash command to execute"),
      }),
      execute: ({ command }) =>
        executeBash(command, {
          workflowId: context.workflowId,
          cwd: executionCwd,
          abortSignal: context.abortSignal,
          onToolRejected: context.onToolRejected,
        }),
    }),
  };
}
