import { Row } from './bot';
import { chooseOneFromArr } from './utils/cofa';

const goodText = 'おいしい';
const badText = 'まずい';

export default {
    commands: {
        denied: 'このコマンドは、オーナーのみ実行できます。',
        notFound: '見つかりませんでした。',
        help: [
            '/help: コマンドリストを表示する。',
            '/ping: 生存確認する。',
            '/info: DBのレコード数やCommit Hash、稼働時間を表示する。',
            '/follow: フォローする。',
            '/unfollow: フォローを解除する。',
            '/say: なにか言わせる。(オーナーのみ)',
            '/delete: 削除する。（オーナーのみ）',
            '/delall: その文字列が含まれているものを削除する。（オーナーのみ）',
            // '/chart: DBのレコード数をチャートにする。（オーナーのみ）',
            '/ng (a|b): NGワードを追加/削除する。（オーナーのみ）',
            '/setwhite: ホワイトデーの設定をする。（オーナーのみ）',
            '/get: DBから食べ物を取得する。（オーナーのみ）',
        ],
        ping: 'ぽん！',
        nullpo: 'ガッ',
        delete: {
            done: (num: number): string => `${num}件削除しました。`,
        },
        follow: {
            done: 'フォローしました。',
            already: '既にフォローしています。',
            cant: 'フォローできませんでした。',
        },
        unfollow: {
            done: 'フォロー解除しました。',
            not: 'フォローしていません。',
            cant: 'フォロー解除できませんでした。',
        },
        chart: 'DBのレコード数です。',
        ngWord: {
            add: (ng: boolean, ex: boolean): string => `追加しました。(NG: ${ng}, Exclude: ${ex})`,
            remove: (ng: boolean, ex: boolean): string => `削除しました。(NG: ${ng}, Exclude: ${ex})`,
        },
        encode: (status: boolean): string => `EncodeMode を${status ? 'オン' : 'オフ'}にしました。`,
        get: {
            found: (row: Partial<Row>): string => `\`\`\`\nName: ${row.name}\nGood: ${row.good}\nLearned: ${row.learned}\nuserId: ${row.userId}\nnoteId: ${row.noteId}\n\`\`\``,
        },
    },
    pizza: {
        text: [
            {
                name: 'ドミノ・ピザ',
                url: 'https://www.dominos.jp/',
            },
            {
                name: 'ピザーラ',
                url: 'https://www.pizza-la.co.jp/',
            },
            {
                name: 'ピザハット',
                url: 'https://pizzahut.jp/',
            },
            {
                name: 'ナポリの窯',
                url: 'https://www.napolipizza.jp/',
            },
        ],
        toText(): string {
            const pizzaText: string[] = [];
            this.text.forEach((shop) => pizzaText.push(`?[${shop.name}](${shop.url})`));
            return pizzaText.join('\n');
        },
    },
    food: {
        good: goodText,
        bad: badText,
        learn: (food: string, good: string): string => `${food} は${good}\nおぼえた`,
        search: (food: string, good: boolean): string => `${food} は${good ? goodText : badText}`,
        hungry: (food: string, good: boolean): string => `${food} とかどう？\n${good ? goodText : badText}よ`,
        say: (food: string, good: boolean): string => `${food}${good ? goodText : badText}`,
        canEat: 'それ食べられる？',
        idk: 'わからない',
        ngWord: 'それ食べられない',
        long: '長いもの',
        sushi: (num: number): string => {
            const text = [`にぎりました！`, `にぎったよ！`];
            return `${chooseOneFromArr(text)} ${'🍣'.repeat(num)}`;
        },
        food: (food: string): string => {
            const text = [`これあげる！`, `食べて！`];
            return `${chooseOneFromArr(text)} ${food}`;
        },
        valentine: {
            notToday: '今日はバレンタインデーじゃないよ！',
            give: {
                give: (chocolates: string[]): string => `これあげる！${chooseOneFromArr(chocolates)}`,
                again: (chocolates: string[]): string => `もう一つあげる！${chooseOneFromArr(chocolates)}`,
            },
            receive: {
                thx: 'ありがとう！今度お返しするよ！',
                again: 'もう一つくれるの！？ありがとう！',
            },
        },
        whiteDay: (username: string, presents: string): string => `${username} この前のお返しあげる！${presents}`,
    },
    fortune: {
        cw: '今日の運勢を占いました！',
        text: (food: string, good: boolean, rnd: number): string => {
            const fortunes = ['兆吉', '超吉', '大吉', '吉', '中吉', '末吉', '凶'];
            const fortune = fortunes[Math.floor(rnd * fortunes.length)];
            return `今日の運勢は${fortune}！\nラッキーフードは ${good ? goodText : badText} ${food} です！`;
        },
    },
    games: {
        reversi: {
            started: (name: string, url: string): string => `${name}と対局を始めました！\n[観戦する](${url})`,
            win: (name: string): string => `${name}に勝ちました！`,
            lose: (name: string): string => `${name}に負けました`,
            draw: (name: string): string => `${name}と引き分けました`,
            surrendered: (name: string): string => `${name}が投了しちゃいました`,
        },
    },
};
