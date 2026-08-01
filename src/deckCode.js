// SPDX-License-Identifier: MIT

// `#/deck/<コード>` 形式のデッキコードを読むためのコーデック。
//
// レシピの中身がコードそのものに入っているため、サーバーを介さずに復元できる。
// 当アプリはこの形式のリンクを発行しない (共有はデッキコードのインポートを使う)。
// 読み込みだけに対応しているのは、この形式の URL を渡されたときに
// 何もできないより復元できたほうが親切なため。
//
// コードはカードの `orderTable` を鍵にしている。cards.json を更新するときに
// orderTable を振り直すと、過去のコードが別のデッキを指すようになるので注意。
//
// コードの構造
//   1文字目          … バージョン (V1='B', V2='C')
//   以降 CHARS 文字ごと … カード1種類。値は下位から6ビットずつリトルエンディアン
//                        値 = orderTable | ((枚数 - 1) << BITS_ID)
//   全ビット0のブロック … メインデッキとサイドデッキの区切り (ちょうど1個)
//
// V1 は1種類あたり2文字と短いが 枚数4・orderTable 1023 までしか表せないため、
// 収まらない場合のみ V2 (3文字) にフォールバックする。元サイトと同じ判定順。

import { dataCardsMap, dataCardsMapByOrderTable } from './dataCards';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const CHAR_OF = new Map([...ALPHABET].map((char, value) => [value, char]));
const VALUE_OF = new Map([...ALPHABET].map((char, value) => [char, value]));

const VERSIONS = [
  {
    version: 1, chars: 2, bitsId: 10, bitsNumCopies: 2,
  },
  {
    version: 2, chars: 3, bitsId: 12, bitsNumCopies: 6,
  },
];

const VERSION_OF = new Map(VERSIONS.map((spec) => [spec.version, spec]));

const REGEXP_CODE = /^[-_a-zA-Z0-9]+$/;

// 全576種を1種類ずつ並べても3460文字にしかならない。
// 極端に長い入力で無駄に走査しないための歯止め。
const LENGTH_MAX_CODE = 4096;

// エントリの形式は Map#entries() と同じ [カードID, 枚数] の配列。
function fitsIn({ bitsId, bitsNumCopies }, entries) {
  /* eslint-disable no-bitwise */
  return entries.every(([id, numCopies]) => {
    const { orderTable } = dataCardsMap.get(id) ?? {};
    return orderTable >= 1 && orderTable <= (1 << bitsId) - 1
      && numCopies >= 1 && numCopies <= 1 << bitsNumCopies;
  });
  /* eslint-enable no-bitwise */
}

function encodePart({ chars, bitsId }, entries) {
  if (entries.length <= 0) {
    return '';
  }
  return entries
    .map(([id, numCopies]) => ({ orderTable: dataCardsMap.get(id).orderTable, numCopies }))
    .sort((a, b) => a.orderTable - b.orderTable)
    .map(({ orderTable, numCopies }) => {
      /* eslint-disable no-bitwise */
      let value = orderTable | ((numCopies - 1) << bitsId);
      let encoded = '';
      for (let i = 0; i < chars; ++i) {
        encoded += CHAR_OF.get(value & 63);
        value >>= 6;
      }
      /* eslint-enable no-bitwise */
      return encoded;
    })
    .join('');
}

function encodeWith(spec, entriesMain, entriesSide) {
  return CHAR_OF.get(spec.version)
    + encodePart(spec, entriesMain)
    + CHAR_OF.get(0).repeat(spec.chars)
    + encodePart(spec, entriesSide);
}

/**
 * デッキをデッキコードに変換する。表現できない場合は null。
 *
 * アプリはこの形式のリンクを発行しないため、画面からは使っていない。
 * 復号したものを符号化し直して元に戻るか (往復) を検査するために残してある。
 * 復号だけをテストすると、期待値そのものが間違っていても気づけない。
 *
 * @param {Array<[string, number]>} entriesMain メインデッキの [カードID, 枚数]
 * @param {Array<[string, number]>} entriesSide サイドデッキの [カードID, 枚数]
 * @returns {string|null}
 */
