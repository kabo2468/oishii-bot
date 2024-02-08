import { Bot } from '../../bot.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';
import Reversi from './reversi.js';

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
