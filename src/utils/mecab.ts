// syuilo/ai/src/modules/keyword/mecab.ts + modified
import { spawn } from 'child_process';
import { WritableStream } from 'memory-streams';
import { EOL } from 'os';
import { pipeline as streamPipeline } from 'stream';
import { promisify } from 'util';

const pipeline = promisify(streamPipeline);

interface Morpheme {
    /** 表層形 */
    surface: string;
    /** 品詞 */
    pos: string;
    /** 品詞細分類1 */
    posSubcategory1: string;
    /** 品詞細分類2 */
    posSubcategory2: string;
    /** 品詞細分類3 */
    posSubcategory3: string;
    /** 活用型 */
    conjugation: string;
    /** 活用形 */
    conjugationType: string;
    /** 原形 */
    originalForm: string;
    /** 読み */
    reading: string;
    /** 発音 */
    pronunciation: string;
}

/**
 * Run MeCab
 * @param text Text to analyze
 * @param mecab mecab bin
 * @param dic mecab dictionary path
 */
export async function mecab(text: string, mecab = 'mecab', dic?: string): Promise<Morpheme[]> {
    const args: string[] = [];
    if (dic) args.push('-d', dic);

    const lines = await cmd(mecab, args, `${text.replace(/\s/g, ' ')}\n`);

    const results: Morpheme[] = [];

    for (const line of lines) {
        if (line === 'EOS') break;
        const [word, value = ''] = line.split('\t');
        const array = value.split(',');
        array.unshift(word);
        const pushWord: Morpheme = {
            surface: array[0],
            pos: array[1],
            posSubcategory1: array[2],
            posSubcategory2: array[3],
            posSubcategory3: array[4],
            conjugation: array[5],
            conjugationType: array[6],
            originalForm: array[7],
            reading: array[8],
            pronunciation: array[9],
        };
        results.push(pushWord);
    }
    return results;
}

export async function cmd(command: string, args: string[], stdin: string): Promise<string[]> {
    const mecab = spawn(command, args);

    const writable = new WritableStream();

    mecab.stdin.write(stdin);
    mecab.stdin.end();

    await pipeline(mecab.stdout, writable);

    return writable.toString().split(EOL);
}
