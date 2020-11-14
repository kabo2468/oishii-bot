import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Delete';
    Regex = /^\/delete (.+)$/i;
    LogName = 'DELT';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply(messages.commands.denied);
            return;
        }

        const match = note.note.text.match(this.Regex);
        if (!match) return;
        const food = match[1];

        const query = {
            text: 'DELETE FROM oishii_table WHERE name in (SELECT name FROM oishii_table WHERE LOWER(name) = LOWER($1) LIMIT 1)',
            values: [food],
        };
        const res = await bot.runQuery(query);
        if (res.rowCount > 0) {
            note.reply(messages.commands.delete.done(res.rowCount));
            this.log(food);
        } else {
            note.reply(messages.commands.delete.notFound);
            this.log(food, 'Not found.');
        }
    }
}
