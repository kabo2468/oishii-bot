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
    private rateLimit = 0;
    public api: API;

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

        this.log('Followings:', config.followings);

        this.api = new API(this);

        setInterval(() => {
            this.rateLimit = 0;
        }, ms(`${config.post.rateLimitSec}s`));

        setInterval(() => {
            this.sayFood();
        }, ms(`${config.post.autoPostInterval}m`));

        setInterval(async () => {
            this.ws.reconnect();
            const newFollow: string = await this.api
                .call('i')
                .then((res) => res.json())
                .then((json) => json.followingCount);
            this.config.followings = Number(newFollow);
        }, ms('1h'));
    }

    log(text?: string, ...arg: unknown[]): void {
        console.log('[MAIN]', text, ...arg);
    }

    connectChannel(channel: string, id: string, params?: Record<string, unknown>): void {
        const json = JSON.stringify({
            type: 'connect',
            body: {
                channel,
                id,
                params,
            },
        });
        console.log(json);
        this.ws.send(json);
    }

    async runQuery(query: { text: string; values?: (string | number | boolean)[] }): Promise<Res> {
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

    async getFood({ good, learned }: { good?: boolean; learned?: boolean } = {}): Promise<Res> {
        const options = [];
        if (good !== undefined) options.push(`good=${good}`);
        if (learned !== undefined) options.push(`learned=${learned}`);

        const option = options.length ? `WHERE ${options.join(' AND ')}` : '';
        const query = {
            text: `SELECT name, good FROM oishii_table ${option} ORDER BY RANDOM() LIMIT 1`,
        };
        const res = await this.runQuery(query);
        return res;
    }

    async sayFood(): Promise<void> {
        if (this.rateLimit > this.config.post.rateLimitPost) return;

        const learned = Math.random() < 0.2;
        const res = await this.getFood({ learned });

        const food = res.rows[0].name;
        const good = res.rows[0].good;
        if (!food || good === undefined) return;
        this.log(`sayFood: ${food} (${good})`);

        const text = messages.food.say(food, good);
        this.api.postText(text);

        this.rateLimit++;
    }
}
