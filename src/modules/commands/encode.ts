import { Bot } from '../../bot.js';
import messages from '../../messages.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';

export default class extends Module {
    Name = 'Encode';
    Regex = /^\/encode$/i;
    LogName = 'ENCD';

    Run(bot: Bot, note: Note): void {
        note.reaction();
        if (bot.config.ownerIds.includes(note.note.userId)) {
            const nowMode = bot.encodeMode;
            bot.encodeMode = !nowMode;

            const text = messages.commands.encode(!nowMode);
            note.reply({ text });
        } else {
            note.reply({ text: messages.commands.denied });
        }
    }
}
