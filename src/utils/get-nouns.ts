import { MecabType } from '../config';
import { mecab } from './mecab';

export async function getNouns(text: string, mecabConfig: MecabType): Promise<string[]> {
    const tokens = await mecab(text, mecabConfig.binPath, mecabConfig.dicPath);

    const nouns = tokens.filter((token) => token.pos === '名詞');
    if (nouns.length < 1) return [];

    const expected = nouns.filter((noun) => !/^[A-Za-zぁ-ゔァ-ヴｦ-ﾟ\d]$|^[ぁぃぅぇぉゕゖっゃゅょゎァィゥェォヵヶッャュョヮ]/.test(noun.surface));
    if (expected.length < 1) return [];

    const output = expected.map((word) => word.surface);
    return output;
}
