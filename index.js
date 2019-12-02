const error = [];
if (!process.env.DATABASE_URL) error.push('[ERROR]:You must set DATABASE_URL');
if (!process.env.STREAMING_URL) error.push('[ERROR]:You must set STREAMING_URL');
if (!process.env.USER_ID) error.push('[ERROR]:You must set USER_ID');
if (error.length > 0) {
    for (const err in error) console.log(error[err]);
    process.exit(1);
}
const fs = require('fs');
const readline = require('readline');
const kuromoji = require('kuromoji');
const moji = require('moji');
const ReconnectingWebSocket = require('reconnecting-websocket');
const ws_const = require('ws');
const { Client } = require('pg');
const config = require('./config.js');
const psql = new Client({
    ssl: false,
    connectionString: process.env.DATABASE_URL
});

let tlCount = 0;
let pizzaText = '';
config.messages.food.pizza.forEach(shop => {
    pizzaText += `?[${shop.name}](${shop.url})\n`;
});

// RATE LIMIT
let limit = 0;

// NG Words
const ExcludedWords = [];
const NGWords = [];
const rs = fs.createReadStream('ngwords.txt');
const rl = readline.createInterface(rs, {});
rl.on('line', line => {
    const word = toHiragana(line.trim().toLowerCase());
    if (/^#/.test(word)) return;
    if (/^-/.test(word)) {
        ExcludedWords.push(word.substring(1));
    } else {
        NGWords.push(word);
    }
});

// Poll
const pollData = {
    prevDate: null,
    currNoteID: null,
    apiID: null
};

psql.connect();

const ws = new ReconnectingWebSocket(process.env.STREAMING_URL, [], {
    WebSocket: ws_const
});
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

ws.addEventListener('open', function() {
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

        if (json.body.body.userId === process.env.USER_ID) return;
        let text = json.body.body.text;
        if (text === null) return;
        if (json.body.body.cw !== null) return;
        if (/@oishiibot/.test(text)) return;
        if (json.body.body.visibility === 'specified') return;

        //URLを消す
        text = text.replace(/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=@]*)?/g, '');
        // メンションを消す
        text = text.replace(/@\w+@?[\w.-]*\s+/g, '');
        // NGWords
        if (isNGWord(text)) {
            console.log(`SKIP(NG WORD): ${text}`);
            return;
        }

        if (text.match(/^[@＠](ピザ|ぴざ)$/)) {
            console.log('TL: PIZZA');
            const visibility = json.body.body.visibility;
            sendText({text: pizzaText, reply_id: json.body.body.id, visibility: (visibility !== 'public' ? visibility : 'home')});
            return;
        }

        // heroku DB 制限
        /*
        psql.query('SELECT count(*) FROM oishii_table').then(res => {
            const count = res.rows[0].count;
            const db = config.variables.db;
            if (Number(count) > db.deleteCountCond) { // config.json => config.variables.db.deleteCountCond件以上なら
                const deleteQuery = {
                    text: 'DELETE FROM oishii_table WHERE name in (SELECT name FROM oishii_table WHERE learned = false ORDER BY RANDOM() LIMIT $1)',
                    values: [ db.deleteNum ]
                };
                psql.query(deleteQuery).then(() => {
                    console.log(`DELETE: ${count} > ${db.deleteCountCond} -${db.deleteNum} => ${count - db.deleteNum}`);
                    sendText({text: config.messages.deleteDB(db.deleteCountCond, db.deleteNum)});
                })
                .catch(e => console.log(e));
            }
        })
        .catch(e => console.log(e));
        */

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
            if (nouns.length < 1) return;

            //1文字の英数字、ひらがな、カタカナ、数字を消す
            const output = nouns.filter(n => n.search(/^([A-Za-zぁ-ゔァ-ヴｦ-ﾟ\d]|[ー～]+)$/));
            // console.log(`output: ${output}`);
            //もし何もなかったら
            if (output.length < 1) return;

            //どれか1つ選ぶ
            const add_name = output[Math.floor(Math.random() * output.length)];
            // console.log(`add_name: ${add_name}`);

            //被り
            getExists(add_name)
            .then(res => {
                if (res === true) {
                    // console.log(`if: ${res}`);
                    throw `${add_name} is skipped.`;
                }
            }).then(() => {
                //Add DB
                const is_good = Math.random() < 0.8 ? 'true' : 'false';
                const add_query = {
                    text: 'INSERT INTO oishii_table ( name, good ) VALUES ( $1, $2 )',
                    values: [ add_name, is_good ]
                };
                psql.query(add_query)
                .then(() => console.log(`INSERT: ${add_name} (${is_good})`))
                .catch(e => console.error(e.stack));
            }).catch(e => console.log(e));

            // n投稿毎、p確率で sayFood
            if (tlCount < config.variables.post.count) {
                tlCount++;
            } else {
                if (Math.random() < config.variables.post.probability) {
                    const _time = 1000 * Math.random() * 10 + 10;
                    setTimeout(sayFood, _time);
                    console.log(`TLCount Posted. After ${_time}ms`);
                }
                tlCount = 0;
            }
            console.log(`TLCount: ${tlCount}`);
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
            text = text.replace(/@oishiibot(@misskey\.io)?\s/, '');
            console.log(`json text:${text}`);

            const note_id = json.body.body.id;
            const visibility = json.body.body.visibility;
            const reactionData = {
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
            if (text.match(/^\s*かわい{2,}[！!]*\s*$/)) reactionData.body.data.reaction = 'love';
            ws.send(JSON.stringify(reactionData));

            let m;
            // Commands
            m = text.match(/^\s*\/help\s*$/);
            if (m) { // help
                console.log('COMMAND: help');
                sendText({text: config.messages.commands.help, reply_id: note_id, visibility: visibility});
                return;
            }
            m = text.match(/^\s*\/ping\s*$/);
            if (m) { // ping
                console.log('COMMAND: ping');
                sendText({text: config.messages.commands.ping, reply_id: note_id, visibility: visibility});
                return;
            }
            m = text.match(/^\s*\/info\s*$/);
            if (m) { // info
                console.log('COMMAND: info');
                psql.query('SELECT learned, count(learned) FROM oishii_table GROUP BY learned').then(res => {
                    const fl = res.rows[0].count;
                    const tl = res.rows[1].count;
                    const all = Number(fl) + Number(tl);
                    const text = `Records: ${all.toString()} (Learned: ${tl})`;
                    console.log(`COMMAND: info[ ${text} ]`);
                    sendText({text: text, reply_id: note_id, visibility: visibility});
                });
                return;
            }
            m = text.match(/^\s*\/say\s*$/);
            if (m) { // say
                console.log('COMMAND: say');
                if (json.body.body.user.username === 'kabo') {
                    sayFood();
                } else {
                    sendText({text: config.messages.commands.denied, reply_id: note_id, visibility: visibility});
                }
                return;
            }
            m = text.match(/^\s*\/poll\s*$/);
            if (m) { // poll
                console.log('COMMAND: poll');
                const nowDate = new Date();
                // const aWeekDate = new Date().setDate(nowDate.getDate() + 7);
                if (nowDate.getTime() < pollData.prevDate + 1000 * 60 * 60 * 24 * 7) {
                    sendText({ text: config.messages.commands.poll(pollData.prevDate + 1000 * 60 * 60 * 24 * 7)});
                    return;
                }
                const id = uuid();
                psql.query('SELECT name FROM oishii_table WHERE learned=false ORDER BY RANDOM() LIMIT 1').then(res => {
                    const poll = {
                        choices: [ config.messages.food.good, config.messages.food.bad ],
                        multiple: false,
                        expiredAfter: 1000 * 60 * 60 * 24 * 7
                    };
                    sendText({id: id, text: config.messages.commands.poll.post(res.rows[0].name), poll: poll});
                });
                pollData.prevDate = nowDate.getTime();
                pollData.apiID = id;
                return;
            }

            // Text
            m = text.match(`(.+)(は|って)(${config.variables.food.good}|${config.variables.food.bad})[？?]+`);
            if (m) { // check
                (async () => {
                    const text = replaceSpace(m[1]);
                    // NGWords
                    if (isNGWord(text)) {
                        sendText({text: config.messages.food.ngword, reply_id: note_id, visibility: visibility});
                        console.log(`NG WORD: ${text}`);
                        return;
                    }
                    const query = {
                        text: 'SELECT good FROM oishii_table WHERE LOWER(name) = LOWER($1)',
                        values: [text]
                    };
                    psql.query(query)
                    .then(res => {
                        // console.dir(res);
                        if (res.rowCount < 1) {
                            isNoun(text).then(is_noun => {
                                if (is_noun) {
                                    sendText({text: config.messages.food.idk, reply_id: note_id, visibility: visibility});
                                } else {
                                    sendText({text: config.messages.food.canEat, reply_id: note_id, visibility: visibility});
                                }
                            });
                            return;
                        }
                        const isGood = res.rows[0].good;
                        const goodS = isGood ? config.messages.food.good : config.messages.food.bad;
                        console.log(`CHECK: ${text}`);
                        sendText({text: goodS, reply_id: note_id, visibility: visibility});
                    })
                    .catch(e => console.log(e));
                })();
                return;
            }
            m = text.match(`(.+)[はも](${config.variables.food.good}|${config.variables.food.bad})よ?[！!]*`);
            if (m) { // learn
                (async () => {
                    const text = replaceSpace(m[1]);
                    // NGWords
                    if (isNGWord(text)) {
                        sendText({text: config.messages.food.ngword, reply_id: note_id, visibility: visibility});
                        console.log(`NG WORD: ${text}`);
                        return;
                    }
                    const is_good = m[2].match(`(${config.variables.food.good})`) ? true : false;
                    const isExists = await getExists(text);
                    if (isExists) {
                        const update_query = {
                            text: 'UPDATE oishii_table SET good=$1, learned=true WHERE LOWER(name) = LOWER($2)',
                            values: [is_good, text]
                        };
                        psql.query(update_query)
                            .then(() => console.log(`LEARN(UPDATE): ${text} is ${is_good}`))
                            .catch(e => console.error(e.stack));
                    } else {
                        const add_query = {
                            text: 'INSERT INTO oishii_table ( name, good, learned ) VALUES ( $1, $2, true )',
                            values: [text, is_good]
                        };
                        psql.query(add_query)
                            .then(() => console.log(`LEARN(INSERT): ${text} is ${is_good}`))
                            .catch(e => console.error(e.stack));
                    }
                    sendText({text: config.messages.food.learn(text, m[2]), reply_id: note_id, visibility: visibility});
                })();
                return;
            }
            m = text.match(`(みん(な|にゃ)の)?(${config.variables.food.good}|${config.variables.food.bad})(もの|物|の)は?(何|(な|にゃ)に)?[？?]*`);
            if (m) { // search
                (async () => {
                    const is_good = m[3].match(`(${config.variables.food.good})`) ? true : false;
                    const search_query = {
                        text: 'SELECT name FROM oishii_table WHERE good=$1 ORDER BY RANDOM() LIMIT 1',
                        values: [is_good]
                    };
                    if (m[1]) search_query.text = 'SELECT name FROM oishii_table WHERE good=$1 AND learned=true ORDER BY RANDOM() LIMIT 1';

                    psql.query(search_query)
                        .then(res => {
                            // console.dir(res);
                            const row = res.rows[0];
                            // console.dir(row);
                            // const igt = is_good ? config.messages.food.good : config.messages.food.bad;
                            console.log(`SEARCH: ${row.name} (${is_good})`);
                            sendText({text: config.messages.food.search(row.name, is_good), reply_id: note_id, visibility: visibility});
                        })
                        .catch(e => console.error(e.stack));
                })();
                return;
            }
            m = text.match(/お?(腹|(な|にゃ)か|はら)([空すあ]い|([減へ][っり]))た?[！!]*/);
            if (m) { // hungry
                (async () => {
                    const search_query = {
                        text: 'SELECT (name, good) FROM oishii_table WHERE good=true ORDER BY RANDOM() LIMIT 1'
                    };
                    if (Math.random() < config.variables.probability.hungry) search_query.text = 'SELECT (name, good) FROM oishii_table WHERE good=false ORDER BY RANDOM() LIMIT 1';
                    psql.query(search_query)
                        .then(res => {
                            // console.dir(res);
                            const row = res.rows[0].row;
                            console.log(`row: ${row}`);
                            const re = /\((.+),([tf])\)/;
                            const name = row.match(re)[1].replace(/"(.+)"/, '$1');
                            const good = row.match(re)[2];
                            // const text = `${name} とかどう？\n${good === 't' ? config.messages.food.good : config.messages.food.bad}よ`;
                            console.log(`HUNGRY: ${name} (${good})`);
                            sendText({text: config.messages.food.hungry(name, good), reply_id: note_id, visibility: visibility});
                        })
                        .catch(e => console.error(e.stack));
                })();
                return;
            }
            m = text.match(/^\s*[@＠]?(ピザ|ぴざ)\s*$/);
            if (m) { // pizza
                console.log('COMMAND: PIZZA');
                sendText({text: pizzaText, reply_id: note_id, visibility: (visibility !== 'public' ? visibility : 'home')});
                return;
            }
        }
    }
});

