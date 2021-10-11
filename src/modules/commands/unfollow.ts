import { Bot } from '../../bot';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Unfollow';
    Regex = /(^\/unfollow$)|フォロー解除/i;
    LogName = 'UNFL';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        this.log(`${note.note.user.username} (${note.note.userId})`);
        const ok = await bot.api.call('following/delete', {
            userId: note.note.userId,
        });
        this.log('OK:', String(ok));
    }
}
