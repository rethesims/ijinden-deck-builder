// SPDX-License-Identifier: MIT

// 元サイト (すいーとポテト様版) のデッキ共有リンクと互換なコーデック。
//
//   https://sweetpotato.github.io/ijinden-deck-builder/#/deck/<コード>
//
// コードはカードの `orderTable` を鍵にしているため、cards.json の orderTable が
// 元サイトと一致していることが互換性の前提になる。cards.json を更新するときは
// orderTable を勝手に振り直さないこと。
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
  if (typeof code !== 'string' || !REGEXP_CODE.test(code)) {
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

// 共有リンクの受け口。元サイトのリンクも自サイトのリンクも裸のコードも受ける。
const PREFIXES_SHARE_URL = [
  'https://sweetpotato.github.io/ijinden-deck-builder/#/deck/',
  'http://sweetpotato.github.io/ijinden-deck-builder/#/deck/',
];

export const PATH_SHARE = '#/deck/';

/**
 * 共有リンクまたはデッキコードから、デッキコード部分だけを取り出す。
 *
 * 元サイトのリンク、当サイトのリンク、コード単体のいずれも受け付ける。
 * 取り出せない場合は null。
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

  const prefixKnown = PREFIXES_SHARE_URL.find((prefix) => trimmed.startsWith(prefix));
  if (prefixKnown !== undefined) {
    return trimmed.substring(prefixKnown.length);
  }

  // 当サイトのリンク (ドメインが変わっても動くよう #/deck/ 以降を見る)。
  // 任意の URL を信用しないよう、http(s) のみ受け付ける。
  if (/^https?:\/\//i.test(trimmed)) {
    const indexPath = trimmed.indexOf(PATH_SHARE);
    return indexPath < 0 ? null : trimmed.substring(indexPath + PATH_SHARE.length);
  }

  return trimmed;
}

/**
 * デッキから共有リンクを組み立てる。表現できない場合は null。
 *
 * @param {Array<[string, number]>} entriesMain メインデッキの [カードID, 枚数]
 * @param {Array<[string, number]>} entriesSide サイドデッキの [カードID, 枚数]
 * @param {string} origin リンクの基底 URL (省略時は現在のページ)
 * @returns {string|null}
 */
export function buildShareUrl(entriesMain, entriesSide, origin = undefined) {
  const code = encodeDeckCode(entriesMain, entriesSide);
  if (code === null) {
    return null;
  }
  const base = origin ?? `${window.location.origin}${window.location.pathname}`;
  return `${base.replace(/\/*$/, '/')}${PATH_SHARE}${code}`;
}
