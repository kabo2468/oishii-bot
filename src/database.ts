import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from 'kysely';
import { Pool } from 'pg';
import type { Config } from './config.js';
import type { Database } from './types/database.js';

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'migrations',
);

export function createDatabase(config: Config): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: config.databaseUrl,
        ssl: config.dbSSL,
      }),
    }),
  });
}

export function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: migrationsFolder,
    }),
  });
}

export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  const migrator = createMigrator(db);
  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((result) => {
    if (result.status === 'Success') {
      console.log(`[MIGRATE] ${result.migrationName}`);
    } else if (result.status === 'Error') {
      console.error(`[MIGRATE] ${result.migrationName} failed`);
    } else if (result.status === 'NotExecuted') {
      console.warn(`[MIGRATE] ${result.migrationName} not executed`);
    }
  });

  if (error) {
    throw error;
  }
}
