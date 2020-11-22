import { Bot } from '../../bot';
import { Note } from '../../misskey/note';
import Module from '../../module';
import Reversi from './reversi';

export default class extends Module {
    Name = 'Reversi';
    Regex = /リバーシ|オセロ|reversi|othello/i;
    LogName = 'RVRS';

    Run(bot: Bot, note: Note): void {
        note.reaction('👌');
        Reversi(bot, note.note.userId);
    }
}
