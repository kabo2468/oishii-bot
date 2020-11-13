# oishii-bot

## なにこれ

Misskey で動く日本語Botです。

TLから言葉を学び、それをおいしいかまずいか決めて、投稿するBotです。

## 使い方

### Misskey で @oishiibot を作る

この ID じゃないと動きません

### Node.js, npm, PostgreSQL をインストールする

Node.js のバージョンは v14 以上にしてください

OS によってインストール方法が異なるので、各自調べてください

### `example.json5` をコピーして `config.json5` を作る

```shell
cp example.json5 config.json5
```

### `config.json5` を[下にある](#config.json)ように編集する

```shell
vi config.json5
# OR
emacs config.json5
# OR
nano config.json5
# ...etc
```

### ビルドする

```shell
npm i
npm run build
```

### Table を作る

```shell
npm run migration
```

### 終わり

```shell
npm start
```

## config.json

```json5
{
    // MisskeyのURL
    url: 'https://misskey.io',
    // 多分アクセストークンでも行ける（未検証）
    // アクセストークンでやる場合は、すべての権限をオンにしたほうが楽かも
    apiKey: '',
    // 大文字のところを書き換える
    databaseUrl: 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE',
    // DBのSSL
    dbSSL: false,
    // オーナーのUsername オーナーのみが使えるコマンドを使う人を配列で指定する
    ownerUsernames: ['kabo'],
    post: {
        // 何分毎に投稿するか
        autoPostInterval: 60,
        // TLに(フォロー / 3)数流れてきたときに食べ物を言う確率
        tlPostProbability: 0.4,
        // レートリミットの解除秒数
        rateLimitSec: 60,
        // レートリミットの最大数
        rateLimitPost: 5,
    },
}
```

## NG Words

Xeltica さんの Citrine から参考にさせていただきました。

<https://github.com/Xeltica/Citrine/blob/master/Resources/ngwords.txt>
