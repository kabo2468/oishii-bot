import { Pool } from 'pg';
import loadConfig from './config';

loadConfig()
    .then(async (config) => {
        const pool = new Pool({
            connectionString: config.databaseUrl,
            ssl: config.dbSSL,
        });
        const client = await pool.connect();

        try {
            console.log('Migration Start.');

            await client.query('BEGIN');

            log('CREATE TABLE');
            const createTableQuery = 'CREATE TABLE IF NOT EXISTS oishii_table ( "name" text PRIMARY KEY, "good" boolean DEFAULT true NOT NULL, "learned" boolean DEFAULT false NOT NULL )';
            await client.query(createTableQuery).then((res) => console.log(res));

            log('ADD UserId & NoteId');
            const addUserNoteIdTSQuery =
                'ALTER TABLE IF EXISTS oishii_table ADD IF NOT EXISTS "userId" text, ADD IF NOT EXISTS "noteId" text, ADD IF NOT EXISTS "created" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD IF NOT EXISTS "updated" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP';
            await client.query(addUserNoteIdTSQuery).then((res) => console.log(res));

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            log('ROLLBACK');
            throw e;
        } finally {
            console.log('Migration End.');
            client.release();
        }
    })
    .catch((e) => console.error(e.stack));

function log(text: string): void {
    const bar = '-'.repeat(10);
    console.log(`${bar} ${text} ${bar}`);
}
