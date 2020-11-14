import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'NG Word';
    Regex = /^\/ng (a|r) (.+)$/i;
    LogName = 'NGWD';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply(messages.commands.denied);
            return;
        }

        const match = note.note.text.match(this.Regex);
        if (!match) return;

        const add = match[1] === 'a' ? true : false;
        const word = match[2];

        if (add) {
            const ngRes = bot.ngWords.addNGWord(word);
            const exRes = bot.ngWords.removeExcludedWord(word);
            note.reply(messages.commands.ngWord.add(ngRes, exRes));
        } else {
            // Remove
            const ngRes = bot.ngWords.removeNGWord(word);
            const exRes = bot.ngWords.addExcludedWord(word);
            note.reply(messages.commands.ngWord.remove(ngRes, exRes));
        }
    }
}
