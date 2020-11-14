import { Note } from './misskey/note';
import { Bot } from './bot';

export default abstract class Module {
    abstract readonly Name: string;
    abstract readonly Regex: RegExp;
    abstract readonly LogName: string;

    abstract Run(bot: Bot, note?: Note): void;

    protected log(text?: string, ...arg: string[]): void {
        console.log(`[${this.LogName}]`, text, ...arg);
    }
}
