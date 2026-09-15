import type { UIMessage } from "ai";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";

import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
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

    error: text("error"),
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
    error TEXT,
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
