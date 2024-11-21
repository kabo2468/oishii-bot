import { Bot } from '../bot.js';
import messages from '../messages.js';
import { Note } from '../misskey/note.js';
import Module from '../module.js';

export default class extends Module {
    Name = 'TL Pizza';
    Regex = new RegExp(/^[@＠](ピザ|ぴざ)$/);
    LogName = 'TLPZ';

    Run(_bot: Bot, note: Note): void {
        this.log('Run');
        note.reaction();
        if (note.note.replyId !== null) return;
        const visibility = note.note.visibility !== 'public' ? note.note.visibility : 'home';
        note.reply({ text: messages.pizza.toText(), visibility });
    }
}
