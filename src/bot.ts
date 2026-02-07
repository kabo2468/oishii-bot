import iconv from 'iconv-lite';
import { type Kysely, sql } from 'kysely';
import ms from 'ms';
import { WebSocket } from 'partysocket';
import ws from 'ws';
import type { Config } from './config.js';
import messages from './messages.js';
import API, { type UserLite } from './misskey/api.js';
import type NGWord from './ng-words.js';
import type { Database, OishiiRow } from './types/database.js';

type FoodRow = Pick<OishiiRow, 'name' | 'good'>;
type FoodNameRow = Pick<OishiiRow, 'name'>;

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
    const row = await this.db
      .selectFrom('oishii_table')
      .select('name')
      .where(sql`lower("name")`, '=', text.toLowerCase())
      .limit(1)
      .executeTakeFirst();
    return !!row;
  }

  async addFood(
    food: string,
    good: boolean,
    learned = false,
    userId: string,
    noteId: string,
  ): Promise<void> {
    await this.db
      .insertInto('oishii_table')
      .values({
        name: food,
        good,
        learned,
        userId,
        noteId,
      })
      .execute();
  }

  async removeFood(food: string, many: boolean): Promise<FoodNameRow[]> {
    const query = this.db.deleteFrom('oishii_table');
    const rows = many
      ? await query.where('name', 'ilike', food).returning('name').execute()
      : await query
          .where(sql`lower("name")`, '=', food.toLowerCase())
          .returning('name')
          .execute();

    return rows;
  }

  async removeFoodFromUserId(
    userId: string,
    learnedOnly: boolean,
  ): Promise<FoodNameRow[]> {
    let query = this.db.deleteFrom('oishii_table').where('userId', '=', userId);
    if (learnedOnly) {
      query = query.where('learned', '=', true);
    }
    return await query.returning('name').execute();
  }

  async updateFood(
    food: string,
    good: boolean,
    learned = true,
    userId: string,
    noteId: string,
    updateDate: Date,
  ): Promise<void> {
    await this.db
      .updateTable('oishii_table')
      .set({
        good,
        learned,
        userId,
        noteId,
        updated: updateDate,
      })
      .where(sql`lower("name")`, '=', food.toLowerCase())
      .execute();
  }

  async getFood(name: string): Promise<OishiiRow | undefined> {
    return await this.db
      .selectFrom('oishii_table')
      .selectAll()
      .where(sql`lower("name")`, '=', name.toLowerCase())
      .executeTakeFirst();
  }

  async getRandomFood({
    good,
    learned,
  }: {
    good?: boolean;
    learned?: boolean;
  } = {}): Promise<FoodRow | undefined> {
    let query = this.db.selectFrom('oishii_table').select(['name', 'good']);
    if (good !== undefined) query = query.where('good', '=', good);
    if (learned !== undefined) query = query.where('learned', '=', learned);

    const row = await query.orderBy(sql`random()`).limit(1).executeTakeFirst();
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

    const learned = Math.random() < 0.2;
    const row = await this.getRandomFood({ learned });
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
    const offset = Math.max(0, page ?? 0) * 10;
    return await this.db
      .selectFrom('oishii_table')
      .select(['name', 'good'])
      .where('userId', '=', userId)
      .where('learned', '=', true)
      .orderBy('updated', 'desc')
      .limit(10)
      .offset(offset)
      .execute();
  }

  async getUserFoodCount(userId: string): Promise<number> {
    const row = await this.db
      .selectFrom('oishii_table')
      .select((eb) => eb.fn.count('name').as('count'))
      .where('userId', '=', userId)
      .where('learned', '=', true)
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  }

  async getLearnedCounts(): Promise<
    Array<{ learned: boolean; count: number }>
  > {
    const rows = await this.db
      .selectFrom('oishii_table')
      .select(['learned', (eb) => eb.fn.count('learned').as('count')])
      .groupBy('learned')
      .execute();

    return rows.map((row) => ({
      learned: row.learned,
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
