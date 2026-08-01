// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from './App';

// レシピのカードは、タッチ端末では「タップしたカードだけ」操作ボタンを出す。
// どのカードが対象かは is-active クラスで表す (見せ方は App.css)。
// ここが壊れると、全カードがボタンで覆われたり、複数のカードが
// 同時に選択状態になったりする。
async function setupDeck(user, ids) {
  render(<App />);
  const paneCard = screen.getAllByRole('tabpanel')[0];
  for (const id of ids) {
    const buttonPlus = paneCard.querySelector(`tr[data-id="${id}"] td:nth-child(3) button:nth-child(3)`);
    // eslint-disable-next-line no-await-in-loop
    await user.click(buttonPlus);
  }
  await user.click(screen.getAllByRole('tab')[1]);
  return screen.getAllByRole('tabpanel')[1];
}

function togglesIn(paneDeck) {
  return paneDeck.querySelectorAll('.container-card-line-up .btn-card-toggle');
}

function activeCardsIn(paneDeck) {
  return paneDeck.querySelectorAll('.container-card-line-up .container-card.is-active');
}

test('レシピのカードは初期状態ではどれも選択されていない', async () => {
  const user = userEvent.setup();
  const paneDeck = await setupDeck(user, ['R-1', 'R-2', 'R-3']);

  expect(togglesIn(paneDeck).length).toBe(3);
  expect(activeCardsIn(paneDeck).length).toBe(0);
}, 20000);

test('カードをタップするとそのカードだけが選択される', async () => {
  const user = userEvent.setup();
  const paneDeck = await setupDeck(user, ['R-1', 'R-2', 'R-3']);

  const toggles = togglesIn(paneDeck);
  await user.click(toggles[0]);

  const active = activeCardsIn(paneDeck);
  expect(active.length).toBe(1);
  expect(active[0].contains(toggles[0])).toBe(true);
}, 20000);

test('別のカードをタップすると前のカードの選択は外れる', async () => {
  const user = userEvent.setup();
  const paneDeck = await setupDeck(user, ['R-1', 'R-2', 'R-3']);

  const toggles = togglesIn(paneDeck);
  await user.click(toggles[0]);
  await user.click(toggles[2]);

  const active = activeCardsIn(paneDeck);
  expect(active.length).toBe(1);
  expect(active[0].contains(toggles[2])).toBe(true);
}, 20000);

test('同じカードをもう一度タップすると選択が外れる', async () => {
  const user = userEvent.setup();
  const paneDeck = await setupDeck(user, ['R-1', 'R-2']);

  const toggles = togglesIn(paneDeck);
  await user.click(toggles[0]);
  expect(activeCardsIn(paneDeck).length).toBe(1);

  await user.click(toggles[0]);
  expect(activeCardsIn(paneDeck).length).toBe(0);
}, 20000);

test('メインとサイドに同じカードがあっても片方だけが選択される', async () => {
  const user = userEvent.setup();
  render(<App />);
  const paneCard = screen.getAllByRole('tabpanel')[0];
  await user.click(paneCard.querySelector('tr[data-id="R-1"] td:nth-child(3) button:nth-child(3)'));
  await user.click(paneCard.querySelector('tr[data-id="R-1"] td:nth-child(4) button:nth-child(3)'));
  await user.click(screen.getAllByRole('tab')[1]);
  const paneDeck = screen.getAllByRole('tabpanel')[1];

  // メインとサイドで1枚ずつ、同じカードが並ぶ
  const toggles = togglesIn(paneDeck);
  expect(toggles.length).toBe(2);

  await user.click(toggles[0]);
  let active = activeCardsIn(paneDeck);
  expect(active.length).toBe(1);
  expect(active[0].contains(toggles[0])).toBe(true);

  await user.click(toggles[1]);
  active = activeCardsIn(paneDeck);
  expect(active.length).toBe(1);
  expect(active[0].contains(toggles[1])).toBe(true);
}, 20000);

test('選択中のカードの増減ボタンが効く', async () => {
  const user = userEvent.setup();
  const paneDeck = await setupDeck(user, ['R-1']);

  await user.click(togglesIn(paneDeck)[0]);
  const card = activeCardsIn(paneDeck)[0];
  expect(card.querySelector('.container-num-copies').textContent).toBe('1');

  await user.click(card.querySelector('.btn-push'));
  expect(
    activeCardsIn(paneDeck)[0].querySelector('.container-num-copies').textContent,
  ).toBe('2');

  await user.click(activeCardsIn(paneDeck)[0].querySelector('.btn-pop'));
  expect(
    activeCardsIn(paneDeck)[0].querySelector('.container-num-copies').textContent,
  ).toBe('1');
}, 20000);
