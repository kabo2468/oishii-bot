import { Bot } from '../../bot';
import { Note } from '../../misskey/note';
import Module from '../../module';
import Reversi from './reversi';

export default class extends Module {
    Name = 'Reversi';
    Regex = /リバーシ|オセロ|reversi|othello/i;
    LogName = 'RVRS';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction('👌');
        this.log('User:', note.note.userId);
        await bot.api.call('games/reversi/match', {
            userId: note.note.userId,
        });
        Reversi(bot, note.note.userId);
    }
}
