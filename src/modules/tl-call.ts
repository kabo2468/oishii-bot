import type { Bot } from '../bot.js';
import type { Note } from '../misskey/note.js';
import Module from '../module.js';

export default class extends Module {
  Name = 'TL Call';
  Regex = /おいしい(Bot|ぼっと|ボット)/i;
  LogName = 'TLCL';

  Run(_bot: Bot, note: Note): void {
    note.reaction('🙌');
    this.log('Called!');
  }
}
