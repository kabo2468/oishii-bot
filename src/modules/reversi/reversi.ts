import { fork } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';
import { Bot } from '../../bot.js';
import { User } from '../../misskey/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const playingIds = new Set<string>();

export default async function (bot: Bot, userId: string): Promise<void> {
    if (playingIds.has(userId)) return;
    playingIds.add(userId);

    const game = await bot.api
        .call<ReversiMatch>('reversi/match', {
            userId,
        })
        .then((res) => res.body);

    const channelId = `reversiMatch-${userId}-${Date.now()}`;
    const gameId = game.id;
    bot.connectChannel('reversiGame', channelId, {
        gameId,
    });
    log(`Invited. (userId: ${userId})`);

    const genListener = (channelId: string) => {
        return function fn(data: ws.MessageEvent) {
            const json = JSON.parse(data.data.toString()) as Res;

            if (json.body.id !== channelId) return;

            if (json.body.type === 'watchers') return;

            if (json.body.type === 'canceled') {
                playingIds.delete(userId);
                back.send({
                    type: 'canceled',
                    body: json.body.body,
                });
                bot.ws.removeEventListener('message', function () {
                    return fn(data);
                });
            }

            if (json.body.type === 'started') {
                back.send({
                    type: 'started',
                    body: {
                        game: json.body.body.game,
                    },
                });
            }

            if (json.body.type === 'log') {
                back.send({
                    type: 'set',
                    body: json.body.body,
                });
            }

            if (json.body.type === 'ended') {
                playingIds.delete(userId);
                back.send({
                    type: 'ended',
                    body: json.body.body,
                });
                bot.ws.removeEventListener('message', fn);
            }
        };
    };

    const listener = genListener(channelId);
    bot.ws.addEventListener('message', listener);
    bot.ws.addEventListener('close', function () {
        playingIds.clear();
    });
    setTimeout(() => {
        wsSend('ready', true);
    }, 1000);

    const back = fork(`${__dirname}/back`);
    back.send({
        type: 'init',
        body: {
            game,
            config: bot.config,
        },
    });

    back.on('message', (message: Record<string, unknown>) => {
        if (message.type == 'put') {
            wsSend('putStone', {
                pos: message.pos,
                id: message.id,
            });
        } else if (message.type == 'ended') {
            log(`Match Ended. (userId: ${userId})`);
            playingIds.delete(userId);
            bot.disconnectChannel(channelId);
        }
    });

    function wsSend(type: string, body?: unknown) {
        const b = JSON.stringify({
            type: 'ch',
            body: {
                id: channelId,
                type,
                body,
            },
        });
        log('Send:', b);
        bot.ws.send(b);
    }

    function log(text?: string, ...arg: string[]): void {
        console.log('[RVST]', text, ...arg);
    }
}

export interface ReversiMatch {
    id: string;
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
    isStarted: boolean;
    isEnded: boolean;
    form1: any | null;
    form2: any | null;
    user1Ready: boolean;
    user2Ready: boolean;
    user1Id: string;
    user2Id: string;
    user1: User;
    user2: User;
    winnerId: string | null;
    winner: User | null;
    surrenderedUserId: string | null;
    timeoutUserId: string | null;
    black: 1 | 2;
    bw: string;
    isLlotheo: boolean;
    canPutEverywhere: boolean;
    loopedBoard: boolean;
    timeLimitForEachTurn: number;
    noIrregularRules: boolean;
    logs: number[][];
    map: string[];
}

interface Res {
    type: string;
    body: Body;
}

interface Body {
    id: string;
    type: string;
    body: { game: ReversiMatch };
}
