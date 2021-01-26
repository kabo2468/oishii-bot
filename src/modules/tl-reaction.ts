import { Bot } from '../bot';
import { chooseOneFromArr } from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';
import variables from '../variables';

export default class extends Module {
    Name = 'TL Reaction';
    Regex = /.+/;
    LogName = 'TLRC';

    Run(bot: Bot, note: Note): void {
        const foods = variables.food.foods;

        const foundFood = foods.filter((food) => food.keywords.some((keyword) => note.note.text.indexOf(keyword) !== -1));

        if (foundFood.length === 0) return;

        const reactEmoji = chooseOneFromArr(foundFood).emoji;

        note.reaction(reactEmoji);
        this.log(`Reacted: ${reactEmoji}`);
    }
}
