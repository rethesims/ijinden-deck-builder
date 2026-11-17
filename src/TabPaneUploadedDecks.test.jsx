// SPDX-License-Identifier: MIT

import 'fake-indexeddb/auto';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from './App';

afterEach(() => {
  jest.restoreAllMocks();
});

test('不適切な投稿はデッキ掲示板に出さない', async () => {
  const decksServer = [
    {
      code: 'okdeck1', name: '天草LO', description: '決起で山札を削る', keywords: ['決起'], main: [], side: [], timestamp: '2026-11-01T00:00:00.000Z',
    },
    {
      code: 'e2b6156e3e80', name: '個別に隠す投稿', description: '', keywords: [], main: [], side: [], timestamp: '2026-11-03T00:00:00.000Z',
    },
    {
      code: 'ngdeck1', name: '赤単', description: 'ウ ン コ', keywords: [], main: [], side: [], timestamp: '2026-11-04T00:00:00.000Z',
    },
    {
      code: 'testdeck1', name: 'テスト', description: '', keywords: [], main: [], side: [], timestamp: '2026-11-16T00:00:00.000Z',
    },
  ];
  jest.spyOn(global, 'fetch').mockImplementation(async () => ({
    ok: true,
    json: async () => decksServer,
  }));

  render(<App />);
  const user = userEvent.setup();

  const tabUploaded = screen.getAllByRole('tab')[4];
  expect(tabUploaded.textContent).toBe('デッキ掲示板');
  await user.click(tabUploaded);

  await screen.findByText('アップロードされたデッキ');
  const paneUploaded = screen.getAllByRole('tabpanel')[4];
  await waitFor(() => expect(paneUploaded.querySelectorAll('h3').length).toBe(1));
  expect(paneUploaded.querySelector('h3').textContent).toContain('天草LO');
});
