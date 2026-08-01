// SPDX-License-Identifier: MIT

import cards from './cards.json';

export const dataCardsArrayForTable = [...cards].sort((a, b) => a.orderTable - b.orderTable);
export const dataCardsArrayForDeck = [...cards].sort((a, b) => a.orderDeck - b.orderDeck);
export const dataCardsMap = new Map(cards.map((element) => [element.id, element]));

// 1種類あたりの枚数の上限。デッキ枚数自体に上限はないが、
// 壊れたデータで描画が固まらないよう歯止めを置く。
const NUM_MAX_COPIES = 999;

/**
 * 外部由来のデッキデータ ([カードID, 枚数] の配列) を安全な形に整える。
 *
 * サーバーや掲示板から来たデータは信用できないため、
 * 実在するカードと正の整数の枚数だけを残す。
 *
 * @param {*} entries 検証前のデッキデータ
 * @returns {Array<[string, number]>}
 */
export function sanitizeDeckEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  const seen = new Set();
  return entries.filter((entry) => {
    if (!Array.isArray(entry) || entry.length < 2) {
      return false;
    }
    const [id, numCopies] = entry;
    if (!dataCardsMap.has(id) || seen.has(id)) {
      return false;
    }
    if (!Number.isInteger(numCopies) || numCopies < 1 || numCopies > NUM_MAX_COPIES) {
      return false;
    }
    seen.add(id);
    return true;
  }).map(([id, numCopies]) => [id, numCopies]);
}
