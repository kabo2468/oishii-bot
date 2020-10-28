import API, { File, Group, User } from './api';
import NGWord from '../ng-words';
import { TextProcess } from '../utils/text-process';

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

export class Message extends TextProcess {
    constructor(public message: CreatedMessage) {
        super();
    }

    removeURLs(): Message {
        this.message.text = TextProcess.removeURLs(this.message.text);
        return this;
    }

    removeMentions(): Message {
        this.message.text = TextProcess.removeMentions(this.message.text);
        return this;
    }

    findNGWord(ngWord: NGWord): string | undefined {
        return TextProcess.findNGWord(ngWord, this.message.text);
    }

    reply(text: string): void {
        API.sendMessage(text, this.message.userId).catch((err) => {
            throw new Error(err);
        });
    }
}
