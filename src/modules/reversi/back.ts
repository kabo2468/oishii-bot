import got from 'got';
import { Config } from '../../config.js';
import messages from '../../messages.js';
import { User } from '../../misskey/api.js';
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

interface Form {
    id: string;
    type: string;
    label: string;
    value: number | boolean;
    items?: { label: string; value: number }[];
}

interface Map {
    width: number;
    height: number;
    corner: number[];
}

class Back {
    private _game!: ReversiMatch;
    private _config!: Config;
    private _engine!: Game;
    private _botColor!: Color;
    private _inviter!: User;
    private _startedNote?: CreatedNote;
    private _maxTurn!: number;
    private _currentTurn = 0;
    private _map!: Map;

    private get userName(): string {
        const name = this._inviter.name || this._inviter.username;
        return `?[${name}](${this._config.host}/@${this._inviter.username})さん`;
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
        this.log('game', `${JSON.stringify(this._game)}`);
    }

    async onStarted(body: StartedMes['body']) {
        this.log(`Match Started. (userId: ${this._inviter.id})`);

        const text = messages.games.reversi.started(this.userName, `${this._config.host}/games/reversi/${this._game.id}`);
        this._startedNote = await this.post({ text });

        this._game = body.game;

        this.log('map', `${JSON.stringify(this._game)}`);
        this._engine = new Game(this._game.map, {
            canPutEverywhere: this._game.canPutEverywhere,
            isLlotheo: this._game.isLlotheo,
            loopedBoard: this._game.loopedBoard,
        });

        this._maxTurn = this._engine.map.filter((p) => p === 'empty').length - this._engine.board.filter((x) => x != null).length;

        this._botColor = (this._game.user1Id == this._config.userId && this._game.black == 1) || (this._game.user2Id == this._config.userId && this._game.black == 2);

        const width = this._engine.mapWidth;
        const height = this._engine.mapHeight;
        this._map = {
            width,
            height,
            corner: [0, width - 1, height * (width - 1), height * width - 1],
        };

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
        this._engine.putStone(body.pos);
        this._currentTurn++;

        if (this._engine.turn === this._botColor) {
            this.think();
        }
    }

    think() {
        this.log(`(${this._currentTurn}/${this._maxTurn}) Thinking...`);
        console.time('think');

        const canPutCorner = this._map.corner.filter((value) => this._engine.canPut(this._botColor, value));

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

        this.log('Thought:', String(pos));
        console.timeEnd('think');

        setTimeout(() => {
            process.send?.({
                type: 'put',
                pos,
            });
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
