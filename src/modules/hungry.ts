import Module from '../module';
import { Note } from '../misskey/note';
import { Bot } from '../bot';
import messages from '../messages';

export default class extends Module {
    Name = 'Hungry';
    Regex = /お?(腹|(な|にゃ)か|はら)が?([空すあ]い|([減へ][っり]))た?/;

    Run(bot: Bot, note: Note): void {
        const _g = Math.random() < 0.4 ? 'true' : 'false';
        const query = `SELECT (name, good) FROM oishii_table WHERE good=${_g} ORDER BY RANDOM() LIMIT 1`;

        bot.runQuery<string>({ text: query }).then((res) => {
            const row = res.rows[0].row;
            this.log(`row: ${row}`);

            const match = row.match(/\((.+),([tf])\)/);
            if (!match) {
                // TODO: 何かあったほうが良いかも
                return;
            }
            const food = match[1].replace(/"(.+)"/, '$1');
            const good = match[2] === 't' ? true : false;
            this.log(`Food: ${food} (${good})`);

            note.reply(messages.food.hungry(food, good));
        });
    }
}
