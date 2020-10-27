import { Bot } from '../bot';
import { Note } from '../misskey/note';
import Module from '../module';

export default class extends Module {
    Name = 'Kawaii';
    Regex = new RegExp(/かわいい|カワイイ|可愛い|kawaii/i);

    Run(bot: Bot, note: Note): void {
        note.reaction('❤️');
    }
}
