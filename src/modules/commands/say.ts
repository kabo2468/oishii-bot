import Module from '../../module';
import { Note } from '../../misskey/note';
import { Bot } from '../../bot';
import messages from '../../messages';

export default class extends Module {
    Name = 'Say';
    Regex = /^\/say$/i;

    Run(bot: Bot, note: Note): void {
        if (note.note.userId === bot.config.ownerUsername) {
            bot.sayFood();
        } else {
            note.reply(messages.commands.denied);
        }
    }
}
