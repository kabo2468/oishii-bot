const goodText = 'おいしい';
const badText = 'まずい';

export const arrToStr = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];

export default {
    commands: {
        denied: 'このコマンドは、オーナーのみ実行できます。',
        help: [
            '/help: コマンドリストを表示する。',
            '/ping: 生存確認する。',
            '/info: DBのレコード数やCommit Hash、稼働時間を表示する。',
            '/follow: フォローする。',
            '/unfollow: フォローを解除する。',
            '/say: なにか言わせる。(オーナーのみ)',
            '/delete: 削除する。（オーナーのみ）',
            // '/chart: DBのレコード数をチャートにする。（オーナーのみ）',
            '/ng (a|b): NGワードを追加/削除する。（オーナーのみ）',
        ],
        ping: 'ぽん！',
        nullpo: 'ガッ',
        delete: {
            done: (num: number): string => `${num}件削除しました。`,
            notFound: '見つかりませんでした。',
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
            let pizzaText = '';
            this.text.forEach((shop) => (pizzaText += `?[${shop.name}](${shop.url})`));
            return pizzaText;
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
            return `${arrToStr(text)} ${'🍣'.repeat(num)}`;
        },
        food: (food: string): string => {
            const text = [`これあげる！`, `食べて！`];
            return `${arrToStr(text)} ${food}`;
        },
    },
};
