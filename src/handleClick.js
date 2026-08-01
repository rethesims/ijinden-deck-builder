// SPDX-License-Identifier: MIT

// 更新関数の形 (前の値を受け取って次の値を返す) で setState を呼ぶ。
// 呼び出し側が現在のデッキを閉じ込めなくて済むので、カード1行ごとの
// コールバックを固定でき、再描画を最小限にできる。
//
// カード一覧には576種 × メイン/サイドの2つ = 1000個以上のカウンタがある。
// 現在のデッキを引数で受け取る形だと、1回の増減で全部が再描画されてしまい、
// スマホでは目に見えて重くなる。

export function handleClickIncrement(id, handleSetDeck) {
  handleSetDeck((deck) => {
    const deckNew = new Map(deck.entries());
    const counter = deckNew.has(id) ? deckNew.get(id) : 0;
    deckNew.set(id, counter + 1);
    return deckNew;
  });
}

export function handleClickDecrement(id, handleSetDeck) {
  handleSetDeck((deck) => {
    const deckNew = new Map(deck.entries());
    if (deckNew.has(id)) {
      const counter = deckNew.get(id);
      if (counter > 1) {
        deckNew.set(id, counter - 1);
      } else {
        deckNew.delete(id);
      }
    }
    return deckNew;
  });
}
