import { extract as extractMfmNodes, toString as mfmNodesToString, parse as parseMfm } from 'mfm-js';
import { Bot } from '../bot.js';
import { Note } from '../misskey/note.js';
import Module from '../module.js';
import { chooseOneFromArr } from '../utils/cofa.js';
import { getNouns } from '../utils/get-nouns.js';
import { TextProcess } from '../utils/text-process.js';

export default class extends Module {
    Name = 'TL Learn';
    Regex = /.+/;
    LogName = 'TLLN';

    async Run(bot: Bot, note: Note): Promise<void> {
        const text = note.text;
        this.log(new TextProcess(text).replaceNewLineToText().toString());

        const mfmNodes = parseMfm(text);
        const noMfmNodes = extractMfmNodes(mfmNodes, (n) => ['text', 'unicodeEmoji', 'emojiCode'].includes(n.type));
        const textNodes = extractMfmNodes(noMfmNodes, (node) => node.type === 'text');
        const emojiNodes = extractMfmNodes(noMfmNodes, (node) => node.type === 'unicodeEmoji' || node.type === 'emojiCode');

        const textArr = textNodes.map((n) => (n.type === 'text' ? n.props.text.trim() : ''));
        const textStr = textArr.join('').trim();

        const emojisArr = emojiNodes.map((n) => {
            if (n.type === 'unicodeEmoji') return n.props.emoji;
            if (n.type === 'emojiCode') return `:${n.props.name}:`;
            return '';
        });

        const noMfmText = mfmNodesToString(noMfmNodes);
        this.log('No MFM Text:', new TextProcess(noMfmText).replaceNewLineToText().toString());

        const foods = [...(await getNouns(textStr, bot.config.mecab)), ...emojisArr];
        if (foods.length < 1) {
            this.log('Nouns not found.');
            return;
        }
        const food = chooseOneFromArr(foods);

        const isExists = await bot.existsFood(food);
        if (isExists) {
            this.log(food, 'is skipped.');
        } else {
            const good = Math.random() < 0.8;
            bot.addFood(food, good, false, note.note.userId, note.note.id);
            this.log('INSERT:', `${food} (${good})`);
        }
    }
}
