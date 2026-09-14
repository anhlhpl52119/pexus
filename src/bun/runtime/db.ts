import { join } from "node:path";
import { Database } from "bun:sqlite";
import { getConfigDir } from "./store";
// import { drizzle } from "drizzle-orm/bun-sqlite";
// import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

const vault = join(await getConfigDir(), "history.sqlite");
const client = new Database(vault, { create: true });
// const db = drizzle({ client });

// export const usersTable = pgTable("users", {
//   id: integer().primaryKey().generatedAlwaysAsIdentity(),
//   name: varchar({ length: 255 }).notNull(),
//   age: integer().notNull(),
//   email: varchar({ length: 255 }).notNull().unique(),
// });

export async function ensureSchema(): Promise<void> {
  await client.run(
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      working_dir TEXT,
      created_at INTEGER NOT NULL,
    )`,
  );
  await client.run(
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      role TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
      PRIMARY KEY (chat_id, id),
      UNIQUE (chat_id, sequence),
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )`,
  );
}
