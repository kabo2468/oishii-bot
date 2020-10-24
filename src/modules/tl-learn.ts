import { Bot } from '../bot';
import Module from '../module';
import { TextProcess } from '../utils/text-process';

export default class extends Module {
    Name = 'TL Learn';
    Regex = new RegExp(/.+/);

    async Run(bot: Bot, text: string): Promise<void> {
        //追加するもの
        const nouns = await TextProcess.getNouns(text);
        const addFood = nouns[Math.floor(Math.random() * nouns.length)].surface_form;

        bot.existsWord(addFood)
            .then((res) => {
                if (res) throw `${addFood} is skipped.`;
            })
            .then(() => {
                const isGood = Math.random() < 0.8;
                bot.addWord(addFood, isGood);
            })
            .catch((e) => {
                console.error(e);
            });
    }
}
