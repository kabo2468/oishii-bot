import { Bot } from '../bot';
import { Note } from '../misskey/note';
import Module from '../module';
import { TextProcess } from '../utils/text-process';

export default class extends Module {
    Name = 'TL Learn';
    Regex = /.+/;
    LogName = 'TLLN';

    async Run(bot: Bot, note: Note): Promise<void> {
        const text = new TextProcess(note.note.text);
        this.log('Text:', new TextProcess(note.note.text).replaceNewLineToText().toString());

        const nouns = await text.getNouns();
        if (nouns.length < 1) {
            this.log('Nouns not found.');
            return;
        }
        const food = nouns[Math.floor(Math.random() * nouns.length)].surface_form;

        const isExists = await bot.existsFood(food);
        if (isExists) {
            this.log(food, 'is skipped.');
        } else {
            const good = Math.random() < 0.8;
            bot.addFood(food, good);
            this.log('INSERT:', `${food} (${good})`);
        }
    }
}
