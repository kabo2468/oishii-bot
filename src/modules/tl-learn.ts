import { Bot } from '../bot';
import { Note } from '../misskey/note';
import Module from '../module';
import { TextProcess } from '../utils/text-process';

export default class extends Module {
    Name = 'TL Learn';
    Regex = new RegExp(/.+/);

    async Run(bot: Bot, note: Note): Promise<void> {
        const nouns = await TextProcess.getNouns(note.note.text);
        if (nouns.length < 1) return;
        const food = nouns[Math.floor(Math.random() * nouns.length)].surface_form;

        const isExists = await bot.existsFood(food);
        if (isExists) {
            const good = Math.random() < 0.8;
            bot.addFood(food, good);
            this.log('INSERT:', `${food} (${good})`);
        } else {
            this.log(food, 'is skipped.');
        }
    }
}
