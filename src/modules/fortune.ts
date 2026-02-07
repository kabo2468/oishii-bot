import seedrandom from 'seedrandom';
import type { Bot } from '../bot.js';
import messages from '../messages.js';
import type { Note } from '../misskey/note.js';
import Module from '../module.js';
import { replaceNewLineToText } from '../utils/replace-nl-to-text.js';

export default class extends Module {
  Name = 'Fortune';
  Regex = /占|うらな|運勢|おみくじ/;
  LogName = 'FRTN';

  async Run(bot: Bot, note: Note): Promise<void> {
    note.reaction();

    const date = new Date();
    const rnd = seedrandom(
      `${note.note.userId}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    )();

    await bot.setRandomSeed(rnd);
    const row = await bot.getRandomFood();
    if (!row) {
      note.reply({ text: messages.food.idk });
      return;
    }
    const { name: food, good } = row;

    const msg = messages.fortune.text(food, good, rnd);
    this.log(replaceNewLineToText(msg));
    note.reply({ text: msg, cw: messages.fortune.cw });
  }
}
