import type { Bot } from '../bot.js';
import messages from '../messages.js';
import type { Note } from '../misskey/note.js';
import Module from '../module.js';

export default class extends Module {
  Name = 'Hungry';
  Regex = /お?(腹|(な|にゃ)か|はら)が?([空すあ]い|([減へ][っり]))た?/;
  LogName = 'HNGR';

  async Run(bot: Bot, note: Note): Promise<void> {
    note.reaction();

    const _g = Math.random() < 0.4;

    const row = await bot.getRandomFood({ good: _g });
    if (!row) {
      note.reply({ text: messages.food.idk });
      return;
    }
    this.log(`Food: ${row.name} (${row.good})`);

    note.reply({ text: messages.food.hungry(row.name, row.good) });
  }
}
