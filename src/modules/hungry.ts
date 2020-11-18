import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';

export default class extends Module {
    Name = 'Hungry';
    Regex = /お?(腹|(な|にゃ)か|はら)が?([空すあ]い|([減へ][っり]))た?/;
    LogName = 'HNGR';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        const _g = Math.random() < 0.4;

        const res = await bot.getFood({ good: _g });

        const food = res.rows[0].name;
        const good = res.rows[0].good;
        if (!food || good === undefined) {
            note.reply(messages.food.idk);
            return;
        }
        this.log(`Food: ${food} (${good})`);

        note.reply(messages.food.hungry(food, good));
    }
}
