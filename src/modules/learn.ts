import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';
import { TextProcess } from '../utils/text-process';
import variables from '../variables';

export default class extends Module {
    Name = 'Learn';
    Regex = new RegExp(`(.+?)[はも]?(${variables.food.good}|${variables.food.bad})よ?`);
    LogName = 'LERN';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (note.note.visibility === 'specified') {
            this.log('SKIP(SPECIFIED):', note.note.id);
            return;
        }

        const ng = note.findNGWord(bot.ngWords);
        if (ng) {
            note.reply({ text: messages.food.ngWord });
            return;
        }

        const match = note.text.match(this.Regex);
        if (!match) return;
        const food = new TextProcess(match[1]).removeSpace().toString();
        const good = new RegExp(variables.food.good).test(match[2]);

        const isExists = await bot.existsFood(food);
        if (isExists) {
            await bot.updateFood(food, good, true, note.note.userId, note.note.id, note.note.createdAt);
            this.log('UPDATE:', `${food} (${good})`);
        } else {
            await bot.addFood(food, good, true, note.note.userId, note.note.id);
            this.log('INSERT:', `${food} (${good})`);
        }
        note.reply({ text: messages.food.learn(food, match[2]) });
    }
}
