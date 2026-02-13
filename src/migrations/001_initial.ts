/** biome-ignore-all lint/suspicious/noExplicitAny: Use any instead of Database */
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('oishii_table')
    .ifNotExists()
    .addColumn('name', 'text', (col) => col.primaryKey())
    .addColumn('good', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('learned', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('userId', 'text')
    .addColumn('noteId', 'text')
    .addColumn('created', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updated', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('oishii_table').ifExists().execute();
}
