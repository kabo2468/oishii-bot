import { builder, IpadicFeatures } from 'kuromoji';
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

    async getNouns(): Promise<IpadicFeatures[]> {
        const text = this.text;
        return new Promise((resolve) => {
            builder({ dicPath: 'node_modules/kuromoji/dict' }).build(function (err, tokenizer) {
                if (err) throw err;

                const tokens = tokenizer.tokenize(text);

                //名詞のみ
                const nouns = tokens.filter((token) => token.pos === '名詞' && token.pos_detail_1 !== 'サ変接続');
                if (nouns.length < 1) resolve([]);

                //1文字と小文字から始まるものを消す
                const output = nouns.filter((n) => !/^[A-Za-zぁ-ゔァ-ヴｦ-ﾟ\d]$|^[ぁぃぅぇぉゕゖっゃゅょゎァィゥェォヵヶッャュョヮ]/.test(n.surface_form));
                if (output.length < 1) resolve([]);

                resolve(output);
            });
        });
    }

    async getWakachi(): Promise<string[]> {
        const text = this.text;
        return new Promise((resolve) => {
            builder({ dicPath: 'node_modules/kuromoji/dict' }).build(function (err, tokenizer) {
                if (err) throw err;

                const tokens = tokenizer.tokenize(text);

                const wakachi = tokens.map((token) => token.surface_form);

                resolve(wakachi);
            });
        });
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
