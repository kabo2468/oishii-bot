import { readFileSync, writeFileSync } from 'fs';
import { Bot } from '../../bot';
import messages from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';
import { User, Valentine } from '../valentine';

export default class extends Module {
    Name = 'Valentine Migrate';
    Regex = /^\/vlmg$/;
    LogName = 'VLMG';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply({ text: messages.commands.denied });
            return;
        }

        const fileName = './valentine.json';
        const file = readFileSync(fileName, { encoding: 'utf8' });
        const json = JSON.parse(file) as OldValentine;
        const newJson = {} as Valentine;

        for (const key of Object.keys(json)) {
            const year = Number(key);
            const users = json[year];

            const newUsers: User[] = await migrateUsers(bot, users);

            newJson[year] = newUsers;
        }

        const textJson = JSON.stringify(newJson);
        writeFileSync(fileName, textJson);
        note.reply({ cw: 'ok', text: `\`\`\`\n${textJson}\n\`\`\`` });
    }
}

function migrateUsers(bot: Bot, users: OldUser[]) {
    const promises = users.map(async (user) => {
        const match = user.id.match(/@([^@]+)/g) || [];
        const userInfo = {
            name: match[0].substr(1),
            host: match[1] ? match[1].substr(1) : null,
        };
        const userId: string = await bot.api
            .call('users/show', {
                username: userInfo.name,
                host: userInfo.host,
            })
            .then((res) => res.json())
            .then((json) => json.id);
        return { ...user, id: userId, username: user.id };
    });
    return Promise.all(promises);
}

interface OldValentine {
    [k: number]: OldUser[];
}

interface OldUser {
    id: string;
    received: number;
    gave: number;
}
