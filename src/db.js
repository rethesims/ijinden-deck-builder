// SPDX-License-Identifier: MIT

import Dexie from 'dexie';

const DATABASE_NAME = 'ijinden-deck-builder';

const db = new Dexie(DATABASE_NAME);

// 手動で `id` を管理
db.version(1).stores({ decks: 'id, key, timestamp, code, main, side' });

export default db;
