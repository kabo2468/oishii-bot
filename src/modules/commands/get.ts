import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';
import { TextProcess } from '../../utils/text-process';

export default class extends Module {
    Name = 'Get';
    Regex = /^\/get (.+)$/i;
    LogName = 'GETS';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply({ text: messages.commands.denied });
            return;
        }

        const match = note.text.match(this.Regex);
        if (!match) return;
        const food = new TextProcess(match[2]).removeSpace().toString();

        const res = await bot.getFood(food);
        if (res.rowCount > 0) {
            const row = res.rows[0];
            note.reply({ text: messages.commands.get.found(row) });
            this.log(`${row}`);
        } else {
            note.reply({ text: messages.commands.notFound });
            this.log(food, 'Not found.');
        }
    }
}
