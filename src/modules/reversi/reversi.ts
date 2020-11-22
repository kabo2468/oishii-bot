import { fork } from 'child_process';
import { Bot } from '../../bot';

export default async function (bot: Bot, userId: string): Promise<void> {
    const game = await bot.api
        .call('games/reversi/match', {
            userId,
        })
        .then((res) => {
            console.log(res);
            return res.json();
        });

    const channelId = `reversiMatch-${userId}-${Date.now()}`;
    bot.connectChannel('gamesReversiGame', channelId, {
        gameId: game.id,
    });
    setTimeout(() => {
        wsSend('accept');
    }, 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchListener = (data: MessageEvent<any>): void => {
        const json = JSON.parse(data.data) as Res;

        if (json.body.type === 'watchers') return;

        if (json.body.type === 'updateSettings') {
            log(`UpdateSetting: ${json.body.body.key} = ${json.body.body.value}`);
        }

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
        }
    };

    bot.ws.addEventListener('message', matchListener);

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
            log(`Match Ended. (${userId})`);
            bot.ws.removeEventListener('message', matchListener);
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
    user1: boolean;
    user2: boolean;
}

interface Body {
    id: string;
    type: string;
    body: MapSetting | BWSetting | LlotheoSetting | LoopedBoardSetting | CanPutEverywhereSetting;
}

interface MapSetting {
    key: 'map';
    value: string[];
}

interface BWSetting {
    key: 'bw';
    value: string;
}

interface LlotheoSetting {
    key: 'isLlotheo';
    value: boolean;
}

interface LoopedBoardSetting {
    key: 'loopedBoard';
    value: boolean;
}

interface CanPutEverywhereSetting {
    key: 'canPutEverywhere';
    value: boolean;
}
