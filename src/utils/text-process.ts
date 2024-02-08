import NGWord from '../ng-words.js';

export class TextProcess {
    constructor(private text: string) {}

    toString(): string {
        return this.text;
    }

    removeURLs(): this {
        this.text = this.text.replace(/<?http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=@]*)?>?/g, '').trim();
        return this;
    }

    removeMentions(): this {
        this.text = this.text.replace(/@\w+@?[\w.-]*\s+/g, '').trim();
        return this;
    }

    removeMentionToMe(): this {
        this.text = this.text.replace(/@oishiibot(@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,})?\s/, '').trim();
        return this;
    }

    findNGWord(ngWord: NGWord): string | undefined {
        const _t = ngWord
            .excludeAllowedWord(this.text)
            .replace(/[\s!#$%&*,-./?\\^_|~、。ー×○●]/g, '') //NGワード避けする文字を消す
            .trim();
        const ngWords = ngWord.get;
        return ngWords.find((ng) => _t.indexOf(ng) !== -1);
    }

    omitText(length = 100): this {
        this.text = this.text.length > length ? `${this.text.substring(0, length)}...` : this.text;
        return this;
    }

    replaceNewLineToText(): this {
        this.text = this.text.replace(/\n/g, '\\n');
        return this;
    }
}
