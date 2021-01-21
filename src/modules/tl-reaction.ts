import { Bot } from '../bot';
import { Note } from '../misskey/note';
import Module from '../module';

export default class extends Module {
    Name = 'TL Reaction';
    Regex = /.+/;
    LogName = 'TLRC';

    Run(bot: Bot, note: Note): void {
        note.reaction();
    }
}
