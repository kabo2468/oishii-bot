import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';

export default class extends Module {
    Name = 'Nullpo';
    Regex = /ぬるぽ|ヌルポ|nullpo/i;
    LogName = 'NLPO';

    Run(bot: Bot, note: Note): void {
        note.reaction();
        note.reply(messages.commands.nullpo);
    }
}
