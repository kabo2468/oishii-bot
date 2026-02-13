/** biome-ignore-all lint/suspicious/noExplicitAny: Use any instead of Database */
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('valentine')
    .addColumn('user_id', 'text', (col) => col.notNull())
    .addColumn('year', 'integer', (col) => col.notNull())
    .addColumn('acct', 'text', (col) => col.notNull())
    .addColumn('gave_to_bot', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('received_from_bot', 'integer', (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addPrimaryKeyConstraint('valentine_pkey', ['user_id', 'year'])
    .execute();

  await db.schema
    .createIndex('idx_valentine_year')
    .on('valentine')
    .column('year')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('valentine').ifExists().execute();
}
