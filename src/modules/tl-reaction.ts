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

        const foundFood = foods.filter((food) => food.keywords.includes(note.note.text));

        if (foundFood.length === 0) return;

        const postEmoji = chooseOneFromArr(foundFood).emoji;

        note.reaction(postEmoji);
    }
}
