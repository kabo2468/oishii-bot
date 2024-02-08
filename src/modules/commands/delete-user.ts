import { Bot } from '../../bot.js';
import messages from '../../messages.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';

export default class extends Module {
    Name = 'Delete User';
    Regex = /^\/deluser (.+) (false|true)$/i;
    LogName = 'DLUS';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply({ text: messages.commands.denied });
            return;
        }

        const match = RegExp(this.Regex).exec(note.text);
        if (!match) return;
        const user = match[1].trim();
        const learnedOnly = match[2].trim() === 'true';

        const res = await bot.removeFoodFromUserId(user, learnedOnly);
        const count = res.rowCount;
        if (count > 0) {
            const deletedFoods = res.rows.map((row) => row.name);
            note.reply({ cw: messages.commands.delete.done(count), text: `\`\`\`\n${deletedFoods.join('\n')}\n\`\`\`` });
            this.log(`${count} food(s) deleted: ${deletedFoods.join(', ')}`);
        } else {
            note.reply({ text: messages.commands.notFound });
            this.log(user, 'Not found.');
        }
    }
}
