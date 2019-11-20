module.exports = {
    messages: {
        deleteDB: [
            "```\nデータベースのレコード数が",
            "件を超えたため、学習されてないものを",
            "件削除しました。\n```"
        ],
        commands: {
            denied: "このコマンドは、オーナーのみ実行できます。",
            help: "```\n/help: コマンドリストを表示する。\n/ping: 生存確認する。\n/info: (今のところは)DBのレコード数を表示する。\n/say: なにか言わせる。(オーナーのみ)\n```",
            ping: "ぽん！"
        },
        food: {
            good: "おいしい",
            bad: "まずい",
            is: " は",
            learn: "おぼえた",
            canEat: "それ食べられる？",
            idk: "わからない",
            ngword: "それ食べられない",
            long: "長いもの",
            pizza: [
                {
                    name: "ドミノ・ピザ",
                    url: "https://www.dominos.jp/"
                },
                {
                    name: "ピザーラ",
                    url: "https://www.pizza-la.co.jp/"
                },
                {
                    name: "ピザハット",
                    url: "https://pizzahut.jp/"
                }
            ]
        }
    },
    variables: {
        food: {
            good: "(おいし|美味し|まずく(な|にゃ)|不味く(な|にゃ))い",
            bad: "(まず|不味|おいしく(な|にゃ)|美味しく(な|にゃ))い"
        },
        db: {
            deleteCountCond: 5000,
            deleteNum: 1000
        },
        post: {
            count: 20,
            probability: 0.5,
            autoInterval: 60
        }
    }
};
