import Reversi, { Color, Options } from 'misskey-reversi';
import { User } from '../../misskey/api';

interface Mes {
    type: string;
    body: Body;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;

class Back {
    private _game!: Body;
    private _map!: string[];
    private _options!: Options;
    private _engine!: Reversi;
    private _botColor!: Color;
    private _account!: User;

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
                    // this.onEnded(msg.body);
                    break;
                case 'set':
                    // this.onSet(msg.body);
                    break;
            }
        });
    }

    onInit(body: Body) {
        this._map = body.map;
        this._options = body.options;
        // this._game = body.game;
    }

    onStarted(msg: Body) {
        this._game = msg;

        this._engine = new Reversi(this._map, this._options);

        this._botColor = (this._game.user1Id == this._account.id && this._game.black == 1) || (this._game.user2Id == this._account.id && this._game.black == 2);
    }
}

new Back();
