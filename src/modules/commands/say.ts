import { Bot } from '../../bot.js';
import messages from '../../messages.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';

export default class extends Module {
    Name = 'Say';
    Regex = /^\/say$/i;
    LogName = 'SAYS';

    Run(bot: Bot, note: Note): void {
        note.reaction();

        if (bot.config.ownerIds.includes(note.note.userId)) {
            bot.sayFood();
        } else {
            note.reply({ text: messages.commands.denied });
        }
    }
}
