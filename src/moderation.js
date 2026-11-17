// SPDX-License-Identifier: MIT

// 掲示板の投稿のうち、画面に出さないもの・投稿させないものを決める。
// サーバー側で消したり弾いたりするまでの対処で、データ自体はサーバーに残る。
// API を直接叩けば投稿できてしまうので、表示側でも同じ判定で隠す。

// 個別に非表示にする投稿のデッキコード。
export const HIDDEN_DECK_CODES = new Set([
  'e2b6156e3e80', // 「うんこ」 2026-11-03
  '1c34144e8487', // 「テスト」 2026-11-16
]);

// 不適切な言葉。normalizeForNgCheck を通した文字列 (ひらがな・小文字・記号なし) に当てる。
// カード名や普通のデッキ説明に誤爆する言葉は入れない。
// 例: 「ぶす」はコロンブス、「かす」はカスター、「ばか」は「ばかり」、「でぶ」は「杖でブロック」に当たる。
const NG_PATTERNS = [
  /うんこ(?!ん)/u, // 「〜ウンコンボ」は除く
  /うんち/u,
  /💩/u,
  /ちんこ(?!ん)/u,
  /ちんちん/u,
  /ちんぽ/u,
  /まんこ(?!ん)/u, // 「〜マンコンボ」は除く
  /おっぱい/u,
  /せっくす/u,
  /死ね/u,
  /氏ね/u,
  /殺す/u,
  /殺せ/u,
  /ころす/u,
  /消えろ/u,
  /きもい/u,
  /きしょい/u,
  /うざい/u,
  /糞/u,
  /fuck/u,
  /shit/u,
  /porn/u,
];

// 中身のないテスト投稿の名前 (完全一致)。
const NAMES_TEST = new Set(['てすと', 'test']);

// 比較用に正規化する。全角半角をそろえ、カタカナをひらがなにし、
// 「う ん こ」「う・ん・こ」のような区切りを消す。
export function normalizeForNgCheck(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s\u200b-\u200d\ufeff・.,、。!?~〜*/\\|()[\]「」『』【】"'`_-]+/gu, '');
}

export function containsNgWord(text) {
  const normalized = normalizeForNgCheck(text);
  return NG_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isTestName(name) {
  return NAMES_TEST.has(normalizeForNgCheck(name));
}

function textsOfDeck({ name, description, keywords }) {
  return [name, description, ...(Array.isArray(keywords) ? keywords : [])];
}

// 一覧に出さない投稿なら true。
export function isDeckHidden(deck) {
  if (!deck || typeof deck !== 'object') return true;
  return HIDDEN_DECK_CODES.has(deck.code)
    || isTestName(deck.name)
    || textsOfDeck(deck).some(containsNgWord);
}

// 投稿できない内容ならその理由を、問題なければ null を返す。
export function reasonUploadRejected({ name, description, keywords }) {
  if (isTestName(name)) {
    return 'デッキ名が「テスト」のままでは投稿できません';
  }
  if (textsOfDeck({ name, description, keywords }).some(containsNgWord)) {
    return '不適切な言葉が含まれているため投稿できません';
  }
  return null;
}
