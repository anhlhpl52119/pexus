import { join } from "node:path";
import { Database } from "bun:sqlite";
import { getConfigDir } from "./store";
// import { drizzle } from "drizzle-orm/bun-sqlite";
// import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

const path = join(await getConfigDir(), "vault.sqlite");
const client = new Database(path, { create: true });
// const db = drizzle({ client });

// export const usersTable = pgTable("users", {
//   id: integer().primaryKey().generatedAlwaysAsIdentity(),
//   name: varchar({ length: 255 }).notNull(),
//   age: integer().notNull(),
//   email: varchar({ length: 255 }).notNull().unique(),
// });

export async function ensureSchema(): Promise<void> {
  await client.run(
    `CREATE TABLE IF NOT EXISTS event_log (
      seq  INTEGER PRIMARY KEY,
      data BLOB NOT NULL
    )`,
  );
}
