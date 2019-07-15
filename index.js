const kuromoji = require('kuromoji');
const WebSocket = require('ws');
const { Client } = require('pg');
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});

const ws = new WebSocket('wss://misskey.io/streaming');

const data = {
    type: "connect",
    body: {
        channel: "hybridTimeline",
        id: "timeline"
    }
};

ws.on('open', function() {
    console.log('Connected!');

    ws.send(JSON.stringify(data));
});

ws.addEventListener('close', function() {
    console.log('Disconnected!');
});

ws.addEventListener('message', function(data){
    console.log(JSON.parse(data.data).body.body.text);
});

/*
const builder = kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" });

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
