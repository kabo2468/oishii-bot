import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';

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

        const match = note.note.text.match(this.Regex);
        if (!match) return;
        const food = match[1];

        const res = await bot.removeFood(food, true);
        if (res.rowCount > 0) {
            note.reply({ text: messages.commands.delete.done(res.rowCount) });
            this.log(food);
        } else {
            note.reply({ text: messages.commands.delete.notFound });
            this.log(food, 'Not found.');
        }
    }
}
