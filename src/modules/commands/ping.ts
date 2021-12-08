import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Ping';
    Regex = /^\/ping$/i;
    LogName = 'PING';

    Run(bot: Bot, note: Note): void {
        note.reaction();
        const time = Date.now() - note.note.createdAt.getTime();
        note.reply({ text: messages.commands.ping(time) });
    }
}
