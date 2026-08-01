// SPDX-License-Identifier: MIT

import { useCallback, useState } from 'react';

const PREFIX = 'ijinden-deck-builder:';

// プライベートブラウジングなどで localStorage が使えないことがあるため、
// 読み書きは常に失敗しうるものとして扱う。
function read(key, valueDefault) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? valueDefault : JSON.parse(raw);
  } catch {
    return valueDefault;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 保存できなくても表示設定が失われるだけなので無視する。
  }
}

/**
 * localStorage に保存される useState。表示設定の保持に使う。
 *
 * @param {string} key 保存キー (アプリ名の接頭辞が自動で付く)
 * @param {*} valueDefault 保存値がないときの初期値
 * @param {(value: *) => boolean} isValid 保存値の検証 (壊れた値を無視するため)
 */
export default function usePersistentState(key, valueDefault, isValid = () => true) {
  const [value, setValue] = useState(() => {
    const stored = read(key, valueDefault);
    return isValid(stored) ? stored : valueDefault;
  });

  const setValueAndStore = useCallback((valueNew) => {
    setValue((valuePrev) => {
      const valueNext = typeof valueNew === 'function' ? valueNew(valuePrev) : valueNew;
      write(key, valueNext);
      return valueNext;
    });
  }, [key]);

  return [value, setValueAndStore];
}
