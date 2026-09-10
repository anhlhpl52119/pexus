import { Database } from "bun:sqlite";
// import { drizzle } from "drizzle-orm/bun-sqlite";
// import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

const client = new Database("temp.sqlite", { create: true });
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
