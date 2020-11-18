import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';

export default class extends Module {
    Name = 'Fortune';
    Regex = /占|うらな|運勢|おみくじ/;
    LogName = 'FRTN';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        const food = (await bot.getFood()).rows[0].name;
        if (!food) return;

        note.reply(messages.fortune(food));
    }
}
