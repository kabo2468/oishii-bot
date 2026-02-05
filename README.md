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
    denyRoleIds: [
        // ここにロールIDを追加すると、そのロールを持っているユーザーの投稿は無視される
        'abcdefghij0123',
    ],
    // (オプション) 追加のNGワードソース
    // ローカルファイルパス（相対/絶対）またはHTTP(S) URLを指定
    // 除外ワード（-プレフィックス）でデフォルトのNGワードを無効化可能
    ngWordSources: [
        './custom-ngwords.txt',
        // 'https://example.com/ngwords.txt',
    ],
}
```

## NG Words

Xeltica さんの Citrine から参考にさせていただきました。

<https://github.com/Xeltica/Citrine/blob/master/Resources/ngwords.txt>

### 外部ソースからのNGワード拡張

`config.json5` の `ngWordSources` に追加のNGワードファイルやURLを指定できます。

- `ngwords.txt` の形式に従ってください（1行に1ワード、`-` プレフィックスで除外ワード）
- ローカルファイルパス（相対パス/絶対パス）または HTTP(S) URL が使用可能
  - URLの場合、プレーンテキストでアクセスできる必要があります
- デフォルトの `ngwords.txt` に追加される形で読み込まれます
- デフォルトのNGワードを上書きすることができます（例: `-ばか` で「ばか」を除外）
- `/ng reload` コマンドで全ソースを再読み込みできます（オーナーのみ）

Docker 環境では、ローカルファイルパスはVolumeでマウントする必要があります。

## Docker

Dockerを使う場合は、以下の手順で起動できます。

1. `example.docker.json5` を `config.json5` にコピーして編集する (上記の [config.json5](#config.json) を参照)
2. `db_password.secret.example` のように `db_password.secret` にDBのパスワードを書く
3. `docker compose up -d` で起動する

デフォルトでは、既にビルドされたイメージを使うようになっています。

ローカルのソースコードを使いたい場合は、`compose.yaml`内の`services.bot.image`をコメントアウトしてください。

ビルドするときは、`docker compose build --build-arg GIT_SHA=$(git rev-parse HEAD)` を実行してください。
