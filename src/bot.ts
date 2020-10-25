import { Pool } from 'pg';
import ReconnectingWebSocket from 'reconnecting-websocket';
import wsConst from 'ws';
import { Config } from './config';
import messages from './messages';
import API from './misskey/api';
import NGWord from './ng-words';

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
        this.db = psql;

        this.ws = new ReconnectingWebSocket(`${config.wsUrl}/streaming?i=${config.apiKey}`, [], {
            WebSocket: wsConst,
        });
    }

    log(text?: string, ...arg: unknown[]): void {
        console.log('[Bot]:', text, ...arg);
    }

    async runQuery<T>(query: { text: string; values?: (string | boolean)[] }): Promise<Res<T>> {
        return this.db.query(query).catch((err) => {
            console.error(err);
            process.exit(1);
        });
    }

    async existsFood(text: string): Promise<boolean> {
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

    async addFood(food: string, good: boolean): Promise<void> {
        const query = {
            text: 'INSERT INTO oishii_table ( name, good ) VALUES ( $1, $2 )',
            values: [food, good],
        };
        await this.runQuery(query);
    }

    async learnFood(food: string, good: boolean): Promise<void> {
        const query = {
            text: 'UPDATE oishii_table SET good=$1, learned=true WHERE LOWER(name) = LOWER($2)',
            values: [good, food],
        };
        await this.runQuery(query);
    }

    async sayFood(): Promise<void> {
        const rnd = Math.random() < 0.2 ? 'WHERE learned=true' : '';
        const query = {
            text: `SELECT (name, good) FROM oishii_table ${rnd}ORDER BY RANDOM() LIMIT 1`,
        };
        const res = await this.runQuery<string>(query);
        const row = res.rows[0].row;

        const match = row.match(/\((.+),([tf])\)/);
        if (!match) return;

        const food = match[1].replace(/"(.+)"/, '$1');
        const good = match[2] === 't' ? true : false;
        this.log(`sayFood: ${food} (${good})`);

        const text = messages.food.say(food, good);
        API.postText(text);
    }
}
