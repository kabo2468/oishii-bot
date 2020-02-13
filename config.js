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
            help: [
                '/help: コマンドリストを表示する。',
                '/ping: 生存確認する。',
                '/info: (今のところは)DBのレコード数を表示する。',
                '/say: なにか言わせる。(オーナーのみ)',
                '/follow: フォローする。',
                '/unfollow: フォローを解除する。',
                '/delete: 削除する。（オーナーのみ）',
                '/chart: DBのレコード数をチャートにする。（オーナーのみ）'
            ],
            ping: 'ぽん！',
            nullpo: 'ガッ',
            delete: {
                done: num => `${num}件削除しました。`,
                notFound: '見つかりませんでした。'
            },
            follow: {
                done: 'フォローしました。',
                already: '既にフォローしています。',
                cant: 'フォローできませんでした。'
            },
            unfollow: {
                done: 'フォロー解除しました。',
                not: 'フォローしていません。',
                cant: 'フォロー解除できませんでした。'
            },
            chart: 'DBのレコード数です。'
        },
        food: {
            good: goodText,
            bad: badText,
            learn: (food, good) => `${food} は${good}\nおぼえた`,
            search: (food, good) => `${food} は${good ? goodText : badText}`,
            hungry: (food, good) => `${food} とかどう？\n${good ? goodText : badText}よ`,
            say: (food, good) => `${food}${good ? goodText : badText}`,
            canEat: 'それ食べられる？',
            idk: 'わからない',
            ngword: 'それ食べられない',
            long: '長いもの',
            sushi: num => [
                `にぎりました！ ${'🍣'.repeat(num)}`,
                `にぎったよ！ ${'🍣'.repeat(num)}`
            ],
            food: food => [
                `これあげる！ ${food}`,
                `食べて！ ${food}`
            ],
            valentine: {
                give: {
                    give: chocolate => `これあげる！${chocolate}`,
                    again: chocolate => `もう一つあげる！${chocolate}`
                },
                get: {
                    thx: 'ありがとう！今度お返しするよ！',
                    again: 'もう一つくれるの！？ありがとう！'
                }
            }
        }
    },
    variables: {
        food: {
            good: '((おい|美味)し|(まず|マズ|不味)く(な|にゃ)|うま|旨)い',
            bad: '(まず|マズ|不味|(おい|美味)しく(な|にゃ)|(うま|旨)く(な|にゃ))い',
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
                },
                {
                    name: 'ナポリの窯',
                    url: 'https://www.napolipizza.jp/'
                }
            ],
            food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍈','🍒','🍑','🍍','🥥','🥝','🥭','🥑','🥦','🍅','🍆','🥒','🥕','🌶','🥔','🌽','🥬','🍠','🥜','🧄','🧅','🍯','🥐','🍞','🥖','🥯','🥨','🧀','🥚','🥓','🥩','🥞','🍗','🍖','🦴','🍤','🍳','🍔','🍟','🥙','🌭','🍕','🥪','🥫','🍝','🌮','🌯','🥗','🥘','🍜','🍲','🍥','🥠','🍣','🍱','🍛','🍙','🍚','🍘','🍢','🍡','🍧','🍨','🍦','🥧','🍰','🧁','🥮','🎂','🍮','🍬','🍭','🍫','🍿','🥟','🍩','🍪','🧇','🧆','🧈','🦪','🥛','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🍾','🍶','🍵','🥤','☕','🍼','🧃','🧉','🧊','🧂','🥄','🍴','🍽','🥣','🥡','🥢'],
            chocolate: ['🍫','🍪']
        },
        db: {
            deleteCountCond: 5000,
            deleteNum: 1000
        },
        post: {
            probability: 0.4,
            rateLimitSec: 60,
            rateLimitPost: 5
        }
    }
};
