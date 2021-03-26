import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';

export default class extends Module {
    Name = 'TL Pizza';
    Regex = new RegExp(/^[@＠](ピザ|ぴざ)$/);
    LogName = 'TLPZ';

    Run(bot: Bot, note: Note): void {
        this.log('Run');
        note.reaction();
        if (note.note.replyId !== null) return;
        const visibility = note.note.visibility !== 'public' ? note.note.visibility : 'home';
        note.reply({ text: messages.pizza.toText(), visibility });
        return;
    }
}
