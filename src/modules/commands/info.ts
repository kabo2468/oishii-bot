import { readFileSync } from 'fs';
import ms from 'ms';
import { Bot } from '../../bot';
import { Note } from '../../misskey/note';
import Module from '../../module';

export default class extends Module {
    Name = 'Info';
    Regex = /^\/info$/i;
    LogName = 'INFO';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        const text: string[] = [];

        const res = await bot.runQuery({ text: 'SELECT learned, count(learned) FROM oishii_table GROUP BY learned' });

        // Records
        const fl = Number(res.rows[0].count);
        const tl = Number(res.rows[1].count);
        const all = fl + tl;
        const recordText = `Records: ${all} (Learned: ${tl})`;
        this.log(recordText);
        text.push(recordText);

        // Commit Hash
        const rev = readFileSync('.git/HEAD').toString();
        const branchHash = readFileSync('.git/' + rev.substring(5).trim())
            .toString()
            .trim();
        const hash = rev.indexOf(':') === -1 ? rev : branchHash;
        const hashText = `Commit hash: ${hash.substring(0, 7)}`;
        this.log(hashText);
        text.push(hashText);

        // uptime
        const uptime = process.uptime();
        const time = ms(uptime * 1000);
        const uptimeText = `Uptime: ${time}`;
        this.log(uptimeText);
        text.push(uptimeText);

        note.reply(text.join('\n'));
    }
}
