import fetch, { Response } from 'node-fetch';
import { Bot } from '../bot';
import messages from '../messages';
import { CreatedMessage, Message } from './message';
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

    async postText(text: string, visibility: 'public' | 'home' | 'followers' | 'specified' = 'public', replyId?: string): Promise<Note> {
        const data = {
            text,
            visibility,
            replyId,
            ...(text.length > 100 ? { cw: messages.food.long } : {}),
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

    async sendMessage(text: string, userId: string, groupId?: string): Promise<Message> {
        const data = {
            text,
            userId,
            groupId,
        };
        return this.call('messaging/messages/create', data)
            .then((res) => res.json())
            .then((json) => new Message(this.bot, json))
            .catch((err) => {
                throw new Error(err);
            });
    }
}

export interface Streaming {
    type: string;
    body: {
        id: string;
        type: string;
        body: CreatedNote | CreatedMessage | ReversiRes;
    };
}
