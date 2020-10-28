import ms from 'ms';
import { Pool } from 'pg';
import ReconnectingWebSocket from 'reconnecting-websocket';
import wsConst from 'ws';
import { Config } from './config';
import messages from './messages';
import API from './misskey/api';
import NGWord from './ng-words';

type Rows = {
    name: string;
    good: boolean;
    learned: boolean;
    exists: boolean;
    count: string;
};

type Res = {
    rows: Partial<Rows>[];
    rowCount: number;
};

export class Bot {
    public config: Config;
    public ngWords: NGWord;
    public ws: ReconnectingWebSocket;
    private db: Pool;
    private rateLimit: number;

    constructor(config: Config, ngWords: NGWord) {
        this.config = config;
        this.ngWords = ngWords;
        this.rateLimit = 0;

        const psql = new Pool({
            ssl: config.dbSSL,
            connectionString: config.databaseUrl,
        });
        this.db = psql;

        this.ws = new ReconnectingWebSocket(`${config.wsUrl}/streaming?i=${config.apiKey}`, [], {
            WebSocket: wsConst,
        });

        this.log('Followings:', config.followings);

        setInterval(() => {
            this.rateLimit = 0;
        }, ms(`${config.post.rateLimitSec}s`));

        setInterval(() => {
            this.sayFood();
        }, ms(`${config.post.autoPostInterval}m`));
    }

    log(text?: string, ...arg: unknown[]): void {
        console.log('[Bot]', text, ...arg);
    }

    async runQuery(query: { text: string; values?: (string | boolean)[] }): Promise<Res> {
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
            this.runQuery(query).then((res) => {
                resolve(res.rows[0].exists);
            });
        });
    }

    async addFood(food: string, good: boolean, learned = false): Promise<void> {
        const query = {
            text: 'INSERT INTO oishii_table ( name, good, learned ) VALUES ( $1, $2, $3 )',
            values: [food, good, learned],
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
        if (this.rateLimit > this.config.post.rateLimitPost) return;

        const rnd = Math.random() < 0.2 ? 'WHERE learned=true' : '';
        const query = {
            text: `SELECT name, good FROM oishii_table ${rnd} ORDER BY RANDOM() LIMIT 1`,
        };
        const res = await this.runQuery(query);

        const food = res.rows[0].name;
        const good = res.rows[0].good;
        if (!food) return;
        if (!good) return;
        this.log(`sayFood: ${food} (${good})`);

        const text = messages.food.say(food, good);
        API.postText(text);

        this.rateLimit++;
    }
}
