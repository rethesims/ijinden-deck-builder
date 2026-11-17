// SPDX-License-Identifier: MIT

import cardsJson from './cards.json';
import {
  containsNgWord,
  isDeckHidden,
  isTestName,
  reasonUploadRejected,
} from './moderation';

describe('containsNgWord', () => {
  test.each([
    'うんこ',
    'ウンコデッキ',
    'ｳﾝｺ',
    'う ん こ',
    'う・ん・こ',
    '💩',
    'お前死ね',
    'ＦＵＣＫ',
  ])('「%s」は NG', (text) => {
    expect(containsNgWord(text)).toBe(true);
  });

  // 似た並びを含むが普通の言葉
  test.each([
    'コロンブス',
    'ジョージ・アームストロング・カスター',
    'オリーブの杖でブロックできない',
    'ハイケイばっかり',
    '生きるマンコンボ',
    'テストプレイしてみた',
    '',
    undefined,
  ])('「%s」は NG ではない', (text) => {
    expect(containsNgWord(text)).toBe(false);
  });

  test('カード名はどれも NG にならない', () => {
    const namesHit = cardsJson.map((card) => card.name).filter(containsNgWord);
    expect(namesHit).toStrictEqual([]);
  });
});

test('isTestName は名前が「テスト」だけのときに true', () => {
  expect(isTestName('テスト')).toBe(true);
  expect(isTestName(' test ')).toBe(true);
  expect(isTestName('てすと')).toBe(true);
  expect(isTestName('テスト用の赤単')).toBe(false);
});

describe('isDeckHidden', () => {
  const deckOk = {
    code: 'abc123', name: '天草LO', description: '決起で山札を削る', keywords: ['決起'],
  };

  test('普通の投稿は出す', () => {
    expect(isDeckHidden(deckOk)).toBe(false);
  });

  test('個別に指定した投稿は隠す', () => {
    expect(isDeckHidden({ ...deckOk, code: 'e2b6156e3e80' })).toBe(true);
  });

  test('名前・説明・キーワードのどこかに NG ワードがあれば隠す', () => {
    expect(isDeckHidden({ ...deckOk, name: 'うんこ' })).toBe(true);
    expect(isDeckHidden({ ...deckOk, description: 'きもい' })).toBe(true);
    expect(isDeckHidden({ ...deckOk, keywords: ['決起', '💩'] })).toBe(true);
  });

  test('名前が「テスト」だけの投稿は隠す', () => {
    expect(isDeckHidden({ ...deckOk, name: 'テスト' })).toBe(true);
  });

  test('キーワードが配列でなくても落ちない', () => {
    expect(isDeckHidden({ ...deckOk, keywords: '決起' })).toBe(false);
    expect(isDeckHidden({ ...deckOk, keywords: undefined })).toBe(false);
  });

  test('オブジェクトでないものは隠す', () => {
    expect(isDeckHidden(null)).toBe(true);
    expect(isDeckHidden('deck')).toBe(true);
  });
});

test('reasonUploadRejected', () => {
  expect(reasonUploadRejected({ name: '天草LO', description: '', keywords: [] })).toBeNull();
  expect(reasonUploadRejected({ name: 'テスト', description: '', keywords: [] }))
    .toBe('デッキ名が「テスト」のままでは投稿できません');
  expect(reasonUploadRejected({ name: '天草LO', description: 'うんこ', keywords: [] }))
    .toBe('不適切な言葉が含まれているため投稿できません');
  expect(reasonUploadRejected({ name: '天草LO', description: '', keywords: ['ウンコ'] }))
    .toBe('不適切な言葉が含まれているため投稿できません');
});
