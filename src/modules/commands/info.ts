import { Bot } from '../../bot';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Info';
    Regex = /^\/info$/i;

    async Run(bot: Bot, note: Note): Promise<void> {
        const res = await bot.runQuery<string>({ text: 'SELECT learned, count(learned) FROM oishii_table GROUP BY learned' });

        const fl = res.rows[0].count;
        const tl = res.rows[1].count;
        const all = Number(fl) + Number(fl);
        const text = `Records: ${all.toString()} (Learned: ${tl})`;
        this.log('Text:', text);
        note.reply(text);
    }
}
