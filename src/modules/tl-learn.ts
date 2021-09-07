import { Bot } from '../bot';
import { Note } from '../misskey/note';
import Module from '../module';
import { chooseOneFromArr } from '../utils/cofa';
import { getNouns } from '../utils/get-nouns';
import { TextProcess } from '../utils/text-process';

export default class extends Module {
    Name = 'TL Learn';
    Regex = /.+/;
    LogName = 'TLLN';

    async Run(bot: Bot, note: Note): Promise<void> {
        const text = note.text;
        this.log(new TextProcess(text).replaceNewLineToText().toString());

        const nouns = await getNouns(text, bot.config.mecab);
        if (nouns.length < 1) {
            this.log('Nouns not found.');
            return;
        }
        const food = chooseOneFromArr(nouns);

        const isExists = await bot.existsFood(food);
        if (isExists) {
            this.log(food, 'is skipped.');
        } else {
            const good = Math.random() < 0.8;
            bot.addFood(food, good, false, note.note.userId, note.note.id);
            this.log('INSERT:', `${food} (${good})`);
        }
    }
}
