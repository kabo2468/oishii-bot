import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Help';
    Regex = /^\/help$/i;

    Run(bot: Bot, note: Note): void {
        note.reaction();

        const _t = messages.commands.help.join('\n');
        note.reply(`\`\`\`\n${_t}\n\`\`\``);
    }
}
