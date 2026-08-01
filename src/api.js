// SPDX-License-Identifier: MIT

// デッキコード発行・デッキ掲示板のバックエンド (ムヨン管理)。
// CSP の connect-src もこのオリジンだけを許可している (customHttp.yml)。
export const URL_API_BASE = 'https://23axhh57na.execute-api.ap-northeast-1.amazonaws.com/v2/';

// 送信前に切り詰める上限。サーバー側の検証の代わりではなく、
// 事故や嫌がらせで極端に大きいデータが飛ぶのを防ぐためのもの。
export const LENGTH_MAX_NAME = 100;
export const LENGTH_MAX_DESCRIPTION = 2000;
export const LENGTH_MAX_KEYWORD = 50;
export const NUM_MAX_KEYWORDS = 20;

// サーバーが発行するデッキコード。想定より長い・妙な文字を含むものは送らない。
export const LENGTH_MAX_DECK_CODE = 128;
const REGEXP_DECK_CODE = /^[\w-]+$/;

export function isValidDeckCode(code) {
  return typeof code === 'string'
    && code.length > 0
    && code.length <= LENGTH_MAX_DECK_CODE
    && REGEXP_DECK_CODE.test(code);
}

// 掲示板の検索キーワード。
export const LENGTH_MAX_SEARCH = 100;
