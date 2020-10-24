import Module from '../../module';
import { Note } from '../../misskey/note';
import { Bot } from '../../bot';
import { messages } from '../../../config';

export default class extends Module {
    Name = 'Ping';
    Regex = /^\/ping$/i;

    Run(bot: Bot, note: Note): void {
        note.reply(messages.commands.ping);
    }
}
