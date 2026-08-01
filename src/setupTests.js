// SPDX-License-Identifier: MIT

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// カード一覧は576行あり、jsdom での描画に時間がかかる。
// waitFor の既定 (1秒) だと、マシンが混んでいるときに
// 表示の中身ではなく待ち時間だけを理由に失敗することがあるため延ばす。
configure({ asyncUtilTimeout: 5000 });
