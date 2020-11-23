import { fork } from 'child_process';
import { Bot } from '../../bot';

export default async function (bot: Bot, userId: string): Promise<void> {
    const game = await bot.api
        .call('games/reversi/match', {
            userId,
        })
        .then((res) => res.json());

    const channelId = `reversiMatch-${userId}-${Date.now()}`;
    bot.connectChannel('gamesReversiGame', channelId, {
        gameId: game.id,
    });
    setTimeout(() => {
        wsSend('accept');
    }, 1000);
    log(`Invited. (userId: ${userId})`);

    const genListener = (channelId: string) => {
        return function fn(data: { data: string }) {
            const json = JSON.parse(data.data) as Res;

            if (json.body.id !== channelId) return;

            if (json.body.type === 'watchers') return;

            if (json.body.type === 'started') {
                back.send({
                    type: 'started',
                    body: {
                        game: json.body.body,
                    },
                });
            }

            if (json.body.type === 'set') {
                back.send({
                    type: 'set',
                    body: json.body.body,
                });
            }

            if (json.body.type === 'ended') {
                back.send({
                    type: 'ended',
                });
                bot.ws.removeEventListener('message', fn);
            }
        };
    };

    const listener = genListener(channelId);
    bot.ws.addEventListener('message', listener);

    const back = fork(`${__dirname}/back`);
    back.send({
        type: 'init',
        body: {
            game,
            account: bot.account,
        },
    });

    back.on('message', (message: Record<string, unknown>) => {
        if (message.type == 'put') {
            wsSend('set', {
                pos: message.pos,
            });
        } else if (message.type == 'ended') {
            log(`Match Ended. (userId: ${userId})`);
            bot.disconnectChannel(channelId);
        }
    });

    function wsSend(type: string, body?: Record<string, unknown>) {
        bot.ws.send(
            JSON.stringify({
                type: 'ch',
                body: {
                    id: channelId,
                    type,
                    body,
                },
            })
        );
    }

    function log(text?: string, ...arg: string[]): void {
        console.log('[RVST]', text, ...arg);
    }
}

interface Res {
    type: string;
    body: Body;
}

interface Body {
    id: string;
    type: string;
    body: Setting;
}

interface Setting {
    key: string;
    value: string | string[] | boolean;
}
