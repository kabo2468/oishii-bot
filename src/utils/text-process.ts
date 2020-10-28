import { builder, IpadicFeatures } from 'kuromoji';
import NGWord from '../ng-words';

export class TextProcess {
    static removeURLs(text: string): string {
        return text.replace(/<?http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=@]*)?>?/g, '').trim();
    }

    static removeMentions(text: string): string {
        return text.replace(/@\w+@?[\w.-]*\s+/g, '').trim();
    }

    static removeMentionToMe(text: string): string {
        return text.replace(/@oishiibot(@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,})?\s/, '').trim();
    }

    static findNGWord(ngWord: NGWord, text: string): string | undefined {
        const _t = ngWord.excludeNGWord(text);
        const ngWords = ngWord.get;
        return ngWords.find((ng) => new RegExp(ng).exec(_t));
    }

    static removeSpace(text: string): string {
        return text.replace(/^\s+|\s+$/g, '');
    }

    static async getNouns(text: string): Promise<IpadicFeatures[]> {
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

    static omitText(text: string, length = 100): string {
        return (text.length > length ? text.substr(0, length) : text).replace(/\n/g, '\\n');
    }
}
