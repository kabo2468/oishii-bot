import { Note } from './misskey/note';
import { Bot } from './bot';

export default abstract class Module {
    abstract readonly Name: string;
    abstract readonly Regex: RegExp;

    abstract Run(bot: Bot, context?: Note | string): void;

    About(): void {
        console.log(`Name: ${this.Name}`);
        console.log(`Regex: ${this.Regex.toString()}`);
    }

    protected log(text?: string, ...arg: string[]): void {
        console.log(`[${this.Name}]:`, text, ...arg);
    }
}
