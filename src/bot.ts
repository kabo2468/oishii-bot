import iconv from 'iconv-lite';
import { type Kysely, sql } from 'kysely';
import ms from 'ms';
import { WebSocket } from 'partysocket';
import ws from 'ws';
import type { Config } from './config.js';
import messages from './messages.js';
import API, { type UserLite } from './misskey/api.js';
import type NGWord from './ng-words.js';
import type { Database, FoodRow as FoodRecord } from './types/database.js';

type FoodRow = Pick<FoodRecord, 'name' | 'good'>;
type FoodNameRow = Pick<FoodRecord, 'name'>;

export class Bot {
  public config: Config;
  public ngWords: NGWord;
  public ws: WebSocket;
  private readonly db: Kysely<Database>;
  private rateLimit = 0;
  public api: API;
  public account!: UserLite;
  public encodeMode = false;

  constructor(config: Config, ngWords: NGWord, db: Kysely<Database>) {
    this.config = config;
    this.ngWords = ngWords;
    this.db = db;

    this.ws = new WebSocket(
      `${config.wsUrl}/streaming?i=${config.apiKey}`,
      [],
      {
        WebSocket: ws,
      },
    );

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
    this.account = await this.api.call<UserLite>('i').then((res) => res.body);
  }

  log(text?: string, ...arg: unknown[]): void {
    console.log('[MAIN]', text, ...arg);
  }

  connectChannel(
    channel: string,
    id: string,
    params?: Record<string, unknown>,
  ): void {
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

  async existsFood(text: string): Promise<boolean> {
    const { exists } = await this.db
      .selectNoFrom(({ exists, selectFrom, lit }) =>
        exists(
          selectFrom('food')
            .select(lit(1).as('_'))
            .where(sql<string>`lower("name")`, '=', text.toLowerCase()),
        ).as('exists'),
      )
      .executeTakeFirstOrThrow();
    return !!exists;
  }

  async addFood({
    food,
    good,
    isUserTaught,
    userId,
    noteId,
  }: {
    food: string;
    good: boolean;
    isUserTaught: boolean;
    userId: string;
    noteId: string;
  }): Promise<void> {
    await this.db
      .insertInto('food')
      .values({
        name: food,
        good,
        is_user_taught: isUserTaught,
        user_id: userId,
        note_id: noteId,
      })
      .execute();
  }

  async removeFood(food: string, many: boolean): Promise<FoodNameRow[]> {
    const query = this.db.deleteFrom('food').returning('name');
    const rows = many
      ? await query.where('name', 'ilike', food).execute()
      : await query
          .where(sql`lower("name")`, '=', food.toLowerCase())
          .execute();
    return rows;
  }

  async removeFoodFromUserId(
    userId: string,
    isUserTaughtOnly: boolean,
  ): Promise<FoodNameRow[]> {
    let query = this.db
      .deleteFrom('food')
      .returning('name')
      .where('user_id', '=', userId);
    if (isUserTaughtOnly) {
      query = query.where('is_user_taught', '=', true);
    }
    return await query.execute();
  }

  async getFood(name: string): Promise<FoodRecord | undefined> {
    return await this.db
      .selectFrom('food')
      .selectAll()
      .where(sql`lower("name")`, '=', name.toLowerCase())
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst();
  }

  async getRandomFood({
    good,
    isUserTaught,
  }: {
    good?: boolean;
    isUserTaught?: boolean;
  } = {}): Promise<FoodRow | undefined> {
    const filters = [];
    if (good !== undefined) filters.push(sql`good = ${good}`);
    if (isUserTaught !== undefined)
      filters.push(sql`is_user_taught = ${isUserTaught}`);

    const offsetWhere = filters.length
      ? sql`WHERE ${sql.join(filters, sql` AND `)}`
      : sql``;

    let query = this.db
      .with('records', (q) =>
        q
          .selectFrom('food')
          .distinctOn('name')
          .select(['name', 'good', 'is_user_taught'])
          .orderBy('name')
          .orderBy('created_at', 'desc'),
      )
      .selectFrom('records')
      .select(['name', 'good'])
      .limit(1)
      .offset(
        sql`floor(random() * (SELECT count(*) FROM records ${offsetWhere}))`,
      );

    if (good !== undefined) {
      query = query.where('good', '=', good);
    }
    if (isUserTaught !== undefined) {
      query = query.where('is_user_taught', '=', isUserTaught);
    }

    const row = await query.executeTakeFirst();
    if (!row) return undefined;

    const name = this.encodeMode
      ? iconv.decode(Buffer.from(row.name), 'Shift_JIS')
      : row.name;

    return {
      name,
      good: row.good,
    };
  }

  async sayFood(): Promise<void> {
    if (this.rateLimit > this.config.post.rateLimitPost) return;

    const isUserTaught = Math.random() < 0.2;
    const row = await this.getRandomFood({ isUserTaught });
    if (!row) {
      this.log('sayFood: not found');
      return;
    }

    const { name: food, good } = row;
    this.log(`sayFood: ${food} (${good})`);

    const text = messages.food.say(food, good);
    this.api.postText({ text });

    this.rateLimit++;
  }

  async getUserFoods(userId: string, page?: number): Promise<FoodRow[]> {
    const RECORD_PER_PAGE = 10;
    const offset = Math.max(0, page ?? 0) * RECORD_PER_PAGE;
    return await this.db
      .selectFrom('food')
      .select(['name', 'good'])
      .where('user_id', '=', userId)
      .where('is_user_taught', '=', true)
      .orderBy('created_at', 'desc')
      .orderBy('name')
      .limit(RECORD_PER_PAGE)
      .offset(offset)
      .execute();
  }

  async getUserFoodCount(userId: string): Promise<number> {
    const row = await this.db
      .selectFrom('food')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('user_id', '=', userId)
      .where('is_user_taught', '=', true)
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  }

  async getLearnedCounts(): Promise<
    { isUserTaught: boolean; count: number }[]
  > {
    const rows = await this.db
      .selectFrom('food')
      .select(['is_user_taught', (eb) => eb.fn.countAll().as('count')])
      .groupBy('is_user_taught')
      .execute();

    return rows.map((row) => ({
      isUserTaught: row.is_user_taught,
      count: Number(row.count ?? 0),
    }));
  }

  async setRandomSeed(seed: number): Promise<void> {
    if (seed < -1 || seed > 1) {
      throw new RangeError('seed must be between -1.0 and 1.0');
    }
    await sql`SELECT setseed(${seed})`.execute(this.db);
  }
}
