import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Ping';
    Regex = /^\/ping$/i;

    Run(bot: Bot, note: Note): void {
        note.reaction();
        note.reply(messages.commands.ping);
    }
}
