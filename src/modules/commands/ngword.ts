import { Bot } from '../../bot.js';
import messages from '../../messages.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';

export default class extends Module {
    Name = 'NG Word';
    Regex = /^\/ng\s+((?:a|r)\s+.+|reload)$/i;
    LogName = 'NGWD';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply({ text: messages.commands.denied });
            return;
        }

        const text = note.text.trim();
        
        // Check for reload command
        if (/^\/ng\s+reload$/i.test(text)) {
            try {
                await bot.ngWords.reload();
                note.reply({ text: messages.commands.ngWord.reload.success });
            } catch (error) {
                console.error('[NGWord Reload] Error:', error);
                note.reply({ text: messages.commands.ngWord.reload.error });
            }
            return;
        }

        const match = /^\/ng\s+([ar])\s+(.+)$/i.exec(text);
        if (!match) return;

        const add = match[1].toLowerCase() === 'a';
        const word = match[2];

        if (add) {
            const ngRes = bot.ngWords.addNGWord(word);
            const exRes = bot.ngWords.removeExcludedWord(word);
            note.reply({ text: messages.commands.ngWord.add(ngRes, exRes) });
        } else {
            // Remove
            const ngRes = bot.ngWords.removeNGWord(word);
            const exRes = bot.ngWords.addExcludedWord(word);
            note.reply({ text: messages.commands.ngWord.remove(ngRes, exRes) });
        }
    }
}
