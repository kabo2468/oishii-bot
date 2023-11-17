import { Bot } from '../../bot.js';
import messages from '../../messages.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';

export default class extends Module {
    Name = 'Delete';
    Regex = /^\/del(ete)? (.+)$/i;
    LogName = 'DELT';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply({ text: messages.commands.denied });
            return;
        }

        const match = RegExp(this.Regex).exec(note.text);
        if (!match) return;
        const food = match[2].trim();

        const res = await bot.removeFood(food, false);
        if (res.rowCount > 0) {
            note.reply({ text: messages.commands.delete.done(res.rowCount) });
            this.log(food);
        } else {
            note.reply({ text: messages.commands.notFound });
            this.log(food, 'Not found.');
        }
    }
}
