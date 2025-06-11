import got from 'got';
import { Config } from '../../config.js';
import messages from '../../messages.js';
import { UserLite } from '../../misskey/api.js';
import { CreatedNote } from '../../misskey/note.js';
import { chooseOneFromArr } from '../../utils/cofa.js';
import { botVersion } from '../../utils/version.js';
import { Color, Game } from './engine.js';
import { ReversiMatch } from './reversi.js';

interface InitMes {
    type: 'init';
    body: {
        game: ReversiMatch;
        config: Config;
    };
}

interface CanceledMes {
    type: 'canceled';
    body: ReversiMatch;
}

interface StartedMes {
    type: 'started';
    body: {
        game: ReversiMatch;
    };
}

interface SetMes {
    type: 'set';
    body: {
        time: number;
        player: boolean;
        operation: 'put';
        pos: number;
        id: string;
    };
}

interface EndedMes {
    type: 'ended';
    body: ReversiMatch;
}

type Mes = InitMes | CanceledMes | StartedMes | SetMes | EndedMes;

class Back {
    private _game!: ReversiMatch;
    private _config!: Config;
    private _engine!: Game;
    private _botColor!: Color;
    private _inviter!: UserLite;
    private _startedNote?: CreatedNote;
    private _maxTurn!: number;
    private _currentTurn = 0;
    private _corners!: number[];
    private _appliedOps: string[] = [];

    private get userName(): string {
        return `@${this._inviter.username} さん`;
    }

    constructor() {
        process.on('message', (msg: Mes) => {
            switch (msg.type) {
                case 'init':
                    this.onInit(msg.body);
                    break;
                case 'started':
                    this.onStarted(msg.body);
                    break;
                case 'ended':
                    this.onEnded(msg.body);
                    break;
                case 'set':
                    this.onSet(msg.body);
                    break;
                case 'canceled':
                    this.log('Canceled:', `${msg.body}`);
                    process.exit();
            }
        });
    }

    log(text?: string, ...arg: string[]): void {
        console.log(`[RVBC] (${this._game.id})`, text, ...arg);
    }

    async onInit(body: InitMes['body']) {
        this._game = body.game;
        this._config = body.config;
        this._inviter = this._game.user1Id === this._config.userId ? this._game.user2 : this._game.user1;
        this.log(`Booted. (PID: ${process.pid})`);
    }

    async onStarted(body: StartedMes['body']) {
        this.log(`Match Started. (userId: ${this._inviter.id})`);

        const text = messages.games.reversi.started(this.userName, `${this._config.host}/reversi/g/${this._game.id}`);
        this._startedNote = await this.post({ text });

        this._game = body.game;
        this.log('game', `${JSON.stringify(this._game)}`);

        this._engine = new Game(this._game.map, {
            canPutEverywhere: this._game.canPutEverywhere,
            isLlotheo: this._game.isLlotheo,
            loopedBoard: this._game.loopedBoard,
        });

        this._maxTurn =
            this._engine.map.filter((p) => p === 'empty').length - this._engine.board.filter((x) => x != null).length;

        this._botColor =
            (this._game.user1Id == this._config.userId && this._game.black == 1) ||
            (this._game.user2Id == this._config.userId && this._game.black == 2);

        this._corners = [];
        this._engine.map.forEach((pix, i) => {
            if (pix == 'null') return;

            const [x, y] = this._engine.posToXy(i);
            const get = (x: number, y: number) => {
                if (x < 0 || y < 0 || x >= this._engine.mapWidth || y >= this._engine.mapHeight) return 'null';
                return this._engine.mapDataGet(this._engine.xyToPos(x, y));
            };

            const isNotSumi =
                // -
                //  +
                //   -
                (get(x - 1, y - 1) == 'empty' && get(x + 1, y + 1) == 'empty') ||
                //  -
                //  +
                //  -
                (get(x, y - 1) == 'empty' && get(x, y + 1) == 'empty') ||
                //   -
                //  +
                // -
                (get(x + 1, y - 1) == 'empty' && get(x - 1, y + 1) == 'empty') ||
                //
                // -+-
                //
                (get(x - 1, y) == 'empty' && get(x + 1, y) == 'empty');
            const isSumi = !isNotSumi;
            if (isSumi) this._corners.push(i);
        });

        if (this._botColor) {
            this.think();
        }
    }

    async onEnded(body: EndedMes['body']) {
        // ストリームから切断
        process.send?.({
            type: 'ended',
        });

        let text: string;

        if (body.surrenderedUserId) {
            text = messages.games.reversi.surrendered(this.userName);
        } else if (body.winnerId) {
            if (body.winnerId === this._config.userId) {
                text = messages.games.reversi.win(this.userName);
            } else {
                text = messages.games.reversi.lose(this.userName);
            }
        } else {
            text = messages.games.reversi.draw(this.userName);
        }

        await this.post({ text, renoteId: this._startedNote?.id });

        this.log(`End. (PID: ${process.pid})`);
        process.exit();
    }

    onSet(body: SetMes['body']) {
        if (body.id == null || !this._appliedOps.includes(body.id)) {
            this._engine.putStone(body.pos);
            this._currentTurn++;

            if (this._engine.turn === this._botColor) {
                this.think();
            }
        }
    }

    think() {
        this.log(`(${this._currentTurn}/${this._maxTurn}) Thinking...`);
        console.time('think');

        const canPutCorner = this._corners.filter((pos) => this._engine.canPut(this._botColor, pos));

        let pos: number;
        if (canPutCorner.length) {
            // 角における場合は置く
            pos = chooseOneFromArr(canPutCorner);
        } else {
            // それ以外はランダムに置く
            const places = this._engine.getPuttablePlaces(this._botColor);
            pos = chooseOneFromArr(places);
        }

        this._engine.putStone(pos);
        this._currentTurn++;

        this.log('Thought:', String(pos));
        console.timeEnd('think');

        setTimeout(() => {
            const id = Math.random().toString(36).slice(2);
            process.send?.({
                type: 'put',
                pos,
                id,
            });
            this._appliedOps.push(id);

            if (this._engine.turn === this._botColor) {
                this.think();
            }
        }, 1000);
    }

    async post({ text, renoteId }: { text: string; renoteId?: string }): Promise<CreatedNote> {
        const data = {
            i: this._config.apiKey,
            text,
            visibility: 'home',
            ...(renoteId ? { renoteId } : {}),
        };
        return got
            .post<{ createdNote: CreatedNote }>(`${this._config.apiUrl}/notes/create`, {
                json: data,
                headers: {
                    'User-Agent': `oishii-bot/${botVersion} (API / https://github.com/kabo2468/oishii-bot)`,
                },
                responseType: 'json',
            })
            .then((res) => res.body.createdNote)
            .catch((err) => {
                console.error(err);
                throw err;
            });
    }
}

new Back();
