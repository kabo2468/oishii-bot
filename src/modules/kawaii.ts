import type { Bot } from '../bot.js';
import type { Note } from '../misskey/note.js';
import Module from '../module.js';

export default class extends Module {
  Name = 'Kawaii';
  Regex = /かわいい|カワイイ|可愛い|kawaii/i;
  LogName = 'KWII';

  Run(_bot: Bot, note: Note): void {
    note.reaction('❤️');
  }
}
