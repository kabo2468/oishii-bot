import { Bot } from '../bot.js';
import { Note } from '../misskey/note.js';
import Module from '../module.js';
import { chooseOneFromArr } from '../utils/cofa.js';
import { getNouns } from '../utils/get-nouns.js';
import variables from '../variables.js';

export default class extends Module {
    Name = 'TL Reaction';
    Regex = /.+/;
    LogName = 'TLRC';

    async Run(bot: Bot, note: Note): Promise<void> {
        // Local === null
        if (note.note.user.host !== null && note.note.user.instance?.softwareName !== 'misskey') {
            this.log('Not Misskey');
            return;
        }

        const foods = variables.food.foods;

        const nouns = await getNouns(note.text, bot.config.mecab);
        const foundFood = foods.filter((food) => food.keywords.some((keyword) => nouns.includes(keyword)));

        if (foundFood.length === 0) return;

        const reactEmoji = chooseOneFromArr(foundFood).emoji;

        note.reaction(reactEmoji);
        this.log(`Reacted: ${reactEmoji}`);
    }
}
