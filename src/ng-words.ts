import fs from 'fs';
import readline from 'readline';
import { toHalfWidth } from './utils/to-half-width.js';
import toHiragana from './utils/to-hiragana.js';

export default class NGWord {
    private excludedWords: string[] = [];
    private ngWords: string[] = [];

    constructor() {
        const rs = fs.createReadStream('ngwords.txt');
        const rl = readline.createInterface(rs);
        rl.on('line', (line) => {
            const word = toHiragana(line.trim().toLowerCase());
            if (word.startsWith('#')) return;
            if (word.startsWith('-')) {
                if (/な/g.test(word)) this.excludedWords.push(word.substring(1).replace(/な/g, 'にゃ'));
                this.excludedWords.push(word.substring(1));
            } else {
                if (/な/g.test(word)) this.ngWords.push(word.replace(/な/g, 'にゃ'));
                this.ngWords.push(word);
            }
        });
    }

    find(str: string): string | undefined {
        const text = toHiragana(toHalfWidth(str)).toLowerCase();
        // NGワード避けする文字を消す
        const removed = text.replaceAll(/[\s!#$%&*,-.=`+()'"/?\\^_|~:;、。ー×○●]/g, '').trim();
        const excluded = this.excludeAllowedWord(removed);
        return this.ngWords.find((ng) => excluded.indexOf(ng) !== -1);
    }

    excludeAllowedWord(str: string): string {
        let text = toHiragana(str.toLowerCase());
        this.excludedWords.forEach((w) => {
            text = text.replace(w, '');
        });
        return text;
    }

    addNGWord(str: string): boolean {
        const word = toHiragana(str.trim().toLowerCase());
        if (this.ngWords.some((ng) => word.includes(ng))) {
            return false;
        } else {
            this.ngWords.push(word);
            return true;
        }
    }

    removeNGWord(str: string): boolean {
        const word = toHiragana(str.trim().toLowerCase());
        if (this.ngWords.some((ng) => word.includes(ng))) {
            this.ngWords = this.ngWords.filter((ng) => ng !== word);
            return true;
        } else {
            return false;
        }
    }

    addExcludedWord(str: string): boolean {
        const word = toHiragana(str.trim().toLowerCase());
        if (this.excludedWords.some((ng) => word.includes(ng))) {
            return false;
        } else {
            this.excludedWords.push(word);
            return true;
        }
    }

    removeExcludedWord(str: string): boolean {
        const word = toHiragana(str.trim().toLowerCase());
        if (this.excludedWords.some((ng) => word.includes(ng))) {
            this.excludedWords = this.excludedWords.filter((e) => e !== word);
            return true;
        } else {
            return false;
        }
    }
}
