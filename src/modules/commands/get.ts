import { Bot } from '../../bot.js';
import messages from '../../messages.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';
import { TextProcess } from '../../utils/text-process.js';

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
        const food = new TextProcess(match[1]).removeSpace().toString();

        const res = await bot.getFood(food);
        if (res.rowCount > 0) {
            const row = res.rows[0];
            note.reply({ text: messages.commands.get.found(row) });
            this.log(JSON.stringify(row));
        } else {
            note.reply({ text: messages.commands.notFound });
            this.log(food, 'Not found.');
        }
    }
}
