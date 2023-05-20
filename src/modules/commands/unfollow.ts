import { Bot } from '../../bot.js';
import { Note } from '../../misskey/note.js';
import Module from '../../module.js';

export default class extends Module {
    Name = 'Unfollow';
    Regex = /(^\/unfollow$)|フォロー解除/i;
    LogName = 'UNFL';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        this.log(`${note.note.user.username} (${note.note.userId})`);
        const ok = await bot.api.call({
            endpoint: 'following/delete',
            body: {
                userId: note.note.userId,
            },
        });
        this.log('OK:', String(ok));
    }
}
