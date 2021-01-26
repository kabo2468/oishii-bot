import { Bot } from '../bot';
import { Note } from '../misskey/note';
import Module from '../module';

export default class extends Module {
    Name = 'TL Call';
    Regex = /おいしい(Bot|ぼっと|ボット)/i;
    LogName = 'TLCL';

    Run(bot: Bot, note: Note): void {
        note.reaction('🙌');
        this.log('Called!');
    }
}
