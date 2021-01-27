import { Bot } from '../bot';
import { chooseOneFromArr } from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';
import { TextProcess } from '../utils/text-process';
import variables from '../variables';

export default class extends Module {
    Name = 'TL Reaction';
    Regex = /.+/;
    LogName = 'TLRC';

    async Run(bot: Bot, note: Note): Promise<void> {
        const foods = variables.food.foods;

        const wakachi = await new TextProcess(note.note.text).getWakachi();
        const foundFood = foods.filter((food) => {
            return food.keywords.some((keyword) => wakachi.includes(keyword));
        });

        if (foundFood.length === 0) return;

        const reactEmoji = chooseOneFromArr(foundFood).emoji;

        note.reaction(reactEmoji);
        this.log(`Reacted: ${reactEmoji}`);
    }
}
