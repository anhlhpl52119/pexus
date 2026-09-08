# bashExecution Tool Implementation Plan

## Status: ✅ COMPLETED

All implementation steps have been completed and verified with type checks passing.

## Summary of Changes

### Backend (`src/bun/`)

1. **`src/bun/harness/tools/index.ts`** - Added `bashExecution` tool with:
   - Blacklist detection (`rm`, `rmdir`, `delete`, `format`, `dd`, `mkfs`, `mv`, `chmod`, `chown`, `:>`)
   - Approval mechanism via `pendingApprovals` Map with `resolveApproval` export
   - Module-level `currentCwd` and `currentWorkflowId` state with `setCwd`/`setWorkflowId` exports
   - Command execution via `child_process.exec` with `cwd` constraint
   - Returns `{ success, stdout, stderr, code, message }`

2. **`src/bun/runtime/agent-runner.ts`** - Updated to:
   - Import `setCwd` and `setWorkflowId` from `@/harness/tools`
   - Accept `cwd` in `RunWorkflowOptions`
   - Call `setCwd(cwd ?? null)` and `setWorkflowId(workflowId)` before creating the agent
   - Pass `cwd` to `runWorkflow` call

3. **`src/bun/runtime/rpc.ts`** - Updated handlers:
   - Added `selectWorkspace` handler (native directory picker)
   - Added `requestApproval` handler (resolves pending approval)
   - Updated `startAgent` to accept and pass `cwd`
   - Imported `resolveApproval` and `setCwd` from tools

4. **`src/shared/rpc.ts`** - Updated `MyWebviewRPCType`:
   - Added `selectWorkspace`, `requestApproval` to `bun.requests`
   - Added `requestApproval` to `webview.requests`
   - Added `cwd: string | null` to `startAgent.params`

### Frontend (`src/mainview/`)

5. **`src/mainview/views/index.vue`** - Added UI:
   - Shadcn-vue `Select` component for workspace directory selector
   - Options: "Without workspace" (null), "~~/Projects", "~~/Development"
   - Shadcn-vue `Dialog` component for approval confirmation
   - Approval dialog shows command and has Approve/Deny buttons
   - `selectedWorkspace` ref passed to `submit()` as `cwd`

6. **`src/mainview/electroview.ts`** - Updated to:
   - Added `requestApproval` export function
   - Added `cwd` parameter to `startAgentStream` (defaults to `null`)
   - Removed `requestApproval` handler from `Electroview.defineRPC` (prevents circular reference)

7. **`src/mainview/composables/useAIStream.ts`** - Updated to:
   - Handle `ApprovalRequested` and `ApprovalResolved` events
   - Expose `approvalDialogOpen`, `pendingApproval`, `handleApproval`
   - Pass `cwd` to `startAgentStream`
   - Updated `submit` to accept optional `cwd` parameter

## Verification

- ✅ `bun run typecheck:bun` passes with no errors
- ✅ `bun run typecheck:app` has only pre-existing errors (not from these changes)
- ✅ All shadcn-vue components properly imported and used
- ✅ RPC types fully aligned between frontend and backend
- ✅ Approval flow: bashExecution → emit ApprovalRequested → dialog shown → requestApproval → resolveApproval → command executes
