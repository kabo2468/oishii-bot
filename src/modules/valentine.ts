import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Bot } from '../bot';
import messages from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';
import variables from '../variables';

export default class extends Module {
    Name = 'Valentine';
    Regex = /チョコ(レート)?を?(あげる|くれ|ちょうだい|頂戴|ください)/;
    LogName = 'VLNT';

    Run(bot: Bot, note: Note): void {
        note.reaction();

        const now = new Date();
        if (now.getMonth() !== 1 || now.getDate() !== 14) {
            note.reply({ text: messages.food.valentine.notToday });
            return;
        }

        const match = note.note.text.match(this.Regex);
        if (!match) return;

        const fileName = './valentine.json';
        if (!existsSync(fileName)) {
            const newJson: Valentine = {};
            newJson[now.getFullYear()] = [];
            writeFileSync(fileName, JSON.stringify(newJson));
        }
        const file = readFileSync(fileName, { encoding: 'utf8' });
        const json = JSON.parse(file) as Valentine;

        const thisYearUsers = json[now.getFullYear()];
        const user = thisYearUsers.find((user) => user.id === note.id);
        const isGive = match[2] === 'あげる';

        this.log(note.id, isGive ? 'gives' : 'receives');

        if (user) {
            // already exists
            if (isGive) {
                // user give
                if (user.gave < 1) {
                    // user first give
                    note.reply({ text: messages.food.valentine.receive.thx });
                } else {
                    //user more give
                    note.reply({ text: messages.food.valentine.receive.again });
                }
                user.gave++;
            } else {
                // user receive
                if (user.received < 1) {
                    // user first receive
                    note.reply({ text: messages.food.valentine.give.give(variables.food.chocolates) });
                } else {
                    // user more receive
                    note.reply({ text: messages.food.valentine.give.again(variables.food.chocolates) });
                }
                user.received++;
            }
            this.log(`Give: ${user.gave}, Receive: ${user.received}`);
        } else {
            // not yet
            const addUser: User = {
                username: note.id,
                id: note.note.userId,
                gave: 0,
                received: 0,
            };
            if (isGive) {
                // user first give
                note.reply({ text: messages.food.valentine.receive.thx });
                addUser.gave++;
            } else {
                // user first receive
                note.reply({ text: messages.food.valentine.give.give(variables.food.chocolates) });
                addUser.received++;
            }
            thisYearUsers.push(addUser);
            this.log('First time.');
        }

        writeFileSync(fileName, JSON.stringify(json));
    }
}

export interface Valentine {
    [k: number]: User[];
}

export interface User {
    username: string;
    id: string;
    received: number;
    gave: number;
}
