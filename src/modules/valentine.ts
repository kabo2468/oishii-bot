import type { Bot } from '../bot.js';
import messages from '../messages.js';
import type { Note } from '../misskey/note.js';
import Module from '../module.js';

export default class extends Module {
  Name = 'Valentine';
  Regex = /チョコ(レート)?を?(あげる|くれ|ちょうだい|頂戴|ください)/;
  LogName = 'VLNT';

  async Run(bot: Bot, note: Note): Promise<void> {
    note.reaction();

    const now = new Date();
    if (now.getMonth() !== 1 || now.getDate() !== 14) {
      note.reply({ text: messages.food.valentine.notToday });
      return;
    }

    const match = RegExp(this.Regex).exec(note.text);
    if (!match) return;

    const year = now.getFullYear();
    const userId = note.note.userId;
    const acct = note.screenId;
    const isUserGives = match[2] === 'あげる';

    this.log(acct, isUserGives ? 'gives' : 'receives');

    const user = await bot.getValentineUser(userId, year);
    const num = Math.floor(Math.random() * 3) + 1;

    if (user) {
      if (isUserGives) {
        if (user.gave_to_bot < 1) {
          await note.reply({ text: messages.food.valentine.receive.thx });
        } else {
          await note.reply({ text: messages.food.valentine.receive.again });
        }
      } else {
        if (user.received_from_bot < 1) {
          await note.reply({ text: messages.food.valentine.give.first(num) });
        } else {
          await note.reply({ text: messages.food.valentine.give.again(num) });
        }
      }
    } else {
      if (isUserGives) {
        await note.reply({ text: messages.food.valentine.receive.thx });
      } else {
        await note.reply({ text: messages.food.valentine.give.first(num) });
      }
    }

    try {
      const updated = await bot.upsertValentineUser({
        userId,
        year,
        acct,
        gaveToBotIncrement: isUserGives ? 1 : 0,
        receivedFromBotIncrement: isUserGives ? 0 : 1,
      });
      if (updated) {
        this.log(
          `GaveToBot: ${updated.gave_to_bot}, ReceivedFromBot: ${updated.received_from_bot}`,
        );
      }
    } catch (error) {
      this.log(`Failed to upsert valentine user: ${error}`);
    }
  }
}
