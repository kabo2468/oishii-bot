import moji from 'moji';

export default function toHiragana(str: string): string {
    return moji(str).convert('HK', 'ZK').convert('KK', 'HG').toString();
}
