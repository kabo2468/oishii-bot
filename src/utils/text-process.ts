import NGWord from '../ng-words';

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
        const _t = ngWord.excludeNGWord(this.text);
        const ngWords = ngWord.get;
        return ngWords.find((ng) => new RegExp(ng).exec(_t));
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
