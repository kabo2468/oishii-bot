import Reversi, { Color } from 'misskey-reversi';
import fetch from 'node-fetch';
import { Config } from '../../config';
import messages from '../../messages';
import { User } from '../../misskey/api';
import { CreatedNote } from '../../misskey/note';
import { chooseOneFromArr } from '../../utils/cofa';

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
    form1: Form[];
    form2: Form[];
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
    private _game!: Game;
    private _form!: Form[];
    private _config!: Config;
    private _engine!: Reversi;
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

    private getForm(id: string): Form {
        const form = this._form.find((i) => i.id === id);
        if (!form) throw new Error('Not Found.');
        return form;
    }

    constructor() {
        process.on('message', (msg: Mes) => {
            switch (msg.type) {
                case 'init':
                    this.onInit(msg.body);
                    break;
                case 'updateForm':
                    this.onUpdateForm(msg.body);
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
            }
        });
    }

    log(text?: string, ...arg: string[]): void {
        console.log(`[RVBC] (${this._game.id})`, text, ...arg);
    }

    async onInit(body: Body) {
        this._game = body.game;
        this._form = body.form;
        this._config = body.config;
        this._inviter = this._game.user1Id === this._config.userId ? this._game.user2 : this._game.user1;
        this.log(`Booted. (PID: ${process.pid})`);
    }

    onUpdateForm(body: Body) {
        const item = this.getForm(body.id);
        item.value = body.value;
    }

    async onStarted(body: Body) {
        this._form = body.game.form2;

        this.log(`Match Started. (userId: ${this._inviter.id})`);

        if (this.getForm('post').value) {
            const text = messages.games.reversi.started(this.userName, `${this._config.host}/games/reversi/${this._game.id}`);
            this._startedNote = await this.post({ text });
        }

        this._game = body.game;

        this._engine = new Reversi(this._game.map, {
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

    async onEnded(body: Body) {
        // ストリームから切断
        process.send?.({
            type: 'ended',
        });

        let text: string;

        if (body.game.surrendered) {
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

        if (this.getForm('post').value) {
            await this.post({ text, renoteId: this._startedNote?.id });
        }

        this.log(`End. (PID: ${process.pid})`);
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

        const canPutCorner = this._map.corner.filter((value) => this._engine.canPut(this._botColor, value));

        let pos: number;
        if (canPutCorner.length) {
            // 角における場合は置く
            pos = chooseOneFromArr(canPutCorner);
        } else {
            // それ以外はランダムに置く
            const places = this._engine.canPutSomewhere(this._botColor);
            pos = chooseOneFromArr(places);
        }

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

    async post({ text, renoteId }: { text: string; renoteId?: string }): Promise<CreatedNote> {
        const data = {
            i: this._config.apiKey,
            text,
            visibility: 'public',
            ...(renoteId ? { renoteId } : {}),
        };
        return await fetch(`${this._config.apiUrl}/notes/create`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
        })
            .then((res) => res.json())
            .then((json: { createdNote: CreatedNote }) => json.createdNote)
            .catch((err) => {
                throw new Error(err);
            });
    }
}

new Back();
