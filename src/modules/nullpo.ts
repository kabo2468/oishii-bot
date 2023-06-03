import { Bot } from '../bot.js';
import messages from '../messages.js';
import { Note } from '../misskey/note.js';
import Module from '../module.js';

export default class extends Module {
    Name = 'Nullpo';
    Regex = /ぬるぽ|ヌルポ|nullpo/i;
    LogName = 'NLPO';

    Run(bot: Bot, note: Note): void {
        note.reaction();
        note.reply({ text: messages.commands.nullpo });
    }
}
