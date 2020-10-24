import { Bot } from '../bot';
import Module from '../module';
import { Note } from '../misskey/note';
import messages from '../messages';

export default class extends Module {
    Name = 'TL Pizza';
    Regex = new RegExp(/^[@＠](ピザ|ぴざ)$/);

    Run(bot: Bot, note: Note): void {
        if (note.note.replyId !== null) return;
        console.log('TL: PIZZA');
        const visibility = note.note.visibility !== 'public' ? note.note.visibility : 'home';
        note.reply(messages.pizza.toText(), visibility);
        return;
    }
}
