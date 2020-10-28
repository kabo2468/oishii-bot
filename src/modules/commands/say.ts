import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Say';
    Regex = /^\/say$/i;

    Run(bot: Bot, note: Note): void {
        note.reaction();

        if (note.note.userId === bot.config.ownerId) {
            bot.sayFood();
        } else {
            note.reply(messages.commands.denied);
        }
    }
}
