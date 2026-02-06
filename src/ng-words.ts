import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Config } from './config.js';
import { toHalfWidth } from './utils/to-half-width.js';
import toHiragana from './utils/to-hiragana.js';

export default class NGWord {
    private excludedWords: string[] = [];
    private ngWords: string[] = [];
    private config?: Config;

    constructor(config?: Config) {
        this.config = config;
    }

    static async create(config?: Config): Promise<NGWord> {
        const instance = new NGWord(config);
        await instance.reload();
        return instance;
    }

    private parseLine(line: string): void {
        const word = toHiragana(line.trim().toLowerCase());
        if (!word || word.startsWith('#')) return;

        if (word.startsWith('-')) {
            const excludedWord = word.substring(1);
            if (/な/g.test(excludedWord)) this.excludedWords.push(excludedWord.replace(/な/g, 'にゃ'));
            this.excludedWords.push(excludedWord);
        } else {
            if (/な/g.test(word)) this.ngWords.push(word.replace(/な/g, 'にゃ'));
            this.ngWords.push(word);
        }
    }

    private async loadFromSource(source: string): Promise<void> {
        try {
            let content: string;

            if (source.startsWith('http://') || source.startsWith('https://')) {
                console.log(`[NGWords] Loading from URL: ${source}`);
                const response = await fetch(source);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                content = await response.text();
            } else {
                console.log(`[NGWords] Loading from file: ${source}`);
                const filePath = resolve(source);
                content = readFileSync(filePath, { encoding: 'utf-8' });
            }

            const lines = content.split('\n');
            for (const line of lines) {
                this.parseLine(line);
            }
            console.log(`[NGWords] Successfully loaded from: ${source}`);
        } catch (error) {
            console.error(`[NGWords] Failed to load from ${source}:`, error instanceof Error ? error.message : error);
        }
    }

    async reload(): Promise<void> {
        console.log('[NGWords] Initializing...');

        // Clear existing words
        this.excludedWords = [];
        this.ngWords = [];

        // Load default ngwords.txt
        try {
            const file = readFileSync('ngwords.txt', { encoding: 'utf-8' });
            const lines = file.split('\n');
            for (const line of lines) {
                this.parseLine(line);
            }
            console.log('[NGWords] Default ngwords.txt loaded');
        } catch (error) {
            console.error(
                '[NGWords] Failed to load default ngwords.txt:',
                error instanceof Error ? error.message : error,
            );
        }

        // Load additional sources from config
        if (this.config?.ngWordSources && this.config.ngWordSources.length > 0) {
            for (const source of this.config.ngWordSources) {
                await this.loadFromSource(source);
            }
        }

        // Remove duplicates
        this.ngWords = [...new Set(this.ngWords)];
        this.excludedWords = [...new Set(this.excludedWords)];

        console.log('[NGWords] Initialized.', {
            ngWords: this.ngWords.length,
            excludedWords: this.excludedWords.length,
        });
    }

    find(str: string): string | undefined {
        const text = toHiragana(toHalfWidth(str)).toLowerCase();
        // NGワード避けする文字を消す
        const removed = text.replaceAll(/[\s!#$%&*,-.=`+()'"/?\\^_|~:;、。×○●]/g, '').trim();
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
