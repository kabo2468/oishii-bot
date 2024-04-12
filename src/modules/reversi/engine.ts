// https://github.com/syuilo/ai/blob/fd50dc790f863cef3bbbb5ce825824c50d1fda77/src/modules/reversi/engine.ts
// + modified

/**
 * true ... 黒
 * false ... 白
 */
export type Color = boolean;
const BLACK = true;
const WHITE = false;

export type MapCell = 'null' | 'empty';

export type Options = {
    isLlotheo: boolean;
    canPutEverywhere: boolean;
    loopedBoard: boolean;
};

export type Undo = {
    color: Color;
    pos: number;

    /**
     * 反転した石の位置の配列
     */
    effects: number[];

    turn: Color | null;
};

export class Game {
    public map: MapCell[];
    public mapWidth: number;
    public mapHeight: number;
    public board: (Color | null | undefined)[];
    public turn: Color | null = BLACK;
    public opts: Options;

    public prevPos = -1;
    public prevColor: Color | null = null;

    private logs: Undo[] = [];

    constructor(map: string[], opts: Options) {
        //#region binds
        this.putStone = this.putStone.bind(this);
        //#endregion

        //#region Options
        this.opts = opts;
        if (this.opts.isLlotheo == null) this.opts.isLlotheo = false;
        if (this.opts.canPutEverywhere == null) this.opts.canPutEverywhere = false;
        if (this.opts.loopedBoard == null) this.opts.loopedBoard = false;
        //#endregion

        //#region Parse map data
        this.mapWidth = map[0].length;
        this.mapHeight = map.length;
        const mapData = map.join('');

        this.board = mapData.split('').map((d) => {
            if (d === '-') return null;
            if (d === 'b') return BLACK;
            if (d === 'w') return WHITE;
            return undefined;
        });

        this.map = mapData.split('').map((d) => (d === '-' || d === 'b' || d === 'w' ? 'empty' : 'null'));
        //#endregion

        // ゲームが始まった時点で片方の色の石しかないか、始まった時点で勝敗が決定するようなマップの場合がある
        if (!this.canPutSomewhere(BLACK)) this.turn = this.canPutSomewhere(WHITE) ? WHITE : null;
    }

    public get blackCount() {
        return this.board.filter((x) => x === BLACK).length;
    }

    public get whiteCount() {
        return this.board.filter((x) => x === WHITE).length;
    }

    public posToXy(pos: number): number[] {
        const x = pos % this.mapWidth;
        const y = Math.floor(pos / this.mapWidth);
        return [x, y];
    }

    public xyToPos(x: number, y: number): number {
        return x + y * this.mapWidth;
    }

    public putStone(pos: number) {
        const color = this.turn;
        if (color == null) return;

        this.prevPos = pos;
        this.prevColor = color;

        this.board[pos] = color;

        // 反転させられる石を取得
        const effects = this.effects(color, pos);

        // 反転させる
        for (const pos of effects) {
            this.board[pos] = color;
        }

        const turn = this.turn;

        this.logs.push({
            color,
            pos,
            effects,
            turn,
        });

        this.calcTurn();
    }

    private calcTurn() {
        // ターン計算
        if (this.canPutSomewhere(!this.prevColor)) {
            this.turn = !this.prevColor;
        } else if (this.canPutSomewhere(this.prevColor!)) {
            this.turn = this.prevColor;
        } else {
            this.turn = null;
        }
    }

    public undo() {
        const undo = this.logs.pop()!;
        this.prevColor = undo.color;
        this.prevPos = undo.pos;
        this.board[undo.pos] = null;
        for (const pos of undo.effects) {
            const color = this.board[pos];
            this.board[pos] = !color;
        }
        this.turn = undo.turn;
    }

    public mapDataGet(pos: number): MapCell {
        const [x, y] = this.posToXy(pos);
        return x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight ? 'null' : this.map[pos];
    }

    public getPuttablePlaces(color: Color): number[] {
        return Array.from(this.board.keys()).filter((i) => this.canPut(color, i));
    }

    public canPutSomewhere(color: Color): boolean {
        return this.getPuttablePlaces(color).length > 0;
    }

    public canPut(color: Color, pos: number): boolean {
        // 既に石が置いてある場所には打てない
        if (this.board[pos] !== null) return false;

        // 挟んでなくても置けるモード
        if (this.opts.canPutEverywhere) return this.mapDataGet(pos) === 'empty';

        // 相手の石を1つでも反転させられるか
        return this.effects(color, pos).length !== 0;
    }

    /**
     * 指定のマスに石を置いた時の、反転させられる石を取得します
     * @param color 自分の色
     * @param initPos 位置
     */
    public effects(color: Color, initPos: number): number[] {
        const enemyColor = !color;

        const diffVectors: [number, number][] = [
            [0, -1], // 上
            [+1, -1], // 右上
            [+1, 0], // 右
            [+1, +1], // 右下
            [0, +1], // 下
            [-1, +1], // 左下
            [-1, 0], // 左
            [-1, -1], // 左上
        ];

        const effectsInLine = ([dx, dy]: [number, number]): number[] => {
            const nextPos = (x: number, y: number): [number, number] => [x + dx, y + dy];

            const found: number[] = []; // 挟めるかもしれない相手の石を入れておく配列
            let [x, y] = this.posToXy(initPos);
            // eslint-disable-next-line no-constant-condition
            while (true) {
                [x, y] = nextPos(x, y);

                // 座標が指し示す位置がボード外に出たとき
                if (this.opts.loopedBoard && this.xyToPos((x = ((x % this.mapWidth) + this.mapWidth) % this.mapWidth), (y = ((y % this.mapHeight) + this.mapHeight) % this.mapHeight)) === initPos) {
                    // 盤面の境界でループし、自分が石を置く位置に戻ってきたとき、挟めるようにしている (ref: Test4のマップ)
                    return found;
                } else if (x === -1 || y === -1 || x === this.mapWidth || y === this.mapHeight) return []; // 挟めないことが確定 (盤面外に到達)

                const pos = this.xyToPos(x, y);
                if (this.mapDataGet(pos) === 'null') return []; // 挟めないことが確定 (配置不可能なマスに到達)
                const stone = this.board[pos];
                if (stone === null) return []; // 挟めないことが確定 (石が置かれていないマスに到達)
                if (stone === enemyColor) found.push(pos); // 挟めるかもしれない (相手の石を発見)
                if (stone === color) return found; // 挟めることが確定 (対となる自分の石を発見)
            }
        };

        return ([] as number[]).concat(...diffVectors.map(effectsInLine));
    }

    public get isEnded(): boolean {
        return this.turn === null;
    }

    public get winner(): Color | null {
        // ゲームが終了していない場合はnullを返す
        if (!this.isEnded) return null;
        // 同じ数の場合はnullを返す
        if (this.blackCount === this.whiteCount) return null;
        if (this.opts.isLlotheo) {
            return this.blackCount > this.whiteCount ? WHITE : BLACK;
        } else {
            return this.blackCount > this.whiteCount ? BLACK : WHITE;
        }
    }
}
