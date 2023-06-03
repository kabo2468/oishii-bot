import { Bot } from '../bot.js';
import messages from '../messages.js';
import { Note } from '../misskey/note.js';
import Module from '../module.js';

export default class extends Module {
    Name = 'Sushi';
    Regex = /\s*お?(寿司|すし)を?(握|にぎ)(って|れ)/;
    LogName = 'SUSH';

    Run(bot: Bot, note: Note): void {
        note.reaction();

        // 1 ~ 10
        const num = Math.floor(Math.random() * 10) + 1;
        this.log('Count:', String(num));
        const _s = messages.food.sushi(num);
        note.reply({ text: _s });
    }
}
