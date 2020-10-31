import NGWord from '../ng-words';
import { TextProcess } from '../utils/text-process';
import API, { File, Group, User } from './api';

export type CreatedMessage = {
    id: string;
    createdAt: Date;
    text: string;
    userId: string;
    user: User;
    recipientId: string;
    recipient: User;
    groupId?: string;
    group?: Group;
    fileId?: string;
    file?: File;
    isRead: boolean;
    reads: string[];
};

export class Message {
    private tp: TextProcess;
    constructor(public message: CreatedMessage) {
        this.tp = new TextProcess(message.text);
    }

    removeURLs(): Message {
        this.message.text = this.tp.removeURLs().toString();
        return this;
    }

    removeMentions(): Message {
        this.message.text = this.tp.removeMentions().toString();
        return this;
    }

    findNGWord(ngWord: NGWord): string | undefined {
        return this.tp.findNGWord(ngWord);
    }

    reply(text: string): void {
        API.sendMessage(text, this.message.userId).catch((err) => {
            throw new Error(err);
        });
    }
}
