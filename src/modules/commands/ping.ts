import { Bot } from '../../bot.js';
import messages from '../../messages.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';

export default class extends Module {
    Name = 'Ping';
    Regex = /^\/ping$/i;
    LogName = 'PING';

    Run(_bot: Bot, note: Note): void {
        note.reaction();
        const time = Date.now() - note.note.createdAt.getTime() - 1000;
        note.reply({ text: messages.commands.ping(time) });
    }
}
