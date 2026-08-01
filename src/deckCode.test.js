// SPDX-License-Identifier: MIT

import { decodeDeckCode, encodeDeckCode, extractDeckCode } from './deckCode';
import { dataCardsArrayForTable } from './dataCards';

// 実際に出回っている形の V1 コード (メイン40枚・サイド10枚)。
// orderTable を振り直すとこのテストが壊れる。過去のコードが別のデッキを
// 指すようになったことに気づくための番人なので、期待値は書き換えないこと。
const CODE_V1 = 'BJiyTWl5VF2OXUncnuXxn9XlonYsYy4AAwjyD5FuHuYvY';

describe('デッキコードの復元', () => {
  test('V1 (先頭 B) のコードを復号できる', () => {
    const decoded = decodeDeckCode(CODE_V1);
    expect(decoded).not.toBeNull();
    const [main, side] = decoded;
    expect(main).toStrictEqual([
      ['2-5', 3], ['3-14', 2], ['4-33', 3], ['4-68', 2], ['4-80', 4],
      ['2nd1-72', 2], ['2nd1-78', 3], ['2nd1-86', 3], ['2nd1-104', 2], ['2nd1-107', 3],
      ['2nd2-7', 2], ['2nd2-47', 3], ['2nd2-49', 2], ['2nd2-54', 2], ['2nd2-60', 4],
    ]);
    expect(side).toStrictEqual([
      ['3-12', 3], ['3-14', 1], ['4-68', 1], ['2nd1-104', 1], ['2nd2-56', 2], ['2nd2-57', 2],
    ]);
  });

  test('V2 (先頭 C) のコードを復号できる', () => {
    // 5枚以上入ると V1 では表せないため V2 になる
    const code = encodeDeckCode([['R-1', 16], ['R-13', 2]], [['R-2', 5]]);
    expect(code.charAt(0)).toBe('C');
    expect(decodeDeckCode(code)).toStrictEqual([
      [['R-1', 16], ['R-13', 2]], [['R-2', 5]],
    ]);
  });

  test('復号したデッキを再符号化すると元のコードに戻る', () => {
    const [main, side] = decodeDeckCode(CODE_V1);
    expect(encodeDeckCode(main, side)).toBe(CODE_V1);
  });
});

describe('encodeDeckCode', () => {
  test('4枚以下かつ orderTable 1023 以下なら V1 (2文字) を使う', () => {
    const code = encodeDeckCode([['R-1', 4], ['R-2', 1]], []);
    expect(code.charAt(0)).toBe('B');
    // 先頭1文字 + カード2種 * 2文字 + 区切り2文字
    expect(code).toHaveLength(1 + 2 * 2 + 2);
  });

  test('5枚以上あると V2 (3文字) にフォールバックする', () => {
    const code = encodeDeckCode([['R-1', 5]], []);
    expect(code.charAt(0)).toBe('C');
    expect(code).toHaveLength(1 + 3 + 3);
  });

  test('空のデッキは区切りだけになる', () => {
    expect(encodeDeckCode([], [])).toBe('BAA');
  });

  test('メインとサイドが区切りで分かれる', () => {
    const [main, side] = decodeDeckCode(encodeDeckCode([['R-1', 1]], [['R-2', 2]]));
    expect(main).toStrictEqual([['R-1', 1]]);
    expect(side).toStrictEqual([['R-2', 2]]);
  });

  test('入力順に関係なく orderTable 昇順で符号化される', () => {
    expect(encodeDeckCode([['R-3', 1], ['R-1', 1], ['R-2', 1]], []))
      .toBe(encodeDeckCode([['R-1', 1], ['R-2', 1], ['R-3', 1]], []));
  });

  test('64枚を超えると表現できず null', () => {
    expect(encodeDeckCode([['R-1', 65]], [])).toBeNull();
  });

  test('未知のカードIDは表現できず null', () => {
    expect(encodeDeckCode([['NO-SUCH-CARD', 1]], [])).toBeNull();
  });

  test('全カードを1枚ずつ入れても往復できる', () => {
    const entries = dataCardsArrayForTable.map((card) => [card.id, 1]);
    const [main, side] = decodeDeckCode(encodeDeckCode(entries, []));
    expect(main).toStrictEqual(entries);
    expect(side).toStrictEqual([]);
  });
});

describe('decodeDeckCode は壊れたコードを拒否する', () => {
  test.each([
    ['空文字', ''],
    ['未知のバージョン', 'AAA'],
    ['英数字以外を含む', 'B8wB!xXx'],
    ['ブロック長が合わない', 'BABC'],
    ['区切りがない', 'BBA'],
    ['区切りが2個ある', 'BBAAAAA'],
    ['orderTable が欠番 (502)', 'C2HAAAA'],
    ['orderTable が範囲外', 'C___AAA'],
    ['同じカードが2回出てくる', 'BBABAAA'],
    ['orderTable が降順', 'BCABAAA'],
  ])('%s', (_label, code) => {
    expect(decodeDeckCode(code)).toBeNull();
  });

  test('文字列以外', () => {
    expect(decodeDeckCode(null)).toBeNull();
    expect(decodeDeckCode(undefined)).toBeNull();
    expect(decodeDeckCode(123)).toBeNull();
  });
});

describe('extractDeckCode', () => {
  test('デッキの URL からコードを取り出す', () => {
    expect(extractDeckCode(`https://bbs.d3549oz7huwdgv.amplifyapp.com/#/deck/${CODE_V1}`))
      .toBe(CODE_V1);
  });

  test('ドメインが違っても #/deck/ 以降を取り出す', () => {
    expect(extractDeckCode(`https://example.com/foo/#/deck/${CODE_V1}`)).toBe(CODE_V1);
  });

  test('パス部分だけでも取り出す', () => {
    expect(extractDeckCode(`#/deck/${CODE_V1}`)).toBe(CODE_V1);
  });

  test('コード単体はそのまま返す', () => {
    expect(extractDeckCode(CODE_V1)).toBe(CODE_V1);
  });

  test('前後の空白を無視する', () => {
    expect(extractDeckCode(`  ${CODE_V1}\n`)).toBe(CODE_V1);
  });

  test('#/deck/ を含まない URL は null', () => {
    expect(extractDeckCode('https://example.com/')).toBeNull();
  });

  test('空文字や文字列以外は null', () => {
    expect(extractDeckCode('')).toBeNull();
    expect(extractDeckCode('   ')).toBeNull();
    expect(extractDeckCode(null)).toBeNull();
  });
});
