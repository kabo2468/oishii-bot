import { Config } from './config';
import NGWord from './ng-words';
import { Pool } from 'pg';
import ReconnectingWebSocket from 'reconnecting-websocket';

import wsConst from 'ws';

type Res<T> = {
    rows: Record<string, T>[];
    rowCount: number;
};

export class Bot {
    public config: Config;
    public ngWords: NGWord;
    public ws: ReconnectingWebSocket;
    private db: Pool;

    constructor(config: Config, ngWords: NGWord) {
        this.config = config;
        this.ngWords = ngWords;

        const psql = new Pool({
            ssl: config.dbSSL,
            connectionString: config.databaseUrl,
        });
        psql.on('error', (err) => {
            console.error('Unexpected error:', err);
            process.exit(1);
        });
        this.db = psql;

        this.ws = new ReconnectingWebSocket(`${config.wsUrl}/streaming?i=${config.apiKey}`, [], {
            WebSocket: wsConst,
        });
    }

    log(text?: string, ...arg: unknown[]): void {
        console.log(text, ...arg);
    }

    async existsWord(text: string): Promise<boolean> {
        return new Promise((resolve) => {
            const query = {
                text: 'SELECT EXISTS (SELECT * FROM oishii_table WHERE LOWER(name) = LOWER($1))',
                values: [text],
            };
            this.runQuery<boolean>(query).then((res) => {
                resolve(res.rows[0].exists);
            });
        });
    }

    async runQuery<T>(query: { text: string; values?: (string | boolean)[] }): Promise<Res<T>> {
        return await this.db.query(query);
    }

    async addWord(food: string, good: boolean): Promise<void> {
        const query = {
            text: 'INSERT INTO oishii_table ( name, good ) VALUES ( $1, $2 )',
            values: [food, good],
        };
        await this.runQuery(query);
        console.log(`INSERT: ${food} (${String(good)})`);
    }
}
