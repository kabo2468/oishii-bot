import Reversi, { Color } from 'misskey-reversi';
import { User } from '../../misskey/api';

interface Mes {
    type: string;
    body: Body;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;

interface Game {
    id: string;
    createdAt: string;
    startedAt: string;
    isStarted: boolean;
    isEnded: boolean;
    form1: null;
    form2: null;
    user1Accepted: boolean;
    user2Accepted: boolean;
    user1Id: string;
    user2Id: string;
    user1: User;
    user2: User;
    winnerId: null;
    winner: null;
    surrendered: null;
    black: number;
    bw: string;
    isLlotheo: boolean;
    canPutEverywhere: boolean;
    loopedBoard: boolean;
    logs: string[];
    map: string[];
}

class Back {
    private _game!: Game;
    private _engine!: Reversi;
    private _botColor!: Color;
    private _account!: User;
    private _maxTurn!: number;
    private _currentTurn = 0;

    constructor() {
        process.on('message', (msg: Mes) => {
            switch (msg.type) {
                case 'init':
                    this.onInit(msg.body);
                    break;
                case 'updateForm':
                    // this.onUpdateForm(msg.body);
                    break;
                case 'started':
                    this.onStarted(msg.body);
                    break;
                case 'ended':
                    this.onEnded();
                    break;
                case 'set':
                    this.onSet(msg.body);
                    break;
            }
        });
    }

    log(text?: string, ...arg: string[]): void {
        console.log(`[RVBC] (${this._game.id})`, text, ...arg);
    }

    onInit(body: Body) {
        this._game = body.game;
        this._account = body.account;
    }

    onStarted(body: Body) {
        const inviter = this._game.user1Id === this._account.id ? this._game.user2Id : this._game.user1Id;
        this.log(`Match Started. (userId: ${inviter})`);

        this._game = body.game;

        this._engine = new Reversi(this._game.map, {
            canPutEverywhere: this._game.canPutEverywhere,
            isLlotheo: this._game.isLlotheo,
            loopedBoard: this._game.loopedBoard,
        });

        this._maxTurn = this._engine.map.filter((p) => p === 'empty').length - this._engine.board.filter((x) => x != null).length;

        this._botColor = (this._game.user1Id == this._account.id && this._game.black == 1) || (this._game.user2Id == this._account.id && this._game.black == 2);

        if (this._botColor) {
            this.think();
        }
    }

    onEnded() {
        // ストリームから切断
        process.send?.({
            type: 'ended',
        });

        process.exit();
    }

    onSet(body: Body) {
        this._engine.put(body.color, body.pos);
        this._currentTurn++;

        if (body.next === this._botColor) {
            this.think();
        }
    }

    think() {
        this.log(`(${this._currentTurn}/${this._maxTurn}) Thinking...`);
        console.time('think');

        const places = this._engine.canPutSomewhere(this._botColor);
        const pos = places[Math.floor(Math.random() * places.length)];

        this._engine.put(this._botColor, pos);

        this.log('Thought:', String(pos));
        console.timeEnd('think');

        setTimeout(() => {
            process.send?.({
                type: 'put',
                pos,
            });
        }, 1000);
    }
}

new Back();
