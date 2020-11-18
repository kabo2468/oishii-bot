import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';
import { TextProcess } from '../utils/text-process';

export default class extends Module {
    Name = 'Fortune';
    Regex = /占|うらな|運勢|おみくじ/;
    LogName = 'FRTN';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        const food = (await bot.getFood()).rows[0].name;
        if (!food) return;

        const msg = messages.fortune(food);
        this.log(new TextProcess(msg).replaceNewLineToText().toString());
        note.reply(msg);
    }
}
