import type { UIMessage } from "ai";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { asc, eq, max, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { cidr } from "drizzle-orm/pg-core/columns/cidr";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { getConfigDir } from "@/stores";

const vault = join(await getConfigDir(), "vault.sqlite");

export const client = new Database(vault, {
  create: true,
});

client.run("PRAGMA journal_mode = WAL");
client.run("PRAGMA foreign_keys = ON");

export const db = drizzle({ client });

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  workingDir: text("working_dir"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    role: text("role", {
      enum: ["system", "user", "assistant"],
    }).notNull(),
    status: text("status", {
      enum: ["completed", "failed", "cancelled"],
    })
      .notNull()
      .default("completed"),
    parts: text("parts", {
      mode: "json",
    })
      .$type<UIMessage["parts"]>()
      .notNull(),

    failedReason: text("failed_reason"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  table => [
    uniqueIndex("messages_conversation_sequence_unique").on(
      table.conversationId,
      table.sequence,
    ),

    index("messages_conversation_id_idx").on(table.conversationId),
  ],
);

export async function ensureSchema() {
  db.run(sql`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    working_dir TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

  db.run(sql`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL
      REFERENCES conversations(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    parts TEXT NOT NULL,
    failed_reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

  db.run(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_sequence_unique
  ON messages(conversation_id, sequence)
`);

  db.run(sql`
  CREATE INDEX IF NOT EXISTS messages_conversation_id_idx
  ON messages(conversation_id)
`);
}

export function retrieveConversationById(id: string) {
  const conversation = db.select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .get();
  if (!conversation) {
    return null;
  }

  const relatedMsg = db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.sequence))
    .all();

  return {
    ...conversation,
    messages: relatedMsg,
  };
}

export function appendMessagePart(messageId: string, part: UIMessage["parts"][number]) {
  return db
    .update(messages)
    .set({
      parts: sql`
        json_insert(
          ${messages.parts},
          '$[#]',
          json(${JSON.stringify(part)})
        )
      `,
    })
    .where(eq(messages.id, messageId))
    .returning()
    .get();
}

export function appendNewMessage(conversationId: string, message: UIMessage) {
  return db.transaction((tx) => {
    const result = tx
      .select({
        maxSequence: max(messages.sequence),
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .get();

    const sequence = (result?.maxSequence ?? 0) + 1;

    return tx
      .insert(messages)
      .values({
        id: message.id,
        conversationId,
        sequence,
        role: message.role,
        parts: message.parts,
      })
      .returning()
      .get();
  });
}

export function appendNewConversation(title: string, workingDir: string | null) {
  const now = new Date().toISOString();
  return db.insert(conversations)
    .values({
      id: nanoid(),
      title,
      workingDir,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

export function updateMessageStatus(messageId: string, status: "completed" | "failed" | "cancelled", failedReason?: string) {
  return db.update(messages)
    .set({ status, failedReason })
    .where(eq(messages.id, messageId))
    .returning()
    .get();
}
