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
}
