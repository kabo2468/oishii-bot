import { Bot } from '../../bot';
import API from '../../misskey/api';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Unfollow';
    Regex = /^\/unfollow|フォロー解除$/i;

    async Run(bot: Bot, note: Note): Promise<void> {
        this.log(`${note.note.user.username} (${note.note.userId})`);
        const ok = await API.api('/following/delete', {
            userId: note.note.userId,
        });
        this.log('OK:', String(ok));
    }
}
