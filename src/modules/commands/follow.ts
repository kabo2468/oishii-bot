import { Bot } from '../../bot';
import API from '../../misskey/api';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Follow';
    Regex = /^\/follow|フォロー|フォロバ$/i;

    Run(bot: Bot, note: Note): void {
        this.log(`${note.note.user.username} (${note.note.userId})`);
        void API.api('following/create', {
            userId: note.note.userId,
        });
    }
}
