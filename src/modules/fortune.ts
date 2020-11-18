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

        const res = await bot.getFood();
        const food = res.rows[0].name;
        const good = res.rows[0].good;
        if (!food || good === undefined) return;

        const msg = messages.fortune(food, good);
        this.log(new TextProcess(msg).replaceNewLineToText().toString());
        note.reply(msg);
    }
}
