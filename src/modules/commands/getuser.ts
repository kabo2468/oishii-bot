import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'GetUser';
    Regex = /^\/getuser ([\w\d]+)( \d+)?$/i;
    LogName = 'GETU';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply({ text: messages.commands.denied });
            return;
        }

        const match = note.text.match(this.Regex);
        if (!match) return;
        const userId = match[1];
        const page = match[2] ? Number(match[2].trim()) - 1 : 0;
        this.log(`userId: ${userId}, Page: ${page + 1}`);

        const count = (await bot.runQuery({ text: 'SELECT count("name") FROM oishii_table WHERE "userId" = $1', values: [userId] })).rows[0].count;
        const pageText = `Pages: ${page + 1} / ${Math.ceil(Number(count) / 10)}`;
        const res = await bot.getUserFoods(userId, page);
        if (res.rowCount > 0) {
            const text = res.rows.map((row) => `${row.name}: ${row.good ? messages.food.good : messages.food.bad}`).join('\n');
            note.reply({ text: `${pageText}\n\`\`\`\n${text}\n\`\`\`` });
        } else {
            note.reply({ text: messages.commands.notFound });
        }
    }
}
