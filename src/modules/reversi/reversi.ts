import { Bot } from '../../bot';
import messages from '../../messages';
import Module from '../../module';
import variables from '../../variables';

export default class extends Module {
    Name = 'Reversi';
    Regex = / /;
    LogName = 'RVRS';

    async Run(bot: Bot, userId: string): Promise<void> {
        const game = await bot.api
            .call('games/reversi/match', {
                userId,
            })
            .then((res) => res.json())
            .then((json) => {
                console.log(json);
                return json;
            });

        const channelId = `reversiMatch-${userId}`;
        bot.connectChannel('gamesReversiGame', channelId, {
            gameId: game.id,
        });
        const matchListener = (data: MessageEvent<unknown>): void => {
            console.log(data.data);
        };
        bot.ws.addEventListener('message', matchListener);
        bot.ws.removeEventListener('message', matchListener);
    }
}
