const kuromoji = require('kuromoji');
const WebSocket = require('ws');
const { Client } = require('pg');
const client = new Client({
    // ssl: true,
    connectionString: process.env.DATABASE_URL
});

client.connect();

const ws = new WebSocket(process.env.STREAMING_URL);
const builder = kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" });

const timelineData = {
    type: "connect",
    body: {
        channel: "localTimeline",
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
    console.log('Connected!');
    ws.send(JSON.stringify(timelineData));
    ws.send(JSON.stringify(mainData));
});

ws.addEventListener('close', function() {
    console.log('Disconnected!');
});

ws.addEventListener('message', function(data){
    console.log('----------Start----------');
    const json = JSON.parse(data.data);
    console.dir(json);

    if (json.body.id === '1803ad27-a839-4eb6-ac74-97677ee0a055') { //Timeline
        let text = json.body.body.text;
        if (text === null) return;

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
            get_exists(add_name)
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
            if (json.body.body.user.isBot === true) return;

            let text = json.body.body.text;
            if (text === null) return;
            text = text.replace(/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=@]*)?/g, '');

            const note_id = json.body.body.id;
            const reaction_data = {
                type: 'api',
                body: {
                    id: uuid(),
                    endpoint: 'notes/reactions/create',
                    data: {
                        noteId: note_id,
                        reaction: 'like'
                    }
                }
            };
            ws.send(JSON.stringify(reaction_data));

            let m = text.match(/(.+)(は|って)(おいしい|美味しい|まずい|不味い)[？?]+/g);
            if (m) { // check
                if (is_noun(m[1])) {
                    let is_good = false;
                    const query = {
                        text: 'SELECT good FROM oishii_table WHERE name=$1',
                        values: [ m[1] ]
                    };
                    client.query(query)
                    .then(res => {
                        if (res.rows[0].length < 1) {
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
            m = text.match(/(.+)[はも](おいしい|美味しい|まずい|不味い)よ?[！!]*/g);
            if (m) { // learn
                if (is_noun(m[1])) {
                    const is_good = m[2].match(/(おいしい|美味しい)/) ? true : false;

                    get_exists(m[1])
                    .then(res => {
                        if (res === true) {
                            const update_query = {
                                text: 'UPDATE oishii_table SET good=$1, learned=true WHERE name=$2',
                                values: [ is_good, m[1] ]
                            };
                            client.query(update_query)
                            .then(res => console.log(res))
                            .catch(e => console.error(e.stack));
                        } else {
                            const add_query = {
                                text: 'INSERT INTO oishii_table ( name, good, learned ) VALUES ( $1, $2, true )',
                                values: [ add_name, is_good ]
                            };
                            client.query(add_query)
                            .then(res => console.log(res))
                            .catch(e => console.error(e.stack));
                        }
                    }).then(() => {
                        reply(`${m[1]}は${m[2]}\nおぼえた`, note_id);
                    });
                } else {
                    reply('それ食べれる？', note_id);
                }
            }
            m = text.match(/(おいしい|美味しい|まずい|不味い)(もの|物|の)は[？?]*/g);
            if (m) { // search

            }
        }
    }
    console.log('----------End----------');
});

setInterval(() => {
    // ws.send(JSON.stringify(aaaaa));
}, 1000 * 60 * process.env.INTERVAL_MIN);

function reply(text, note_id) {
    const data = {
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
    };
    ws.send(JSON.stringify(data));
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

function get_exists(text) {
　  return new Promise((resolve, reject) => {
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

function is_noun(text) {
    builder.build((err, tokenizer) => {
        if (err) throw err;

        //名詞のみ取り出す
        const tokens = tokenizer.tokenize(text);
        const pos_arr = tokens.map(token => {
            return token.pos === '名詞' && token.pos_detail_1 !== 'サ変接続' ? token.surface_form : null;
        });
        const nouns = pos_arr.filter(n => n !== null);
        // console.log(`nouns: ${nouns}`);
        //もし何もなかったら
        if (nouns.length < 1) return false;

        //1文字のひらがな・カタカナを消す
        const output = nouns.filter(n => n.search(/^[ぁ-んァ-ン]$/));
        if (output) {
            return true;
        } else {
            return false;
        }
    });
}

/*
builder.build(function(err, tokenizer) {
    if(err) { throw err; }

    const tokens = tokenizer.tokenize("今日のメンテ明けが怖すぎて心拍数BPM222.2って感じで今にも心臓が止まりそう");
    // console.dir(tokens);

    const pos_arr = tokens.map(function(token){
        // if(token.pos === '名詞') return token.surface_form;
        return token.pos === '名詞' ? token.surface_form : null;
    });

    const output = pos_arr.filter(n => n !== null);
    console.log(output);
    console.log(`random 1: ${output[Math.floor(Math.random() * output.length)]}`);
});
*/
