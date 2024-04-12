import { Bot } from '../../bot.js';
import messages from '../../messages.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';

export default class extends Module {
    Name = 'Delete All';
    Regex = /^\/delall (.+)$/i;
    LogName = 'DLAL';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply({ text: messages.commands.denied });
            return;
        }

        const match = RegExp(this.Regex).exec(note.text);
        if (!match) return;
        const food = match[1].trim();

        const res = await bot.removeFood(food, true);
        const count = res.rowCount;
        if (count && count > 0) {
            const deletedFoods = res.rows.map((row) => row.name);
            note.reply({ cw: messages.commands.delete.done(count), text: `\`\`\`\n${deletedFoods.join('\n')}\n\`\`\`` });
            this.log(`${count} food(s) deleted: ${deletedFoods.join(', ')}`);
        } else {
            note.reply({ text: messages.commands.notFound });
            this.log(food, 'Not found.');
        }
    }
}
