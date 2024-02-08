import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Bot } from '../bot.js';
import messages from '../messages.js';
import { Note } from '../misskey/note.js';
import Module from '../module.js';

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

        const match = RegExp(this.Regex).exec(note.text);
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
        const user = thisYearUsers.find((user) => user.id === note.note.userId);
        const isGive = match[2] === 'あげる';

        this.log(note.screenId, isGive ? 'gives' : 'receives');

        const num = Math.floor(Math.random() * 3) + 1;

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
                    note.reply({ text: messages.food.valentine.give.first(num) });
                } else {
                    // user more receive
                    note.reply({ text: messages.food.valentine.give.again(num) });
                }
                user.received++;
            }
            this.log(`Give: ${user.gave}, Receive: ${user.received}`);
        } else {
            // not yet
            const addUser: User = {
                username: note.screenId,
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
                note.reply({ text: messages.food.valentine.give.first(num) });
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

interface User {
    username: string;
    id: string;
    received: number;
    gave: number;
}
