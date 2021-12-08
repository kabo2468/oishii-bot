import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';
import { TextProcess } from '../../utils/text-process';

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

        const match = note.text.match(this.Regex);
        if (!match) return;
        const user = new TextProcess(match[1]).removeSpace().toString();
        const learnedOnly = new TextProcess(match[2]).removeSpace().toString() === 'true';

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
