import { Bot } from '../bot.js';
import { Note } from '../misskey/note.js';
import Module from '../module.js';

export default class extends Module {
    Name = 'TL Call';
    Regex = /おいしい(Bot|ぼっと|ボット)/i;
    LogName = 'TLCL';

    Run(bot: Bot, note: Note): void {
        note.reaction('🙌');
        this.log('Called!');
    }
}
