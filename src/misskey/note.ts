import API, { User } from './api';
import NGWord from '../ng-words';
import { TextProcess } from '../utils/text-process';

export interface Reactions {
    [key: string]: number;
}

type Visibilities = 'public' | 'home' | 'followers' | 'specified';

export interface CreatedNote {
    id: string;
    createdAt: Date;
    userId: string;
    user: User;
    text: string;
    cw?: string;
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
    private tp: TextProcess;
    constructor(public note: CreatedNote) {
        this.tp = new TextProcess(note.text);
    }

    removeURLs(): Note {
        this.note.text = this.tp.removeURLs().toString();
        return this;
    }

    removeMentions(): Note {
        this.note.text = this.tp.removeMentions().toString();
        return this;
    }

    removeMentionToMe(): Note {
        this.note.text = this.tp.removeMentionToMe().toString();
        return this;
    }

    findNGWord(ngWord: NGWord): string | undefined {
        return this.tp.findNGWord(ngWord);
    }

    reply(text: string, visibility: Visibilities = this.note.visibility): void {
        API.postText(text, visibility, this.note.id).catch((err) => {
            throw new Error(err);
        });
    }

    reaction(reaction = '🍮'): void {
        API.reactionToNote(this.note.id, reaction).catch((err) => {
            throw new Error(err);
        });
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNote(note: Record<string, any>): note is CreatedNote {
    return 'visibility' in note;
}
