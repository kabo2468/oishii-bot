import fetch from 'node-fetch';
import loadConfig from '../config';
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

export default class API {
    static async api(endpoint: string, body: Record<string, unknown>): Promise<boolean> {
        const config = await loadConfig();
        const postBody = {
            ...body,
            i: config.apiKey,
        };
        return fetch(`${config.apiUrl}${endpoint}`, {
            method: 'post',
            body: JSON.stringify(postBody),
            headers: { 'Content-Type': 'application/json' },
        })
            .then((res) => {
                return res.ok;
            })
            .catch((err) => {
                throw new Error(err);
            });
    }

    static async postText(text: string, visibility: 'public' | 'home' | 'followers' | 'specified' = 'public', replyId?: string): Promise<Note> {
        const config = await loadConfig();
        const data = {
            i: config.apiKey,
            text,
            visibility,
            replyId,
        };
        return fetch(`${config.apiUrl}/notes/create`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
        })
            .then((res) => {
                // console.dir(res, {depth:null});
                return res.json();
            })
            .then((json: { createdNote: CreatedNote }) => new Note(json.createdNote))
            .catch((err) => {
                throw new Error(err);
            });
    }

    static async reactionToNote(noteId: string, reaction: string): Promise<boolean> {
        const config = await loadConfig();
        const data = {
            i: config.apiKey,
            noteId,
            reaction,
        };
        return fetch(`${config.apiUrl}/notes/reactions/create`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
        })
            .then((res) => res.ok)
            .catch((err) => {
                throw new Error(err);
            });
    }

    static async sendMessage(text: string, userId: string, groupId?: string): Promise<Message> {
        const config = await loadConfig();
        const data = {
            i: config.apiKey,
            text,
            userId,
            groupId,
        };
        return fetch(`${config.apiUrl}/messaging/messages/create`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
        })
            .then((res) => res.json())
            .then((json) => new Message(json))
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
        body: CreatedNote | CreatedMessage;
    };
}
