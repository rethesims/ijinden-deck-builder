// SPDX-License-Identifier: MIT

import { dataCardsArrayForTable, dataCardsArrayForDeck, dataCardsMap } from './dataCards';

// orderTable / orderDeck は元サイトが振った値をそのまま使う。カードの並び順が
// これで決まる。欠番があるので「連番であること」ではなく
// 「昇順かつ重複なし」を検査する。
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

test('各 dataCards の要素数は同じ', () => {
  const lengthTable = dataCardsArrayForTable.length;
  const lengthDeck = dataCardsArrayForDeck.length;
  const sizeMap = dataCardsMap.size;
  expect(typeof lengthTable).toBe('number');
  expect(typeof lengthDeck).toBe('number');
  expect(typeof sizeMap).toBe('number');
  expect(sizeMap).toBe(lengthTable);
  expect(sizeMap).toBe(lengthDeck);
});

// Amplify がSPA用に自動生成するリライトの既定ルールは、この拡張子リストに
// 無いものをすべて index.html に書き換える。ここに無い拡張子でサムネイルを
// 配信すると、画像の代わりに HTML が返ってカード画像が1枚も表示されなくなる。
// (実際に WebP で配信して起きた。Content-Type: text/html が返るので気づきにくい)
const EXTENSIONS_SERVED_BY_AMPLIFY = [
  'css', 'gif', 'ico', 'jpg', 'js', 'png', 'txt', 'svg',
  'woff', 'woff2', 'ttf', 'map', 'json', 'webmanifest',
];

test('サムネイルの拡張子は Amplify がそのまま配信するものである', () => {
  const extensions = new Set(
    dataCardsArrayForTable.map((card) => card.thumbUrl.split('.').pop()),
  );
  expect(extensions.size).toBe(1);
  extensions.forEach((extension) => {
    expect(EXTENSIONS_SERVED_BY_AMPLIFY).toContain(extension);
  });
});

test('カードは必須項目をもつ', () => {
  dataCardsArrayForTable.forEach((card) => {
    expect(typeof card.id).toBe('string');
    expect(typeof card.name).toBe('string');
    expect(typeof card.displayName).toBe('string');
    expect(typeof card.imageUrl).toBe('string');
    // 自前ホストのサムネイル。内容のハッシュ付き (scripts/make-thumbnails.py)。
    // ハッシュがあるおかげで immutable キャッシュを安全に付けられる。
    expect(card.thumbUrl).toMatch(new RegExp(`^/images/${card.id}-[0-9a-f]{8}\\.jpg$`));
  });
});
