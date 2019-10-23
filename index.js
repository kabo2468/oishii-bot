const kuromoji = require('kuromoji');
const WebSocket = require('ws');
const { Client } = require('pg');
const client = new Client({
    // ssl: true,
    connectionString: process.env.DATABASE_URL
});

client.connect();
// const testQuery = {
//     text: 'SELECT count(*) FROM oishii_table'
// };
// console.time('test');
// client.query(testQuery).then(res => {
//     console.log(res);
//     console.log(res.rows[0].count);
// });
// console.timeEnd('test');

const ws = new WebSocket(process.env.STREAMING_URL);
const builder = kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" });

const timelineData = {
    type: "connect",
    body: {
        // channel: "localTimeline",
        channel: "hybridTimeline",
        id: "1803ad27-a839-4eb6-ac74-97677ee0a055"
    }
};
const mainData = {
    type: "connect",
    body: {
        channel: "main",
        id: "69d71556-8747-4287-b849-d3957d33baa7"
    }
};

ws.on('open', function() {
    ws.send(JSON.stringify(timelineData));
    ws.send(JSON.stringify(mainData));
    console.log('Connected!');
});

ws.addEventListener('close', function() {
    console.log('Disconnected.');
});

ws.addEventListener('message', function(data){
    // console.log('----------Start----------');
    const json = JSON.parse(data.data);

    if (json.body.id === '1803ad27-a839-4eb6-ac74-97677ee0a055') { //Timeline
        // console.dir(json);

        // heroku DB 制限
        client.query('SELECT count(*) FROM oishii_table').then(res => {
            const count = res.rows[0].count;
            if (Number(count) > 5000) { // 5000件以上なら
                client.query('DELETE FROM oishii_table').then(() => {
                    sendText('```データベースのレコード数が5000件を超えたので、データベースが初期化されました。```');
                })
                .catch(e => console.log(e));
            }
        })
        .catch(e => console.log(e));

        if (json.body.body.userId === process.env.USER_ID) return;
        let text = json.body.body.text;
        if (text === null) return;
        if (/@oishiibot/.test(text)) return;

        //URLを消す
        text = text.replace(/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=@]*)?/g, '');

        builder.build((err, tokenizer) => {
            if (err) throw err;
    
            //名詞のみ取り出す
            const tokens = tokenizer.tokenize(text);
            const pos_arr = tokens.map(token => {
                return token.pos === '名詞' && token.pos_detail_1 !== 'サ変接続' ? token.surface_form : null;
            });
            const nouns = pos_arr.filter(n => n !== null);
            console.log(`nouns: ${nouns}`);
            //もし何もなかったら
            if (nouns.length < 1) return;

            //1文字のひらがな・カタカナを消す
            const output = nouns.filter(n => n.search(/^[ぁ-んァ-ン]$/));
            console.log(`output: ${output}`);
            //もし何もなかったら
            if (output.length < 1) return;
    
            //どれか1つ選ぶ
            const add_name = output[Math.floor(Math.random() * output.length)];
            console.log(`add_name: ${add_name}`);

            //被り
            getExists(add_name)
            .then(res => {
                if (res === true) {
                    console.log(`if: ${res}`);
                    throw 'This word is skipped.';
                }
            }).then(() => {
                //Add DB
                const add_query = {
                    text: 'INSERT INTO oishii_table ( name ) VALUES ( $1 )',
                    values: [ add_name ]
                };
                client.query(add_query)
                .then(res => console.log(res))
                .catch(e => console.error(e.stack));
            }).catch(e => console.log(e));
        });
    }
    
    if (json.body.id === '69d71556-8747-4287-b849-d3957d33baa7') { //Main
        if (json.body.type === 'notification') return;

        if (json.body.type === 'followed') { //follow back
            // console.dir(json);
            ws.send(JSON.stringify({
                type: 'api',
                body: {
                    id: uuid(),
                    endpoint: 'following/create',
                    data: {
                        userId: json.body.body.id
                    }
                }
            }));
        }

        if (json.body.type === 'mention') {
            // console.dir(json);

            // Bot属性を無視
            if (json.body.body.user.isBot === true) return;

            let text = json.body.body.text;
            if (text === null) return;
            text = text.replace(/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=@]*)?/g, '');
            text = text.replace('@oishiibot ', '');
            console.log(`json text:${text}`);

            const note_id = json.body.body.id;
            const reaction_data = {
                type: 'api',
                body: {
                    id: uuid(),
                    endpoint: 'notes/reactions/create',
                    data: {
                        noteId: note_id,
                        reaction: 'pudding'
                    }
                }
            };
            ws.send(JSON.stringify(reaction_data));

            let m;
            // Commands
            m = text.match(/^\s*\/ping\s*$/);
            if (m) { // ping
                reply('ぽん!', note_id);
                return;
            }
            m = text.match(/^\s*\/info\s*$/);
            if (m) { // info
                client.query('SELECT count(*) FROM oishii_table').then(res => {
                    const count = res.rows[0].count;
                    reply(`Records: ${count}`, note_id);
                });
                return;
            }

            // Text
            m = text.match(/(.+)(は|って)(おいしい|美味しい|まずい|不味い)[？?]+/);
            if (m) { // check
                foodCheck(m, note_id);
                return;
            }
            m = text.match('(.+)[はも](おいしい|美味しい|まずい|不味い)よ?[！!]*');
            if (m) { // learn
                foodLearn(m, note_id);
                return;
            }
            m = text.match('(おいしい|美味しい|まずい|不味い)(もの|物|の)は(何|なに)?[？?]*');
            if (m) { // search
                foodSearch(m, note_id);
                return;
            }
        }
    }
});

