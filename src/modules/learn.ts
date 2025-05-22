import { Bot } from '../bot.js';
import messages from '../messages.js';
import { Note } from '../misskey/note.js';
import Module from '../module.js';
import variables from '../variables.js';

export default class extends Module {
    Name = 'Learn';
    Regex = new RegExp(`(.+?)[はも]?(${variables.food.good}|${variables.food.bad})よ?`);
    LogName = 'LERN';

    async Run(bot: Bot, note: Note): Promise<void> {
        note.reaction();

        const roles = note.note.user.roles;
        if (bot.config.denyRoleIds.some((id) => roles.some((role) => role.id === id))) {
            this.log('DENY:', roles.map((role) => role.name).join(', '));
            return;
        }

        if (note.note.visibility === 'specified') {
            this.log('SKIP(SPECIFIED):', note.note.id);
            return;
        }

        const ng = note.findNGWord(bot.ngWords);
        if (ng) {
            this.log('NG:', ng);
            note.reply({ text: messages.food.ngWord });
            return;
        }

        const match = RegExp(this.Regex).exec(note.text);
        if (!match) return;
        const food = match[1].trim();
        const good = new RegExp(variables.food.good).test(match[2]);

        const isExists = await bot.existsFood(food);
        if (isExists) {
            await bot.updateFood(food, good, true, note.note.userId, note.note.id, note.note.createdAt);
            this.log('UPDATE:', `${food} (${good})`);
        } else {
            await bot.addFood(food, good, true, note.note.userId, note.note.id);
            this.log('INSERT:', `${food} (${good})`);
        }
        note.reply({ text: messages.food.learn(food, match[2]) });
    }
}
