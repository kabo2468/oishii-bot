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
        const page = note.text.replace(match[0],"").trim().match(/^[0-9]{1,2}/);
        const res = await bot.getUserFoods(note.note.userId,page==null?0:Number.parseInt(page[0]));
        if (res.rowCount > 0) {
            let text = "";
            res.rows.forEach(item=>{
                text += item.name + (item.good?":美味しい\n":":まずい\n");
            });
            note.reply({text:text});
        } else {
            note.reply({ text: messages.commands.notFound });
        }
        return;
    }
}
    