setInterval(() => {
    let text = '', name = '', good = '';

    const query = {
        text: 'SELECT (name, good) FROM oishii_table'
    };
    client.query(query)
    .then(res => {
        console.log(res);
        const re = /\((.+),([tf])\)/;
        const row = res.rows[Math.floor(Math.random() * res.rowCount)].row;
        console.log(`row: ${row}`);
        name = row.match(re)[1];
        good = row.match(re)[2];
    })
    .then(() => {
        text = name;
        text += good === 't' ? 'おいしい' : 'まずい';
        const data = {
            type: 'api',
            body: {
                id: uuid(),
                endpoint: 'notes/create',
                data: {
                    visibility: "public",
                    text: `${text}`,
                    localOnly: false,
                    geo: null
                }
            }
        };
        ws.send(JSON.stringify(data));
    })
    .catch(e => console.error(e.stack));
}, 1000 * 60 * process.env.INTERVAL_MIN);


async function foodSearch(m, note_id) {
    const is_good = m[1].match(/(おいしい|美味しい)/) ? true : false;
    const search_query = {
        text: 'SELECT name FROM oishii_table WHERE good=$1',
        values: [is_good]
    };
    client.query(search_query)
        .then(res => {
            // const re = /\((.+),([tf])\)/;
            console.dir(res);
            const row = res.rows[Math.floor(Math.random() * res.rowCount)];
            console.dir(row);
            const igt = is_good ? 'おいしい' : 'まずい';
            reply(`${row.name} は${igt}`, note_id);
        })
        .catch(e => console.error(e.stack));
}


async function foodLearn(m, note_id) {
    const text = m[1].replace(/^\s+|\s+$/g, '');
    const isN = await isNoun(text);
    if (isN) {
        const is_good = m[2].match(/(おいしい|美味しい)/) ? true : false;
        const isExists = await getExists(text);
        if (isExists) {
            const update_query = {
                text: 'UPDATE oishii_table SET good=$1 WHERE name=$2',
                values: [is_good, text]
            };
            client.query(update_query)
                .then(res => console.log(res))
                .catch(e => console.error(e.stack));
        } else {
            const add_query = {
                text: 'INSERT INTO oishii_table ( name, good ) VALUES ( $1, $2 )',
                values: [text, is_good]
            };
            client.query(add_query)
                .then(res => console.log(res))
                .catch(e => console.error(e.stack));
        }
        reply(`${text} は${m[2]}\nおぼえた`, note_id);
    } else {
        reply('それ食べれる？', note_id);
    }
}

async function foodCheck(m, note_id) {
    const text = m[1].replace(/^\s+|\s+$/g, '');
    const isN = await isNoun(text);
    if (isN) {
        let is_good = false;
        const query = {
            text: 'SELECT good FROM oishii_table WHERE name=$1',
            values: [text]
        };
        client.query(query)
            .then(res => {
                console.log(res);
                if (res.rows.length < 1) {
                    throw 'Not found';
                }
                is_good = res.rows[0].good;
                console.log(is_good);
                const text = is_good ? 'おいしい' : 'まずい';
                reply(text, note_id);
            })
            .catch(e => {
                console.log(e);
                reply('わからない', note_id);
            });
    } else {
        reply('それ食べれる？', note_id);
    }
}

function reply(text, note_id) {
    ws.send(JSON.stringify({
        type: 'api',
        body: {
            id: uuid(),
            endpoint: 'notes/create',
            data: {
                visibility: "public",
                text: text,
                localOnly: false,
                geo: null,
                replyId: note_id
            }
        }
    }));
}

function sendText(text) {
    ws.send(JSON.stringify({
        type: 'api',
        body: {
            id: uuid(),
            endpoint: 'notes/create',
            data: {
                visibility: "public",
                text: text,
                localOnly: false,
                geo: null
            }
        }
    }));   
}

function uuid() {
    let uuid = '', i, random;
    for (i = 0; i < 32; i++) {
        random = Math.random() * 16 | 0;
        if (i == 8 || i == 12 || i == 16 || i == 20) {
            uuid += '-';
        }
        uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
    }
    return uuid;
}

function getExists(text) {
    return new Promise(resolve => {
        const query = {
            text: 'SELECT EXISTS (SELECT * FROM oishii_table WHERE name = $1)',
            values: [ text ]
        };
        client.query(query)
        .then(res => {
            console.log(`func: ${res.rows[0].exists}`);
            resolve(res.rows[0].exists);
        })
        .catch(e => console.error(e.stack));
    });
}

function isNoun(text) {
    return new Promise(resolve => {
        console.log(`is_noun text: ${text}`);
        builder.build((err, tokenizer) => {
            if (err) throw err;

            //名詞のみ取り出す
            const tokens = tokenizer.tokenize(text);
            const pos_arr = tokens.map(token => {
                return token.pos === '名詞' && token.pos_detail_1 !== 'サ変接続' ? token.surface_form : null;
            });
            const nouns = pos_arr.filter(n => n !== null);
            console.log(`nouns: ${nouns}`);
            //もし何もなかったら
            if (nouns.length < 1) resolve(false);

            //1文字のひらがな・カタカナを消す
            const output = nouns.filter(n => n.search(/^[ぁ-んァ-ン]$/));
            if (output) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}
