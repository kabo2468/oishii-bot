# oishii-bot

## なにこれ

Misskey で動く日本語Botです。

TLから言葉を学び、それをおいしいかまずいか決めて、投稿するBotです。

## 使い方

Docker を使う場合は、[Docker](#docker) を参照してください。

### Misskey で @oishiibot を作る

この ID じゃないと動きません

### Node.js, npm, PostgreSQL をインストールする

Node.js のバージョンは v16 以上にしてください

OS によってインストール方法が異なるので、各自調べてください

### MeCab をインストールする

aptなどのパッケージインストーラーからインストールするか、自分でビルドしてください

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

## config.json5

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
    mecab: {
        // mecabのインストールパス (`which mecab`)
        binPath: '/usr/bin/mecab',
        // mecabの辞書ファイル
        dicPath: '',
    },
}
```

## NG Words

Xeltica さんの Citrine から参考にさせていただきました。

<https://github.com/Xeltica/Citrine/blob/master/Resources/ngwords.txt>

## Docker

Dockerを使う場合は、以下の手順で起動できます。

1. `example.docker.json5` を `config.json5` にコピーして編集する (上記の [config.json5](#config.json) を参照)
2. `db_password.secret.example` のように `db_password.secret` にDBのパスワードを書く
3. `docker compose up -d` で起動する

デフォルトでは、既にビルドされたイメージを使うようになっています。

ローカルのソースコードを使いたい場合は、`compose.yaml`内の`services.bot.image`をコメントアウトしてください。
