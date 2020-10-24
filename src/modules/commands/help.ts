import Module from '../../module';
import { Note } from '../../misskey/note';
import { Bot } from '../../bot';
import { messages } from '../../../config';

export default class extends Module {
    Name = 'Help';
    Regex = /^\/help$/i;

    Run(bot: Bot, note: Note): void {
        const _t = messages.commands.help.join('\n');
        note.reply(`\`\`\`\n${_t}\n\`\`\``);
    }
}
