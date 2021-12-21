import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';
import { TextProcess } from '../../utils/text-process';

export default class extends Module {
    Name = 'learned';
    Regex = /^\/learned (.+)$/i;
    LogName = 'learned';
    
    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();
        
        const match = note.text.match(this.Regex);
        if (!match) return;
        const page = match[1] ? Number(match[1]?.trim()) : 0;

        const res = await bot.getUserFoods(note.note.userId, page);
        if (res.rowCount > 0) {
            const text = res.rows.map((row) => `${row.name}: ${row.good ? messages.food.good : messages.food.bad}`).join('\n');
            note.reply({text:text});
        } else {
            note.reply({ text: messages.commands.notFound });
        }
        return;
    }
}
    