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
            await client.query('BEGIN');

            // CREATE TABLE
            const createTableQuery = 'CREATE TABLE IF NOT EXISTS oishii_table ( name text PRIMARY KEY, good boolean DEFAULT true NOT NULL, learned boolean DEFAULT false NOT NULL )';
            pool.query(createTableQuery).then((res) => {
                console.log(res);
            });

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    })
    .catch((e) => console.error(e.stack));
