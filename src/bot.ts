import iconv from 'iconv-lite';
import ms from 'ms';
import { Pool } from 'pg';
import ReconnectingWebSocket from 'reconnecting-websocket';
import wsConst from 'ws';
import { Config } from './config';
import messages from './messages';
import API, { User } from './misskey/api';
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
    public account!: User;
    public encodeMode = false;

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

        this.getAccount();

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
            this.log('Followings:', newFollow);
        }, ms('1h'));
    }

    private async getAccount() {
        this.account = await this.api.call('i').then((res) => res.json());
    }

    log(text?: string, ...arg: unknown[]): void {
        console.log('[MAIN]', text, ...arg);
    }

    connectChannel(channel: string, id: string, params?: Record<string, unknown>): void {
        this.ws.send(
            JSON.stringify({
                type: 'connect',
                body: {
                    channel,
                    id,
                    params,
                },
            })
        );
    }

    disconnectChannel(id: string): void {
        this.ws.send(
            JSON.stringify({
                type: 'disconnect',
                body: {
                    id,
                },
            })
        );
    }

    async runQuery(query: { text: string; values?: (string | number | boolean)[] }): Promise<Res> {
        return this.db.query(query).catch((err) => {
            console.error(err);
            process.exit(1);
        });
    }

    async existsFood(text: string): Promise<boolean> {
        const query = {
            text: 'SELECT EXISTS (SELECT * FROM oishii_table WHERE LOWER(name) = LOWER($1))',
            values: [text],
        };
        return await this.runQuery(query).then((res) => {
            return !!res.rows[0].exists;
        });
    }

    async addFood(food: string, good: boolean, learned = false): Promise<void> {
        const query = {
            text: 'INSERT INTO oishii_table ( name, good, learned ) VALUES ( $1, $2, $3 )',
            values: [food, good, learned],
        };
        await this.runQuery(query);
    }

    async removeFood(food: string, many: boolean): Promise<Res> {
        const textOne = 'in (SELECT name FROM oishii_table WHERE LOWER(name) = LOWER($1) LIMIT 1)';
        const textMany = '~* $1';
        const query = {
            text: `DELETE FROM oishii_table WHERE name ${many ? textMany : textOne} RETURNING name`,
            values: [food],
        };
        return await this.runQuery(query);
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
        if (this.encodeMode) {
            res.rows.forEach((row) => {
                const name = row.name;
                if (!name) return;
                row.name = iconv.decode(Buffer.from(name), 'Shift_JIS');
            });
        }
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
        this.api.postText({ text });

        this.rateLimit++;
    }
}
