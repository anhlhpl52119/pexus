import type { UIMessage } from "ai";
import { chmodSync } from "node:fs";
import { Database } from "bun:sqlite";

export type StoredMessageStatus = "streaming" | "completed" | "failed" | "cancelled";

export interface ChatHistory {
  id: string;
  messages: UIMessage[];
}
export interface HistoryStore {
  createChat: (chatId: string) => ChatHistory;
  hasMessage: (chatId: string, messageId: string) => boolean;
  loadChat: (chatId: string) => ChatHistory;
  appendMessage: (chatId: string, message: UIMessage, status: StoredMessageStatus) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: StoredMessageStatus) => void;
  close: () => void;
}

interface MessageRow {
  id: string;
  payload_json: string;
}

export function createHistoryStore(databasePath: string): HistoryStore {
  const database = new Database(databasePath);
  try {
    chmodSync(databasePath, 0o600);
  }
  catch {
    // Some platforms do not support Unix file modes.
  }

  database.run("PRAGMA journal_mode = WAL");
  database.run("PRAGMA foreign_keys = ON");
  database.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS messages (
      chat_id TEXT NOT NULL,
      id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      role TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (chat_id, id),
      UNIQUE (chat_id, sequence),
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE INDEX IF NOT EXISTS messages_chat_sequence_idx
    ON messages(chat_id, sequence)
  `);

  function assertChatId(chatId: string): void {
    if (!/^[\w-]{1,128}$/.test(chatId)) {
      throw new Error("Invalid chat ID.");
    }
  }

  function now(): number {
    return Date.now();
  }

  function ensureChat(chatId: string): void {
    assertChatId(chatId);
    const timestamp = now();
    database.query(`
      INSERT INTO chats (id, created_at, updated_at)
      VALUES ($id, $createdAt, $updatedAt)
      ON CONFLICT (id) DO NOTHING
    `).run({ $id: chatId, $createdAt: timestamp, $updatedAt: timestamp });
  }

  function readMessages(chatId: string): UIMessage[] {
    const rows = database.query(`
      SELECT id, payload_json
      FROM messages
      WHERE chat_id = $chatId
      ORDER BY sequence ASC
    `).all({ $chatId: chatId }) as MessageRow[];

    return rows.map((row) => {
      try {
        return JSON.parse(row.payload_json) as UIMessage;
      }
      catch {
        throw new Error(`Stored message ${row.id} contains invalid JSON.`);
      }
    }).filter(message => message.role !== "assistant" || message.parts.length > 0);
  }

  function loadChat(chatId: string): ChatHistory {
    ensureChat(chatId);
    return { id: chatId, messages: readMessages(chatId) };
  }

  function createChat(chatId: string): ChatHistory {
    ensureChat(chatId);
    return { id: chatId, messages: [] };
  }

  function hasMessage(chatId: string, messageId: string): boolean {
    ensureChat(chatId);
    const row = database.query(`
      SELECT 1 AS present
      FROM messages
      WHERE chat_id = $chatId AND id = $messageId
      LIMIT 1
    `).get({ $chatId: chatId, $messageId: messageId }) as { present: number } | null;
    return row?.present === 1;
  }

  function appendMessage(
    chatId: string,
    message: UIMessage,
    status: StoredMessageStatus,
  ): void {
    ensureChat(chatId);

    const timestamp = now();
    const payload = JSON.stringify(message);
    const transaction = database.transaction(() => {
      const existing = database.query(`
        SELECT sequence
        FROM messages
        WHERE chat_id = $chatId AND id = $messageId
      `).get({ $chatId: chatId, $messageId: message.id }) as { sequence: number } | null;

      if (existing) {
        database.query(`
          UPDATE messages
          SET role = $role,
              payload_json = $payload,
              status = $status,
              updated_at = $updatedAt
          WHERE chat_id = $chatId AND id = $messageId
        `).run({
          $chatId: chatId,
          $messageId: message.id,
          $role: message.role,
          $payload: payload,
          $status: status,
          $updatedAt: timestamp,
        });
      }
      else {
        const nextSequence = database.query(`
          SELECT COALESCE(MAX(sequence), -1) + 1 AS sequence
          FROM messages
          WHERE chat_id = $chatId
        `).get({ $chatId: chatId }) as { sequence: number };

        database.query(`
          INSERT INTO messages (
            chat_id, id, sequence, role, payload_json, status, created_at, updated_at
          ) VALUES (
            $chatId, $messageId, $sequence, $role, $payload, $status, $createdAt, $updatedAt
          )
        `).run({
          $chatId: chatId,
          $messageId: message.id,
          $sequence: nextSequence.sequence,
          $role: message.role,
          $payload: payload,
          $status: status,
          $createdAt: timestamp,
          $updatedAt: timestamp,
        });
      }

      database.query(`
        UPDATE chats SET updated_at = $updatedAt WHERE id = $chatId
      `).run({ $chatId: chatId, $updatedAt: timestamp });
    });

    transaction();
  }

  function updateMessageStatus(
    chatId: string,
    messageId: string,
    status: StoredMessageStatus,
  ): void {
    assertChatId(chatId);
    database.query(`
      UPDATE messages
      SET status = $status, updated_at = $updatedAt
      WHERE chat_id = $chatId AND id = $messageId
    `).run({
      $chatId: chatId,
      $messageId: messageId,
      $status: status,
      $updatedAt: now(),
    });
  }

  return {
    createChat,
    hasMessage,
    loadChat,
    appendMessage,
    updateMessageStatus,
    close: () => database.close(),
  };
}
