import NGWord from '../ng-words.js';

export class TextProcess {
    constructor(private text: string) {}

    toString(): string {
        return this.text;
    }

    removeURLs(): TextProcess {
        this.text = this.text.replace(/<?http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=@]*)?>?/g, '').trim();
        return this;
    }

    removeMentions(): TextProcess {
        this.text = this.text.replace(/@\w+@?[\w.-]*\s+/g, '').trim();
        return this;
    }

    removeMentionToMe(): TextProcess {
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

    removeSpace(): TextProcess {
        this.text = this.text.replace(/^\s+|\s+$/g, '');
        return this;
    }

    omitText(length = 100): TextProcess {
        this.text = this.text.length > length ? `${this.text.substr(0, length)}...` : this.text;
        return this;
    }

    replaceNewLineToText(): TextProcess {
        this.text = this.text.replace(/\n/g, '\\n');
        return this;
    }
}
