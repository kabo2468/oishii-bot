export function toHalfWidth(str: string) {
    const half = str.replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

    // 文字コードシフトで対応できない文字の変換
    return half.replaceAll('”', '"').replaceAll('’', "'").replaceAll('‘', '`').replaceAll('￥', '\\').replaceAll('　', ' ').replaceAll('〜', '~');
}
