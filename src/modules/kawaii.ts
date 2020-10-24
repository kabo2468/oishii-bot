import Module from '../module';
import { Note } from '../misskey/note';
import { Bot } from '../bot';

export default class extends Module {
    Name = 'Kawaii';
    Regex = new RegExp(/かわいい|カワイイ|可愛い|kawaii/i);

    Run(bot: Bot, note: Note): void {
        note.reaction('❤️');
    }
}
