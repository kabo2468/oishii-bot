import got from 'got';
import { Bot } from '../bot.js';
import messages from '../messages.js';
import { ReversiMatch } from '../modules/reversi/reversi.js';
import { botVersion } from '../utils/version.js';
import { CreatedNote, Note } from './note.js';

export interface User {
    id: string;
    name: string;
    username: string;
    host?: string;
    avatarUrl: string;
    avatarColor: string;
    isCat: boolean;
    isBot: boolean;
    emojis: string[];
    instance?: Instance;
    roles: Role[];
}

export interface Instance {
    name: string;
    softwareName: string;
    softwareVersion: string;
    iconUrl: string;
    faviconUrl: string;
    themeColor: string;
}

export interface File {
    id: string;
    createdAt: Date;
    name: string;
    type: string;
    md5: string;
    size: number;
    url: string;
    folderId: string;
    isSensitive: boolean;
}

export interface Role {
    id: string;
    name: string;
}

export default class API {
    constructor(private bot: Bot) {}

    async call<T>(endpoint: string, body?: Record<string, unknown>) {
        const postBody = {
            ...body,
            i: this.bot.config.apiKey,
        };
        return got
            .post<T>(`${this.bot.config.apiUrl}/${endpoint}`, {
                json: postBody,
                headers: {
                    'User-Agent': `oishii-bot/${botVersion} (API / https://github.com/kabo2468/oishii-bot)`,
                },
                responseType: 'json',
            })
            .catch((err) => {
                console.error(err);
                throw err;
            });
    }

    async postText({
        text,
        visibility = 'public',
        replyId,
        cw,
        visibleUserIds,
    }: {
        text: string;
        visibility?: 'public' | 'home' | 'followers' | 'specified';
        replyId?: string;
        cw?: string;
        visibleUserIds?: string[];
    }): Promise<Note | void> {
        const _cw: string[] = [];
        if (cw) _cw.push(cw);
        if (text.length > 100) _cw.push(messages.food.long);

        const data = {
            text,
            visibility: visibleUserIds ? 'specified' : visibility,
            replyId,
            cw: _cw.length ? _cw.join('\n\n') : null,
            visibleUserIds,
        };
        return this.call<{ createdNote: CreatedNote }>('notes/create', data)
            .then((res) => new Note(this.bot, res.body.createdNote))
            .catch((err) => {
                console.error(err);
            });
    }

    async reactionToNote(noteId: string, reaction: string): Promise<boolean> {
        const data = {
            noteId,
            reaction,
        };
        return (await this.call('notes/reactions/create', data)).ok;
    }
}

export interface Streaming {
    type: string;
    body: {
        id: string;
    } & (
        | {
              type: 'homeTimeline';
              body: CreatedNote;
          }
        | {
              type: 'mention';
              body: CreatedNote;
          }
        | {
              type: 'followed';
              body: User;
          }
        | {
              type: 'invited';
              body: { user: User };
          }
        | {
              type: 'matched';
              body: { game: ReversiMatch };
          }
    );
}
