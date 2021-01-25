import { Bot } from '../bot';
import messages, { chooseOneFromArr } from '../messages';
import { Note } from '../misskey/note';
import Module from '../module';
import variables from '../variables';

export default class extends Module {
    Name = 'Sushi';
    Regex = /\s*((何|(な|にゃ)に|(な|にゃ)ん)か)?[食た]べる?(物|もの)(くれ|ちょうだい|頂戴|ください)/;
    LogName = 'FOOD';

    Run(bot: Bot, note: Note): void {
        note.reaction();

        // 1 ~ 5
        const num = Math.floor(Math.random() * 5) + 1;
        this.log('Count:', String(num));
        let foods = '';
        for (let i = 0; i < num; i++) {
            foods += chooseOneFromArr(variables.food.foods).emoji;
        }
        note.reply({ text: messages.food.food(foods) });
    }
}
