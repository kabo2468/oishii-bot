/** biome-ignore-all lint/suspicious/noExplicitAny: Use any instead of Database */
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('food')
    .addColumn('id', 'integer', (col) =>
      col.primaryKey().generatedAlwaysAsIdentity(),
    )
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('good', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('is_user_taught', 'boolean', (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn('user_id', 'text')
    .addColumn('note_id', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  // Copy data from oishii_table to food
  await db
    .insertInto('food')
    .columns([
      'name',
      'good',
      'is_user_taught',
      'user_id',
      'note_id',
      'created_at',
    ])
    .expression((eb) =>
      eb
        .selectFrom('oishii_table')
        .select(['name', 'good', 'learned', 'userId', 'noteId', 'created']),
    )
    .execute();

  // Composite index for lookup
  await db.schema
    .createIndex('idx_food_composite_lookup')
    .on('food')
    .columns(['name', 'created_at desc', 'good', 'is_user_taught'])
    .execute();

  // Index for case insensitive search
  await db.schema
    .createIndex('idx_food_name_lower')
    .on('food')
    .expression(sql`lower(name)`)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Copy latest record per name back to oishii_table
  await db
    .insertInto('oishii_table')
    .columns([
      'name',
      'good',
      'learned',
      'userId',
      'noteId',
      'created',
      'updated',
    ])
    .expression((eb) =>
      eb
        .selectFrom('food')
        .select([
          'name',
          'good',
          'is_user_taught',
          'user_id',
          'note_id',
          'created_at',
          'created_at',
        ])
        .distinctOn(['name'])
        .orderBy('name')
        .orderBy('created_at', 'desc'),
    )
    .onConflict((oc) =>
      oc.column('name').doUpdateSet((eb) => ({
        good: eb.ref('excluded.good'),
        learned: eb.ref('excluded.learned'),
        userId: eb.ref('excluded.userId'),
        noteId: eb.ref('excluded.noteId'),
        updated: eb.ref('excluded.updated'),
      })),
    )
    .execute();

  await db.schema.dropTable('food').execute();
}