export function encodeDeckCode(entriesMain, entriesSide) {
  const spec = VERSIONS.find(
    (candidate) => fitsIn(candidate, entriesMain) && fitsIn(candidate, entriesSide),
  );
  return spec === undefined ? null : encodeWith(spec, entriesMain, entriesSide);
}

function toPairs({ bitsId }, values) {
  /* eslint-disable no-bitwise */
  return values.map((value) => [value & ((1 << bitsId) - 1), (value >> bitsId) + 1]);
  /* eslint-enable no-bitwise */
}

function isValidPart({ bitsNumCopies }, pairs) {
  if (pairs.length === 0) {
    return true;
  }
  // 未知の orderTable (欠番を含む) と範囲外の枚数を弾く。
  /* eslint-disable no-bitwise */
  const inRange = pairs.every(([orderTable, numCopies]) => dataCardsMapByOrderTable.has(orderTable)
    && numCopies >= 1 && numCopies <= 1 << bitsNumCopies);
  /* eslint-enable no-bitwise */
  // 同じカードが2度現れるコードは作られないため、昇順かつ重複なしを要求する。
  return inRange && pairs.every((pair, i, all) => i === 0 || all[i - 1][0] < pair[0]);
}

function toEntries(pairs) {
  return pairs.map(([orderTable, numCopies]) => [
    dataCardsMapByOrderTable.get(orderTable).id,
    numCopies,
  ]);
}

/**
 * デッキコードをデッキに変換する。壊れている場合は null。
 *
 * @param {string} code デッキコード (URL の #/deck/ 以降)
 * @returns {[Array<[string, number]>, Array<[string, number]>]|null} [メイン, サイド]
 */
export function decodeDeckCode(code) {
  if (typeof code !== 'string'
    || code.length > LENGTH_MAX_CODE
    || !REGEXP_CODE.test(code)) {
    return null;
  }
  const spec = VERSION_OF.get(VALUE_OF.get(code.charAt(0)));
  if (spec === undefined) {
    return null;
  }

  const body = code.substring(1);
  if (body.length % spec.chars !== 0) {
    return null;
  }

  const values = [];
  for (let i = 0; i < body.length; i += spec.chars) {
    const block = body.substring(i, i + spec.chars);
    let value = 0;
    for (let j = 0; j < spec.chars; ++j) {
      /* eslint-disable-next-line no-bitwise */
      value |= VALUE_OF.get(block.charAt(j)) << (j * 6);
    }
    values.push(value);
  }

  // メインとサイドの区切りはちょうど1個でなければならない。
  if (values.filter((value) => value === 0).length !== 1) {
    return null;
  }
  const indexSeparator = values.indexOf(0);
  const pairsMain = toPairs(spec, values.slice(0, indexSeparator));
  const pairsSide = toPairs(spec, values.slice(indexSeparator + 1));

  if (!isValidPart(spec, pairsMain) || !isValidPart(spec, pairsSide)) {
    return null;
  }
  return [toEntries(pairsMain), toEntries(pairsSide)];
}

export const PATH_SHARE = '#/deck/';

/**
 * URL またはコード単体から、デッキコード部分だけを取り出す。
 *
 * ドメインは問わず `#/deck/` 以降を見る。取り出せない場合は null。
 *
 * @param {string} text ユーザーが貼り付けた文字列
 * @returns {string|null}
 */
export function extractDeckCode(text) {
  if (typeof text !== 'string') {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }

  // URL の場合。任意のスキームを信用しないよう http(s) のみ受け付ける。
  if (/^https?:\/\//i.test(trimmed)) {
    const indexPath = trimmed.indexOf(PATH_SHARE);
    return indexPath < 0 ? null : trimmed.substring(indexPath + PATH_SHARE.length);
  }

  // `#/deck/xxx` のようにパス部分だけ貼られた場合。
  if (trimmed.startsWith(PATH_SHARE)) {
    return trimmed.substring(PATH_SHARE.length);
  }

  return trimmed;
}
