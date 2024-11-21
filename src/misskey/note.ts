import { Bot } from '../bot.js';
import NGWord from '../ng-words.js';
import { TextProcess } from '../utils/text-process.js';
import { User } from './api.js';

export interface Reactions {
    [key: string]: number;
}

type Visibilities = 'public' | 'home' | 'followers' | 'specified';

export interface CreatedNote {
    id: string;
    createdAt: Date;
    userId: string;
    user: User;
    text?: string;
    cw: string | null;
    visibility: Visibilities;
    renoteCount: number;
    repliesCount: number;
    reactions: Reactions;
    emojis: string[];
    fileIds: string[];
    files: string[];
    replyId?: string;
    renoteId?: string;
    reply?: CreatedNote;
    renote?: CreatedNote;
}

export class Note {
    private bot: Bot;
    public note: CreatedNote;
    private tp: TextProcess;
    private _text: string;
    constructor(bot: Bot, note: CreatedNote) {
        this.bot = bot;
        this.note = {
            ...note,
            createdAt: new Date(note.createdAt),
        };
        this._text = note.text ?? '';
        this.tp = new TextProcess(this._text);
    }

    get screenId(): string {
        const user = this.note.user;
        const host = user.host ? `@${user.host}` : '';
        return `@${user.username}${host}`;
    }

    get text(): string {
        return this._text;
    }

    removeURLs(): this {
        this._text = this.tp.removeURLs().toString();
        return this;
    }

    removeMentions(): this {
        this._text = this.tp.removeMentions().toString();
        return this;
    }

    removeMentionToMe(): this {
        this._text = this.tp.removeMentionToMe().toString();
        return this;
    }

    findNGWord(ngWord: NGWord): string | undefined {
        return ngWord.find(this._text);
    }

    reply({ text, visibility = this.note.visibility, cw }: { text: string; visibility?: Visibilities; cw?: string }): void {
        const _t = `${this.screenId}\n${text}`;
        this.bot.api.postText({ text: _t, visibility, replyId: this.note.id, cw }).catch((err) => {
            throw err;
        });
    }

    reaction(reaction = '🍮'): void {
        this.bot.api.reactionToNote(this.note.id, reaction).catch((err) => {
            throw err;
        });
    }
}

// biome-ignore lint/suspicious/noExplicitAny: type guard
export function isNote(note: Record<string, any>): note is CreatedNote {
    return 'visibility' in note;
}
