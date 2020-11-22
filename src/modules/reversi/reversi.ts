import { fork } from 'child_process';
import { Bot } from '../../bot';
import { Options } from 'misskey-reversi';

export default async function Ready(bot: Bot, userId: string): Promise<void> {
    const game = await bot.api
        .call('games/reversi/match', {
            userId,
        })
        .then((res) => res.json())
        .then((json) => {
            console.log(json);
            return json;
        });

    let map = game.map;
    const options: Options = {
        canPutEverywhere: game.canPutEverywhere,
        isLlotheo: game.isLlotheo,
        loopedBoard: game.loopedBoard,
    };

    const channelId = `reversiMatch-${userId}`;
    bot.connectChannel('gamesReversiGame', channelId, {
        gameId: game.id,
    });
    setTimeout(() => {
        wsSend('accept');
    }, 3000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchListener = (data: MessageEvent<any>): void => {
        console.log(data.data);

        const json = JSON.parse(data.data) as Res;
        // console.log(json.body.body);

        switch (json.body.body.key) {
            case 'bw':
                break;
            case 'canPutEverywhere':
                options.canPutEverywhere = json.body.body.value;
                break;
            case 'isLlotheo':
                options.isLlotheo = json.body.body.value;
                break;
            case 'loopedBoard':
                options.loopedBoard = json.body.body.value;
                break;
            case 'map':
                map = json.body.body.value;
                break;
        }
    };
    bot.ws.addEventListener('message', matchListener);
    const back = fork(`${__dirname}/back`);
    back.send({
        type: 'init',
        body: {
            game,
            map,
            options,
        },
    });

    back.on('message', (message: Record<string, unknown>) => {
        if (message.type == 'put') {
            wsSend('set', {
                pos: message.pos,
            });
        } else if (message.type == 'ended') {
            bot.ws.removeEventListener('message', matchListener);
            bot.disconnectChannel('gamesReversiGame');
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
