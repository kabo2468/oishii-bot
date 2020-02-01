const error = [];
if (!process.env.DATABASE_URL) error.push('[ERROR]:You must set DATABASE_URL');
if (!process.env.MISSKEY_URL) error.push('[ERROR]:You must set MISSKEY_URL');
if (!process.env.API_KEY) error.push('[ERROR]:You must set API_KEY');
if (!process.env.USER_ID) error.push('[ERROR]:You must set USER_ID');
if (error.length > 0) {
    for (const err in error) console.log(error[err]);
    process.exit(1);
}

const fs = require('fs');
const readline = require('readline');
const uuid = require('uuid/v4');
const kuromoji = require('kuromoji');
const moji = require('moji');
const ms = require('ms');
const ReconnectingWebSocket = require('reconnecting-websocket');
const ws_const = require('ws');
const { Client } = require('pg');
const request = require('request-promise-native');
const config = require('./config.js');
const { getWord } = require('./config.js');
const { genChart } = require('./chart.js');
const psql = new Client({
    ssl: false,
    connectionString: process.env.DATABASE_URL
});

let tlCount = 0;
let pizzaText = '';
config.variables.food.pizza.forEach(shop => {
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

psql.connect();

const ws = new ReconnectingWebSocket(`wss://${process.env.MISSKEY_URL}/streaming?i=${process.env.API_KEY}`, [], {
    WebSocket: ws_const
});
const builder = kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" });

const timelineData = {
    type: "connect",
    body: {
        // channel: "localTimeline",
        // channel: "hybridTimeline",
        channel: "homeTimeline",
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

let followCount = 0;
const followSendData = {
    type: 'api',
    body: {
        id: '7e5f734f-920c-43e2-ae2c-3dcff866f2f6',
        endpoint: 'users/show',
        data: {
            userId: process.env.USER_ID
        }
    }
};
const commandPost = {
    id: '',
    visibility: ''
};

ws.addEventListener('open', function() {
    ws.send(JSON.stringify(timelineData));
    ws.send(JSON.stringify(mainData));
    console.log('Connected!');
    ws.send(JSON.stringify(followSendData));
});
ws.addEventListener('close', function() {
    console.log('Disconnected.');
});

ws.addEventListener('message', function(data){
    // console.log('----------Start----------');
    const json = JSON.parse(data.data);

    if (json.type === 'api:7e5f734f-920c-43e2-ae2c-3dcff866f2f6') { // Follow Count
        followCount = json.body.res.followingCount;
        console.log(`Now Following: ${followCount}`);
        return;
    }

    if (json.type === 'api:ae2a63d4-7e17-41e1-b58c-f960becaab03') { // Follow Command
        let _t = '';
        if ('res' in json.body) {
            _t = config.messages.commands.follow.done;
        } else {
            if (json.body.e.id === '35387507-38c7-4cb9-9197-300b93783fa0') { // ALREADY_FOLLOWING
                _t = config.messages.commands.follow.already;
            } else {
                _t = config.messages.commands.follow.cant;
            }
            followCount--;
        }
        sendText({text: _t, reply_id: commandPost.id, visibility: commandPost.visibility, ignoreNG: true});
        return;
    }

    if (json.type === 'api:8a06d0ae-b801-483b-9dc5-540865b348c9') { // Unfollow Command
        let _t = '';
        if ('res' in json.body) {
            _t = config.messages.commands.unfollow.done;
        } else {
            if (json.body.e.id === '5dbf82f5-c92b-40b1-87d1-6c8c0741fd09') { // NOT_FOLLOWING
                _t = config.messages.commands.unfollow.not;
            } else {
                _t = config.messages.commands.unfollow.cant;
            }
            followCount++;
        }
        sendText({text: _t, reply_id: commandPost.id, visibility: commandPost.visibility, ignoreNG: true});
        return;
    }

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
            console.log(`SKIP(NG WORD): ${findNGWord(text)}`);
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
            if (tlCount < (followCount / 2)) {
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
        return;
    }

    if (json.body.id === '69d71556-8747-4287-b849-d3957d33baa7') { //Main
        if (json.body.type === 'notification') return;

        if (json.body.type === 'readAllUnreadSpecifiedNotes') return;

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
            followCount++;
            console.log(`Now Following: ${followCount}`);
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
            if (text.match(/(かわいい|カワイイ|可愛い|kawaii)/i)) reactionData.body.data.reaction = 'love';
            ws.send(JSON.stringify(reactionData));

            let m;
            // Commands
            m = text.match(/^\/help$/);
            if (m) { // help
                console.log('COMMAND: help');
                let _t = '';
                for (const command in config.messages.commands.help) {
                    _t += `${config.messages.commands.help[command]}\n`;
                }
                sendText({text: `\`\`\`\n${_t}\`\`\``, reply_id: note_id, visibility: visibility, ignoreNG: true});
                return;
            }
            m = text.match(/^\/ping$/);
            if (m) { // C: ping
                console.log('COMMAND: ping');
                sendText({text: config.messages.commands.ping, reply_id: note_id, visibility: visibility, ignoreNG: true});
                return;
            }
            m = text.match(/^\/info$/);
            if (m) { // C: info
                console.log('COMMAND: info');
                psql.query('SELECT learned, count(learned) FROM oishii_table GROUP BY learned').then(res => {
                    const fl = res.rows[0].count;
                    const tl = res.rows[1].count;
                    const all = Number(fl) + Number(tl);
                    const text = `Records: ${all.toString()} (Learned: ${tl})`;
                    console.log(`INFO: [ ${text} ]`);
                    sendText({text: text, reply_id: note_id, visibility: visibility, ignoreNG: true});
                });
                return;
            }
            m = text.match(/^\/follow$/);
            if (m) { // C: follow
                console.log('COMMAND: follow');
                commandPost.id = note_id;
                commandPost.visibility = visibility;
                ws.send(JSON.stringify({
                    type: 'api',
                    body: {
                        id: 'ae2a63d4-7e17-41e1-b58c-f960becaab03',
                        endpoint: 'following/create',
                        data: {
                            userId: json.body.body.userId
                        }
                    }
                }));
                followCount++;
                console.log(`Now Following: ${followCount}`);
                return;
            }
            m = text.match(/^\/unfollow$/);
            if (m) { // C: unfollow
                console.log('COMMAND: unfollow');
                commandPost.id = note_id;
                commandPost.visibility = visibility;
                ws.send(JSON.stringify({
                    type: 'api',
                    body: {
                        id: '8a06d0ae-b801-483b-9dc5-540865b348c9',
                        endpoint: 'following/delete',
                        data: {
                            userId: json.body.body.userId
                        }
                    }
                }));
                followCount--;
                console.log(`Now Following: ${followCount}`);
                return;
            }
            m = text.match(/^\/say$/);
            if (m) { // C: say
                console.log('COMMAND: say');
                if (json.body.body.user.username === 'kabo') {
                    sayFood();
                } else {
                    sendText({text: config.messages.commands.denied, reply_id: note_id, visibility: visibility, ignoreNG: true});
                }
                return;
            }
            m = text.match(/^\/delete (.+)$/);
            if (m) { // C: delete
                console.log('COMMAND: delete');
                if (json.body.body.user.username === 'kabo') {
                    const query = {
                        text: 'DELETE FROM oishii_table WHERE name in (SELECT name FROM oishii_table WHERE LOWER(name) = LOWER($1) LIMIT 1)',
                        values: [m[1]]
                    };
                    psql.query(query)
                    .then(res => {
                        if (res.rowCount > 0) {
                            sendText({text: config.messages.commands.delete.done(res.rowCount), reply_id: note_id, visibility: visibility, ignoreNG: true});
                            console.log(`DELETE: ${m[1]}`);
                        } else {
                            sendText({text: config.messages.commands.delete.notFound, reply_id: note_id, visibility: visibility, ignoreNG: true});
                            console.log('DELETE: NOT FOUND.');
                        }
                    });
                } else {
                    sendText({text: config.messages.commands.denied, reply_id: note_id, visibility: visibility, ignoreNG: true});
                }
                return;
            }
            m = text.match(/^\/chart$/);
            if (m) { // C: chart
                console.log('COMMAND: chart');
                (async () => {
                    const query = {
                        text: 'SELECT COUNT(good = true AND learned = false OR NULL) as TF, COUNT(good = false AND learned = false OR NULL) as FF, COUNT(good = true AND learned = true OR NULL) as TT, COUNT(good=false AND learned=true OR NULL) as FT from oishii_table'
                    };
                    psql.query(query).then(res => {
                        const data = {
                            TF: Number(res.rows[0].tf),
                            FF: Number(res.rows[0].ff),
                            TT: Number(res.rows[0].tt),
                            FT: Number(res.rows[0].ft)
                        };
                        return genChart(1024, 1024, data);
                    }).then(image => {
                        const date = new Date();
                        return fileUpload(image, `${date.getFullYear}-${date.getMonth + 1}-${date.getDate}-${date.getHours}-${date.getMinutes}-${date.getSeconds}.png`, 'image/png');
                    }).then(res => {
                        sendText({text: 'test', ignoreNG: true, files: [ res ]});
                    });
                    return;
                });
            }

            // Text
            m = text.match(`(.+)(は|って)(${config.variables.food.good}|${config.variables.food.bad})の?[？?]+`);
            if (m) { // check
                (async () => {
                    const text = replaceSpace(m[1]);
                    // NGWords
                    if (isNGWord(text)) {
                        sendText({text: config.messages.food.ngword, reply_id: note_id, visibility: visibility, ignoreNG: true});
                        console.log(`NG WORD: ${findNGWord(text)}`);
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
                                    sendText({text: config.messages.food.idk, reply_id: note_id, visibility: visibility, ignoreNG: true});
                                } else {
                                    sendText({text: config.messages.food.canEat, reply_id: note_id, visibility: visibility, ignoreNG: true});
                                }
                            });
                            return;
                        }
                        const isGood = res.rows[0].good;
                        const goodS = isGood ? config.messages.food.good : config.messages.food.bad;
                        console.log(`CHECK: ${text}`);
                        sendText({text: goodS, reply_id: note_id, visibility: visibility, ignoreNG: true});
                    })
                    .catch(e => console.log(e));
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
            m = text.match(`(.+)[はも](${config.variables.food.good}|${config.variables.food.bad})よ?[！!]*`);
            if (m) { // learn
                (async () => {
                    const text = replaceSpace(m[1]);
                    // NGWords
                    if (isNGWord(text)) {
                        sendText({text: config.messages.food.ngword, reply_id: note_id, visibility: visibility, ignoreNG: true});
                        console.log(`NG WORD: ${findNGWord(text)}`);
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
            m = text.match(/お?(腹|(な|にゃ)か|はら)が?([空すあ]い|([減へ][っり]))た?[！!]*/);
            if (m) { // hungry
                (async () => {
                    const search_query = {
                        text: 'SELECT (name, good) FROM oishii_table WHERE good=true ORDER BY RANDOM() LIMIT 1'
                    };
                    if (Math.random() < 0.4) search_query.text = 'SELECT (name, good) FROM oishii_table WHERE good=false ORDER BY RANDOM() LIMIT 1';
                    psql.query(search_query)
                        .then(res => {
                            // console.dir(res);
                            const row = res.rows[0].row;
                            console.log(`row: ${row}`);
                            const re = /\((.+),([tf])\)/;
                            const name = row.match(re)[1].replace(/"(.+)"/, '$1');
                            const good = row.match(re)[2] === 't' ? true : false;
                            // const text = `${name} とかどう？\n${good === 't' ? config.messages.food.good : config.messages.food.bad}よ`;
                            console.log(`HUNGRY: ${name} (${good})`);
                            sendText({text: config.messages.food.hungry(name, good), reply_id: note_id, visibility: visibility});
                        })
                        .catch(e => console.error(e.stack));
                })();
                return;
            }
            // option
            text = toHiragana(text);
            m = text.match(/^\s*[@＠]?ぴざ\s*$/);
            if (m) { // pizza
                console.log('COMMAND: PIZZA');
                sendText({text: pizzaText, reply_id: note_id, visibility: (visibility !== 'public' ? visibility : 'home'), ignoreNG: true});
                return;
            }
            m = text.match(/^\s*お?(寿司|すし)を?(握|にぎ)(って|れ)/);
            if (m) { // sushi
                console.log('COMMAND: sushi');
                // 1～10個
                const _t = config.messages.food.sushi(Math.floor(Math.random() * 10) + 1);
                sendText({text: _t, reply_id: note_id, visibility: visibility, ignoreNG: true});
                return;
            }
            m = text.match(/^\s*((何|(な|にゃ)に|(な|にゃ)ん)か)?[食た]べる?(物|もの)(くれ|ちょうだい|頂戴|ください)/);
            if (m) { // food
                console.log('COMMAND: food');
                // 1～5個
                const num = Math.floor(Math.random() * 5) + 1;
                let _t = '';
                for (let i = 0; i < num; i++) {
                    _t += getWord(config.messages.food.food);
                }
                sendText({text: _t, reply_id: note_id, visibility: visibility, ignoreNG: true});
                return;
            }
            m = text.match(/^\s*ぬるぽ\s*$/);
            if (m) { // nullpo
                console.log('COMMAND: NULLPO');
                sendText({text: config.messages.commands.nullpo, reply_id: note_id, visibility: visibility, ignoreNG: true});
                return;
            }
        }
    }
});

setInterval(() => {
    sayFood();
}, ms(`${(process.env.INTERVAL_MIN || 60)}m`));

setInterval(() => {
    // console.log(limit);
    limit = 0;
}, ms(`${config.variables.post.rateLimitSec}s`));

// 1時間毎にフォロー数を取得
setInterval(() => {
    ws.send(JSON.stringify(followSendData));
}, ms('1h'));


function sayFood() {
    if (limit > config.variables.post.rateLimitPost - 1) return;
    const query = {
        text: 'SELECT (name, good) FROM oishii_table ORDER BY RANDOM() LIMIT 1'
    };
    if (Math.random() < 0.2) query.text = 'SELECT (name, good) FROM oishii_table WHERE learned=true ORDER BY RANDOM() LIMIT 1';
    psql.query(query)
        .then(res => {
            // console.log(res);
            const row = res.rows[0].row;
            console.log(`row: ${row}`);
            const re = /\((.+),([tf])\)/;
            const name = row.match(re)[1].replace(/"(.+)"/, '$1');
            const good = row.match(re)[2] === 't' ? true : false;
            const text = config.messages.food.say(name, good);
            console.log(`POST: ${text}`);
            sendText({text: text});
        })
        .catch(e => console.error(e.stack));
    limit++;
}

function sendText({text, reply_id, visibility = 'public', user_id, ignoreNG = false, files}) {
    const _t = text.replace(/\\\\/g, '\\');
    if (!ignoreNG) {
        if (isNGWord(_t)) {
            console.log(`Post Canceled: NG Word (${findNGWord(_t)})`);
            return;
        }
    }
    const sendData = {
        type: 'api',
        body: {
            id: uuid(),
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
    if (files) {
        sendData.body.data.fileIds = files;
    }
    ws.send(JSON.stringify(sendData));
}

async function fileUpload(file, filename, contentType) {
    const res = await request.post({
        url: `https://${process.env.MISSKEY_URL}/api/drive/files/create`,
        formData: {
            i: process.env.API_KEY,
            file: {
                value: file,
                options: {
                    filename: filename,
                    contentType: contentType
                }
            }
        },
        json: true
    });
    return res;
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

function excludeNGWord(str) {
    let text = toHiragana(str.toLowerCase());
    ExcludedWords.forEach(w => {
        text = text.replace(w, '');
    });
    return text;
}

function isNGWord(str) {
    const text = excludeNGWord(str);
    return NGWords.some(ng => text.match(ng));
}

function findNGWord(str) {
    const text = excludeNGWord(str);
    return NGWords.find(ng => text.match(ng));
}
