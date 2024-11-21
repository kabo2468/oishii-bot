import { Bot } from '../../bot.js';
import messages from '../../messages.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';

export default class extends Module {
    Name = 'Help';
    Regex = /^\/help$/i;
    LogName = 'HELP';

    Run(_bot: Bot, note: Note): void {
        note.reaction();

        const _t = messages.commands.help.join('\n');
        note.reply({ text: `\`\`\`\n${_t}\n\`\`\`` });
    }
}
