import { Bot } from '../bot.js';
import messages from '../messages.js';
import { Note } from '../misskey/note.js';
import Module from '../module.js';
import variables from '../variables.js';

export default class extends Module {
    Name = 'Search';
    Regex = new RegExp(
        `(みん(な|にゃ)の)?(${variables.food.good}|${variables.food.bad})(もの|物|の)は?(何|(な|にゃ)に)?`,
    );
    LogName = 'SECH';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        const match = RegExp(this.Regex).exec(note.text);
        if (!match) return;

        const good = new RegExp(variables.food.good).test(match[3]);
        const learned = !!match[1];

        const res = await bot.getRandomFood({ good, learned });
        const food = res.rows[0].name;
        if (!food) {
            note.reply({ text: messages.food.idk });
            return;
        }
        this.log(`${food} (${good})`);
        note.reply({ text: messages.food.search(food, good) });
    }
}
