import { readFileSync } from 'fs';
import { Bot } from '../../bot';
import messages, { chooseOneFromArr } from '../../messages';
import { Note } from '../../misskey/note';
import Module from '../../module';
import variables from '../../variables';
import { Valentine } from '../valentine';

export default class extends Module {
    Name = 'White Day';
    Regex = /^\/setwhite$/;
    LogName = 'WHTD';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        if (!bot.config.ownerIds.includes(note.note.userId)) {
            note.reply({ text: messages.commands.denied });
            return;
        }

        const now = new Date();
        const whiteDayTime = new Date(now.getFullYear(), 2, 14, 12, 0, 0, 0).getTime() - now.getTime();
        if (whiteDayTime < 0) {
            note.reply({ text: 'White day is over' });
            return;
        } else {
            note.reply({ text: `White day's posts will start in ${whiteDayTime.toLocaleString()}ms` });
            this.log(`in ${whiteDayTime.toLocaleString()}ms`);
        }

        const fileName = './valentine.json';
        const file = readFileSync(fileName, { encoding: 'utf8' });
        const json = JSON.parse(file) as Valentine;

        const thisYearUsers = json[now.getFullYear()];
        for (let i = 0; i < thisYearUsers.length; i++) {
            const user = thisYearUsers[i];

            const count = user.gave;
            let presents = '';
            for (let j = 0; j < count; j++) {
                presents += chooseOneFromArr(variables.food.foods).emoji;
            }

            setTimeout(() => {
                bot.api.postText({ text: messages.food.whiteDay(user.username, presents), visibility: 'specified', visibleUserIds: [user.id] });
            }, whiteDayTime + 1000 * i);
        }
    }
}
