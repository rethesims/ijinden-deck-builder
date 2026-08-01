// SPDX-License-Identifier: MIT

import {
  dataCardsArrayForTable,
  dataCardsArrayForDeck,
  dataCardsMap,
  dataCardsMapByOrderTable,
} from './dataCards';

// orderTable / orderDeck は元サイトが振った値をそのまま使う。デッキコードの
// 互換性が orderTable に依存しているため、詰め直してはいけない。欠番があるので
// 「連番であること」ではなく「昇順かつ重複なし」を検査する。
function expectStrictlyAscending(array, key) {
  expect(Array.isArray(array)).toBe(true);
  expect(array.length).toBeGreaterThan(0);
  expect(array[0][key]).toBe(1);
  array.forEach((element, i) => {
    expect(typeof element[key]).toBe('number');
    if (i > 0) {
      expect(array[i - 1][key]).toBeLessThan(element[key]);
    }
  });
}

test('dataCardsArrayForTable は orderTable 昇順', () => {
  expectStrictlyAscending(dataCardsArrayForTable, 'orderTable');
});

test('dataCardsArrayForDeck は orderDeck 昇順', () => {
  expectStrictlyAscending(dataCardsArrayForDeck, 'orderDeck');
});

test('dataCardsMap は Map 型', () => {
  expect(dataCardsMap instanceof Map).toBe(true);
});

test('dataCardsMapByOrderTable は orderTable から引ける', () => {
  expect(dataCardsMapByOrderTable instanceof Map).toBe(true);
  dataCardsArrayForTable.forEach((card) => {
    expect(dataCardsMapByOrderTable.get(card.orderTable)).toBe(card);
  });
});

test('各 dataCards の要素数は同じ', () => {
  const lengthTable = dataCardsArrayForTable.length;
  const lengthDeck = dataCardsArrayForDeck.length;
  const sizeMap = dataCardsMap.size;
  expect(typeof lengthTable).toBe('number');
  expect(typeof lengthDeck).toBe('number');
  expect(typeof sizeMap).toBe('number');
  expect(sizeMap).toBe(lengthTable);
  expect(sizeMap).toBe(lengthDeck);
  expect(dataCardsMapByOrderTable.size).toBe(lengthTable);
});

test('カードは必須項目をもつ', () => {
  dataCardsArrayForTable.forEach((card) => {
    expect(typeof card.id).toBe('string');
    expect(typeof card.name).toBe('string');
    expect(typeof card.displayName).toBe('string');
    expect(typeof card.imageUrl).toBe('string');
    // 自前ホストのサムネイル。内容のハッシュ付き (scripts/make-thumbnails.py)。
    // ハッシュがあるおかげで immutable キャッシュを安全に付けられる。
    expect(card.thumbUrl).toMatch(new RegExp(`^/images/${card.id}-[0-9a-f]{8}\\.webp$`));
  });
});
