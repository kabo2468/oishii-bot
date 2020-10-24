import Module from '../module';
import { Note } from '../misskey/note';
import { Bot } from '../bot';
import variables from '../variables';
import { TextProcess } from '../utils/text-process';
import messages from '../messages';

export default class extends Module {
    Name = 'Check';
    Regex = new RegExp(`(.+)(は|って)(${variables.food.good}|${variables.food.bad})の?[？?]+`);

    async Run(bot: Bot, note: Note): Promise<void> {
        const match = this.Regex.exec(note.note.text);
        if (!match) return;
        const text = TextProcess.removeSpace(match[1]);

        const ng = note.findNGWord(bot.ngWords);
        if (ng) {
            note.reply(messages.food.ngWord);
            this.log('NG WORD:', ng);
            return;
        }

        const query = {
            text: 'SELECT good FROM oishii_table WHERE LOWER(name) = LOWER($1)',
            values: [text],
        };
        const res = await bot.runQuery(query);

        if (!res) return;

        void isNoun(text).then((isNoun) => {
            if (isNoun) {
                note.reply(messages.food.idk);
            } else {
                note.reply(messages.food.canEat);
            }
        });

        const isGood = res.rows[0].good;
        const goodText = isGood ? 'good' : 'bad';
        note.reply(goodText);
    }
}

async function isNoun(text: string): Promise<boolean> {
    console.log(`is_noun text: ${text}`);
    const nouns = await TextProcess.getNouns(text);
    return nouns ? true : false;
}
