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

        const nouns = (await new TextProcess(note.note.text).getNouns()).map((noun) => noun.surface_form);
        const foundFood = foods.filter((food) => food.keywords.some((keyword) => nouns.includes(keyword)));

        if (foundFood.length === 0) return;

        const reactEmoji = chooseOneFromArr(foundFood).emoji;

        note.reaction(reactEmoji);
        this.log(`Reacted: ${reactEmoji}`);
    }
}
