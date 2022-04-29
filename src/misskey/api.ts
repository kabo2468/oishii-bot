import fetch, { Response } from 'node-fetch';
import { Bot } from '../bot';
import messages from '../messages';
import { CreatedNote, Note } from './note';

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

export interface Group {
    id: string;
    createdAt: Date;
    name: string;
    ownerId: string;
    userIds: string[];
}

export interface ReversiRes {
    id: string;
    createdAt: string;
    parentId: string;
    parent: User;
    childId: string;
    child: User;
}

export default class API {
    constructor(private bot: Bot) {}

    async call(endpoint: string, body?: Record<string, unknown>): Promise<Response> {
        const postBody = {
            ...body,
            i: this.bot.config.apiKey,
        };
        return fetch(`${this.bot.config.apiUrl}/${endpoint}`, {
            method: 'post',
            body: JSON.stringify(postBody),
            headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
            throw new Error(err);
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
    }): Promise<Note> {
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
        return this.call('notes/create', data)
            .then((res) => res.json())
            .then((json: { createdNote: CreatedNote }) => new Note(this.bot, json.createdNote))
            .catch((err) => {
                throw new Error(err);
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
        type: string;
        body: CreatedNote | ReversiRes;
    };
}