setInterval(() => {
    sayFood();
}, 1000 * 60 * (process.env.INTERVAL_MIN || 60));

setInterval(() => {
    // console.log(limit);
    limit = 0;
}, 1000 * config.variables.post.rateLimitSec);


function sayFood() {
    if (limit > config.variables.post.rateLimitPost - 1) return;
    const query = {
        text: 'SELECT (name, good) FROM oishii_table ORDER BY RANDOM() LIMIT 1'
    };
    if (Math.random() < config.variables.probability.auto) query.text = 'SELECT (name, good) FROM oishii_table WHERE learned=true ORDER BY RANDOM() LIMIT 1';
    psql.query(query)
        .then(res => {
            // console.log(res);
            const row = res.rows[0].row;
            console.log(`row: ${row}`);
            const re = /\((.+),([tf])\)/;
            const name = row.match(re)[1].replace(/"(.+)"/, '$1');
            const good = row.match(re)[2];
            const text = config.messages.food.say(name, good);
            console.log(`POST: ${text}`);
            sendText({text: text});
        })
        .catch(e => console.error(e.stack));
    limit++;
}

function sendText({id, text, reply_id, visibility = 'public', user_id, poll}) {
    const _t = text.replace(/\\\\/g, '\\');
    const sendData = {
        type: 'api',
        body: {
            id: id || uuid(),
            endpoint: 'notes/create',
            data: {
                visibility: visibility,
                text: _t,
                localOnly: false,
                geo: null
            }
        }
    };
    if (_t.length > 100) sendData.body.data.cw = config.messages.food.long;
    if (reply_id) sendData.body.data.replyId = reply_id;
    if (user_id) {
        sendData.body.data.visibility = 'specified';
        sendData.body.data.visibleUserIds = user_id;
    }
    if (poll) sendData.body.data.poll = poll;
    ws.send(JSON.stringify(sendData));
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
            text: 'SELECT EXISTS (SELECT * FROM oishii_table WHERE LOWER(name) = LOWER($1))',
            values: [ text ]
        };
        psql.query(query)
        .then(res => {
            // console.log(`func: ${res.rows[0].exists}`);
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

function replaceSpace(text) {
    return text.replace(/^\s+|\s+$/g, '');
}

function toHiragana(str) {
    return moji(str).convert('HK', 'ZK').convert('KK', 'HG').toString();
}

function isNGWord(str) {
    let ngText = toHiragana(str.toLowerCase());
    ExcludedWords.forEach(w => {
        ngText = ngText.replace(w, '');
    });
    return NGWords.some(ng => ngText.match(ng)) ? true : false;
}
