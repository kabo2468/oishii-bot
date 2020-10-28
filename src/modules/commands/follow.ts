import { Bot } from '../../bot';
import API from '../../misskey/api';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Follow';
    Regex = /^\/follow|フォロー|フォロバ$/i;

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        this.log(`${note.note.user.username} (${note.note.userId})`);
        const ok = await API.api('/following/create', {
            userId: note.note.userId,
        });
        this.log('OK:', String(ok));
    }
}
