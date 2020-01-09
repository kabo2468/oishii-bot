const goodText = 'おいしい', badText = 'まずい';

module.exports = {
    getWord: word => {
        if (Array.isArray(word)) {
            return word[Math.floor(Math.random() * word.length)];
        } else {
            return word;
        }
    },
    messages: {
        deleteDB: (cond, del) => `\`\`\`\nデータベースのレコード数が${cond}件を超えたため、学習されてないものを${del}件削除しました。\n\`\`\``,
        commands: {
            denied: 'このコマンドは、オーナーのみ実行できます。',
            help: '```\n/help: コマンドリストを表示する。\n/ping: 生存確認する。\n/info: (今のところは)DBのレコード数を表示する。\n/say: なにか言わせる。(オーナーのみ)\n```',
            ping: 'ぽん！',
            nullpo: 'ガッ',
            delete: {
                done: num => `${num}件削除しました。`,
                notFound: '見つかりませんでした。'
            }
        },
        food: {
            good: goodText,
            bad: badText,
            learn: (food, good) => `${food} は${good}\nおぼえた`,
            search: (food, good) => `${food} は${good ? goodText : badText}`,
            hungry: (food, good) => `${food} とかどう？\n${good === 't' ? goodText : badText}よ`,
            say: (food, good) => `${food}${good === 't' ? goodText : badText}`,
            canEat: 'それ食べられる？',
            idk: 'わからない',
            ngword: 'それ食べられない',
            long: '長いもの',
            pizza: [
                {
                    name: 'ドミノ・ピザ',
                    url: 'https://www.dominos.jp/'
                },
                {
                    name: 'ピザーラ',
                    url: 'https://www.pizza-la.co.jp/'
                },
                {
                    name: 'ピザハット',
                    url: 'https://pizzahut.jp/'
                }
            ],
            sushi: [
                '🍣',
                '🍙',
                '🍘'
            ]
        }
    },
    variables: {
        food: {
            good: '(おいし|美味し|(まず|マズ|ﾏｽﾞ)く(な|にゃ)|不味く(な|にゃ))い',
            bad: '((まず|マズ|ﾏｽﾞ)|不味|おいしく(な|にゃ)|美味しく(な|にゃ))い'
        },
        db: {
            deleteCountCond: 5000,
            deleteNum: 1000
        },
        post: {
            probability: 0.3,
            rateLimitSec: 60,
            rateLimitPost: 5
        }
    }
};
