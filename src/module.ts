import { Bot } from './bot.js';
import { Note } from './misskey/note.js';

export default abstract class Module {
    abstract readonly Name: string;
    abstract readonly Regex: RegExp;
    abstract readonly LogName: string;

    abstract Run(bot: Bot, note?: Note | string): void;

    protected log(text?: string, ...arg: string[]): void {
        console.log(`[${this.LogName}]`, text, ...arg);
    }
}
