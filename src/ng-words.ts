import fs from 'fs';
import readline from 'readline';
import toHiragana from './utils/to-hiragana';

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

    excludeNGWord(str: string): string {
        let text = toHiragana(str.toLowerCase());
        this.excludedWords.forEach((w) => {
            text = text.replace(w, '');
        });
        return text;
    }

    public get get(): string[] {
        return this.ngWords;
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
