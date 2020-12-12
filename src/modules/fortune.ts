import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';
import { TextProcess } from '../utils/text-process';
import seedrandom from 'seedrandom';
import { measureMemory } from 'vm';

export default class extends Module {
    Name = 'Fortune';
    Regex = /占|うらな|運勢|おみくじ/;
    LogName = 'FRTN';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        const date = new Date();
        const rnd = seedrandom(`${note.note.userId}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)();

        await bot.runQuery({
            text: 'SELECT setseed($1)',
            values: [rnd],
        });
        const res = await bot.getFood();
        const food = res.rows[0].name;
        const good = res.rows[0].good;
        if (!food || good === undefined) return;

        const msg = messages.fortune.text(food, good, rnd);
        this.log(new TextProcess(msg).replaceNewLineToText().toString());
        note.reply({ text: msg, cw: messages.fortune.cw });
    }
}
