import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';
import variables from '../variables';

export default class extends Module {
    Name = 'Search';
    Regex = new RegExp(`(みん(な|にゃ)の)?(${variables.food.good}|${variables.food.bad})(もの|物|の)は?(何|(な|にゃ)に)?`);
    LogName = 'SECH';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        const match = note.note.text.match(this.Regex);
        if (!match) return;

        const good = new RegExp(variables.food.good).test(match[3]);
        const learned = !!match[1];

        const res = await bot.getFood({ good, learned });
        const food = res.rows[0].name;
        if (!food) {
            note.reply(messages.food.idk);
            return;
        }
        this.log(`${food} (${good})`);
        note.reply(messages.food.search(food, good));
    }
}
