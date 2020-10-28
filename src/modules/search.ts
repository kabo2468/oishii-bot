import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';
import variables from '../variables';

export default class extends Module {
    Name = 'Search';
    Regex = new RegExp(`(みん(な|にゃ)の)?(${variables.food.good}|${variables.food.bad})(もの|物|の)は?(何|(な|にゃ)に)?`);

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        const match = note.note.text.match(this.Regex);
        if (!match) return;

        const good = new RegExp(variables.food.good).test(match[3]);
        const addText = match[1] ? 'AND learned=true' : '';
        const query = {
            text: `SELECT name FROM oishii_table WHERE good=$1 ${addText} ORDER BY RANDOM() LIMIT 1`,
            values: [good],
        };

        const res = await bot.runQuery(query);
        const food = res.rows[0].name;
        if (!food) {
            note.reply(messages.food.idk);
            return;
        }
        this.log(`${food} (${good})`);
        note.reply(messages.food.search(food, good));
    }
}
