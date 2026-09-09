import type { UIMessage } from "ai";
import type { HistoryStore } from "./history";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUIDv7 } from "bun";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHistoryStore } from "./history";

let store: HistoryStore;
let databasePath: string;

function userMessage(id: string, text: string): UIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

beforeEach(() => {
  databasePath = join(tmpdir(), `pexus-history-${randomUUIDv7()}.sqlite`);
  store = createHistoryStore(databasePath);
});

afterEach(() => {
  store.close();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
});

describe("history store", () => {
  it("restores messages in order and replaces assistant drafts", () => {
    store.createChat("chat-1");
    store.appendMessage("chat-1", userMessage("user-1", "hello"), "completed");
    for (const [id, status] of [
      ["assistant-streaming", "streaming"],
      ["assistant-failed", "failed"],
      ["assistant-cancelled", "cancelled"],
    ] as const) {
      store.appendMessage("chat-1", {
        id,
        role: "assistant",
        parts: [],
      }, status);
    }

    expect(store.loadChat("chat-1").messages.map(message => message.id)).toEqual(["user-1"]);

    store.appendMessage("chat-1", {
      id: "assistant-1",
      role: "assistant",
      parts: [{ type: "text", text: "hi" }],
    }, "completed");

    expect(store.loadChat("chat-1").messages.map(message => message.id)).toEqual(["user-1", "assistant-1"]);
  });

  it("detects duplicate message IDs without creating another row", () => {
    store.appendMessage("chat-1", userMessage("user-1", "hello"), "completed");
    expect(store.hasMessage("chat-1", "user-1")).toBe(true);

    store.appendMessage("chat-1", userMessage("user-1", "updated"), "completed");
    expect(store.loadChat("chat-1").messages).toHaveLength(1);
    expect(store.loadChat("chat-1").messages[0]?.parts[0]).toEqual({
      type: "text",
      text: "updated",
    });
  });

  it("rejects invalid chat IDs", () => {
    expect(() => store.loadChat("../outside")).toThrow("Invalid chat ID");
  });
});
