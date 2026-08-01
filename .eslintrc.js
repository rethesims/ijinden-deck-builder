// SPDX-License-Identifier: MIT

// eslint-config-react-app はプラグインの解決にこのパッチを必要とする。
// これがないと `npx eslint` が "Environment key \"jest/globals\" is unknown" で落ちる。
// https://github.com/facebook/create-react-app/tree/main/packages/eslint-config-react-app#usage-outside-of-create-react-app
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  extends: [
    'airbnb',
    'airbnb/hooks',
    'react-app',
    'react-app/jest',
  ],
  rules: {
    'linebreak-style': 'off',
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'react/jsx-filename-extension': 'warn',
    'react/jsx-closing-bracket-location': ['error', 'line-aligned'],
    'react/jsx-closing-tag-location': ['error', 'line-aligned'],
    'react/jsx-no-bind': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  overrides: [
    {
      // このリポジトリのテストは、タブペイン内の特定の行やボタンを
      // querySelector で直接指す書き方を前提にしている。
      // ルールを丸ごと守らせると差分が大きくなるだけで得るものがないため外す。
      files: ['**/*.test.js', '**/*.test.jsx'],
      rules: {
        'testing-library/no-node-access': 'off',
      },
    },
  ],
};
