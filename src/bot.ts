import iconv from 'iconv-lite';
import ms from 'ms';
import { WebSocket } from 'partysocket';
import pg from 'pg';
import ws from 'ws';
import { Config } from './config.js';
import messages from './messages.js';
import API, { User } from './misskey/api.js';
import NGWord from './ng-words.js';

export interface Row {
    name: string;
    good: boolean;
    learned: boolean;
    userId: string;
    noteId: string;
    created: Date;
    updated: Date;
    exists: boolean;
    count: string;
}

type Keys = keyof Row;
type Res<T extends Keys = Keys> = Pick<Row, T>;

export class Bot {
    public config: Config;
    public ngWords: NGWord;
    public ws: WebSocket;
    private db: pg.Pool;
    private rateLimit = 0;
    public api: API;
    public account!: User;
    public encodeMode = false;

    constructor(config: Config, ngWords: NGWord) {
        this.config = config;
        this.ngWords = ngWords;

        const psql = new pg.Pool({
            ssl: config.dbSSL,
            connectionString: config.databaseUrl,
        });
        this.db = psql;

        this.ws = new WebSocket(`${config.wsUrl}/streaming?i=${config.apiKey}`, [], {
            WebSocket: ws,
        });

        this.log('Followings:', config.followings);

        this.api = new API(this);

        this.getAccount();

        setInterval(
            () => {
                this.rateLimit = 0;
            },
            ms(`${config.post.rateLimitSec}s`),
        );

        setInterval(
            () => {
                this.sayFood();
            },
            ms(`${config.post.autoPostInterval}m`),
        );

        setInterval(async () => {
            this.ws.reconnect();
            const newFollow: string = await this.api
                .call<{ followingCount: string }>('i')
                .then((res) => res.body.followingCount);
            this.config.followings = Number(newFollow);
            this.log('Followings:', newFollow);
        }, ms('1h'));
    }

    private async getAccount() {
        this.account = await this.api.call<User>('i').then((res) => res.body);
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
            }),
        );
    }

    disconnectChannel(id: string): void {
        this.ws.send(
            JSON.stringify({
                type: 'disconnect',
                body: {
                    id,
                },
            }),
        );
    }

    async runQuery<T extends Keys = Keys>(query: { text: string; values?: (Row[Keys] | number)[] }): Promise<
        pg.QueryResult<Res<T>>
    > {
        return this.db.query<Res<T>>(query).catch((err) => {
            console.error(err);
            process.exit(1);
        });
    }

    async existsFood(text: string): Promise<boolean> {
        const query = {
            text: 'SELECT EXISTS (SELECT * FROM oishii_table WHERE LOWER("name") = LOWER($1))',
            values: [text],
        };
        return await this.runQuery<'exists'>(query).then((res) => {
            return res.rows[0].exists;
        });
    }

    async addFood(food: string, good: boolean, learned = false, userId: string, noteId: string): Promise<void> {
        const query = {
            text: 'INSERT INTO oishii_table ( "name", "good", "learned", "userId", "noteId" ) VALUES ( $1, $2, $3, $4, $5 )',
            values: [food, good, learned, userId, noteId],
        };
        await this.runQuery(query);
    }

    async removeFood(food: string, many: boolean): Promise<pg.QueryResult<Res<'name'>>> {
        const textOne = 'in (SELECT "name" FROM oishii_table WHERE LOWER("name") = LOWER($1) LIMIT 1)';
        const textMany = '~* $1';
        const query = {
            text: `DELETE FROM oishii_table WHERE "name" ${many ? textMany : textOne} RETURNING "name"`,
            values: [food],
        };
        return this.runQuery<'name'>(query);
    }

    async removeFoodFromUserId(userId: string, learnedOnly: boolean): Promise<pg.QueryResult<Res<'name'>>> {
        const query = {
            text: `DELETE FROM oishii_table WHERE "userId" = $1 ${learnedOnly ? 'AND "learned" = true' : ''} RETURNING "name"`,
            values: [userId],
        };
        return this.runQuery<'name'>(query);
    }

    async updateFood(
        food: string,
        good: boolean,
        learned = true,
        userId: string,
        noteId: string,
        updateDate: Date,
    ): Promise<void> {
        const query = {
            text: 'UPDATE oishii_table SET "good"=$1, "learned"=$3, "userId"=$4, "noteId"=$5, "updated"=$6 WHERE LOWER("name") = LOWER($2)',
            values: [good, food, learned, userId, noteId, updateDate],
        };
        await this.runQuery(query);
    }

    async getFood(name: string): Promise<pg.QueryResult<Res>> {
        const query = {
            text: `SELECT * FROM oishii_table WHERE LOWER("name") = LOWER($1)`,
            values: [name],
        };
        return this.runQuery(query);
    }

    async getRandomFood({
        good,
        learned,
    }: { good?: boolean; learned?: boolean } = {}): Promise<pg.QueryResult<Res<'name' | 'good'>>> {
        const options = [];
        if (good !== undefined) options.push(`"good"=${good}`);
        if (learned !== undefined) options.push(`"learned"=${learned}`);

        const option = options.length ? `WHERE ${options.join(' AND ')}` : '';
        const query = {
            text: `SELECT "name", "good" FROM oishii_table ${option} ORDER BY RANDOM() LIMIT 1`,
        };
        const res = await this.runQuery<'name' | 'good'>(query);
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
        const res = await this.getRandomFood({ learned });

        const food = res.rows[0].name;
        const good = res.rows[0].good;
        this.log(`sayFood: ${food} (${good})`);

        const text = messages.food.say(food, good);
        this.api.postText({ text });

        this.rateLimit++;
    }

    async getUserFoods(userId: string, page?: number): Promise<pg.QueryResult<Res>> {
        const offset = page ? `OFFSET ${page * 10}` : 'OFFSET 0';
        const query = {
            text: `SELECT "name", "good" FROM oishii_table WHERE "userId" = $1 AND learned = TRUE ORDER BY updated DESC LIMIT 10 ${offset}`,
            values: [userId],
        };
        return await this.runQuery(query);
    }
}
