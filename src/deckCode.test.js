// SPDX-License-Identifier: MIT

import {
  buildShareUrl, decodeDeckCode, encodeDeckCode, extractDeckCode,
} from './deckCode';
import { dataCardsArrayForTable } from './dataCards';

// 元サイトの告知記事に載っている実物の共有リンク。
// この2件が壊れたら元サイトとの互換性が失われている。
const CODE_UPSTREAM_V2 = 'CBABCABDABEABFABGABHABIABJABKABLABMABNAPAAA';
const CODE_UPSTREAM_V1 = 'B8wBxXxexoRGiVikyTz6zs0AAJyozuU';

describe('元サイトのデッキコードとの互換性', () => {
  test('V2 (先頭 C) のコードを復号できる', () => {
    const decoded = decodeDeckCode(CODE_UPSTREAM_V2);
    expect(decoded).not.toBeNull();
    const [main, side] = decoded;
    expect(main).toStrictEqual([
      ['R-1', 2], ['R-2', 2], ['R-3', 2], ['R-4', 2], ['R-5', 2], ['R-6', 2], ['R-7', 2],
      ['R-8', 2], ['R-9', 2], ['R-10', 2], ['R-11', 2], ['R-12', 2], ['R-13', 16],
    ]);
    expect(side).toStrictEqual([]);
  });

  test('V1 (先頭 B) のコードを復号できる', () => {
    const decoded = decodeDeckCode(CODE_UPSTREAM_V1);
    expect(decoded).not.toBeNull();
    const [main, side] = decoded;
    expect(main).toStrictEqual([
      ['1-21', 4], ['1-26', 4], ['1-48', 4], ['1-55', 4], ['1-65', 2], ['2-2', 3],
      ['2-17', 3], ['2-32', 4], ['2-79', 4], ['3-22', 4], ['3-72', 4],
    ]);
    expect(side).toStrictEqual([['2-5', 4], ['3-4', 4], ['3-74', 2]]);
  });

  test('復号したデッキを再符号化すると元のコードに戻る', () => {
    [CODE_UPSTREAM_V1, CODE_UPSTREAM_V2].forEach((code) => {
      const [main, side] = decodeDeckCode(code);
      expect(encodeDeckCode(main, side)).toBe(code);
    });
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
  test('元サイトの共有リンクからコードを取り出す', () => {
    const url = `https://sweetpotato.github.io/ijinden-deck-builder/#/deck/${CODE_UPSTREAM_V1}`;
    expect(extractDeckCode(url)).toBe(CODE_UPSTREAM_V1);
  });

  test('当サイトの共有リンクからコードを取り出す', () => {
    const url = `https://bbs.d3549oz7huwdgv.amplifyapp.com/#/deck/${CODE_UPSTREAM_V2}`;
    expect(extractDeckCode(url)).toBe(CODE_UPSTREAM_V2);
  });

  test('コード単体はそのまま返す', () => {
    expect(extractDeckCode(CODE_UPSTREAM_V1)).toBe(CODE_UPSTREAM_V1);
  });

  test('前後の空白を無視する', () => {
    expect(extractDeckCode(`  ${CODE_UPSTREAM_V1}\n`)).toBe(CODE_UPSTREAM_V1);
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

describe('buildShareUrl', () => {
  test('渡した origin で共有リンクを組み立てる', () => {
    expect(buildShareUrl([['R-1', 1]], [], 'https://example.com/'))
      .toBe(`https://example.com/#/deck/${encodeDeckCode([['R-1', 1]], [])}`);
  });

  test('末尾スラッシュの有無を吸収する', () => {
    expect(buildShareUrl([['R-1', 1]], [], 'https://example.com'))
      .toBe(buildShareUrl([['R-1', 1]], [], 'https://example.com/'));
  });

  test('表現できないデッキは null', () => {
    expect(buildShareUrl([['R-1', 999]], [], 'https://example.com/')).toBeNull();
  });

  test('組み立てたリンクは元サイトでも読める形式', () => {
    const url = buildShareUrl([['R-1', 2]], [['R-2', 1]], 'https://example.com/');
    expect(url).toContain('#/deck/');
    expect(decodeDeckCode(extractDeckCode(url))).toStrictEqual([[['R-1', 2]], [['R-2', 1]]]);
  });
});
