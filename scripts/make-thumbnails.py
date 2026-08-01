#!/usr/bin/env python3
"""公式サイトのカード画像から、配信用の WebP サムネイルを作る。

公式画像は1枚あたり数百KB の PNG で Cache-Control も付かないため、
そのまま一覧に並べると通信量が跳ね上がる。幅250px の WebP に変換して
自前で配信すると 1/25 程度になる。

ファイル名には内容のハッシュを入れる。中身が変われば URL も変わるので、
Cache-Control: immutable を安全に付けられる (customHttp.yml)。

使い方:
    pip install pillow
    python3 scripts/make-thumbnails.py

src/cards.json の thumbUrl を書き換え、public/images/ を作り直す。
カードデータを更新したあとに実行すること。
"""
import hashlib
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH_CARDS = os.path.join(ROOT, 'src', 'cards.json')
DIR_OUT = os.path.join(ROOT, 'public', 'images')

WIDTH = 250
QUALITY = 80
WORKERS = 8
RETRIES = 4
LENGTH_HASH = 8


def fetch(url):
    error_last = None
    for attempt in range(RETRIES):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read()
        except (urllib.error.URLError, OSError) as exc:
            error_last = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f'{url}: {error_last}')


def make_thumbnail(card):
    raw = fetch(card['imageUrl'])
    image = Image.open(io.BytesIO(raw)).convert('RGB')
    height = round(image.height * WIDTH / image.width)
    image = image.resize((WIDTH, height), Image.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, 'WEBP', quality=QUALITY, method=6)
    data = buffer.getvalue()

    digest = hashlib.sha256(data).hexdigest()[:LENGTH_HASH]
    name = f"{card['id']}-{digest}.webp"
    with open(os.path.join(DIR_OUT, name), 'wb') as fh:
        fh.write(data)
    return card['id'], f'/images/{name}', len(data)


def main():
    with open(PATH_CARDS, encoding='utf-8') as fh:
        cards = json.load(fh)

    os.makedirs(DIR_OUT, exist_ok=True)
    for name in os.listdir(DIR_OUT):
        if name.endswith('.webp'):
            os.remove(os.path.join(DIR_OUT, name))

    urls = {}
    total = failed = 0
    started = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(make_thumbnail, card): card for card in cards}
        for future in as_completed(futures):
            card = futures[future]
            try:
                card_id, url, size = future.result()
                urls[card_id] = url
                total += size
            except Exception as exc:  # noqa: BLE001
                failed += 1
                print(f"ERR {card['id']}: {exc}", file=sys.stderr)
            done = len(urls) + failed
            if done % 50 == 0:
                print(f'{done}/{len(cards)} {total / 1e6:.1f}MB', flush=True)

    if failed:
        print(f'{failed} 枚の変換に失敗したため cards.json は更新しない', file=sys.stderr)
        return 1

    for card in cards:
        card['thumbUrl'] = urls[card['id']]
    with open(PATH_CARDS, 'w', encoding='utf-8') as fh:
        fh.write('[\n')
        fh.write(',\n'.join(
            json.dumps(card, ensure_ascii=False, separators=(',', ':')) for card in cards
        ))
        fh.write('\n]\n')

    print(f'{len(cards)} 枚 / {total / 1e6:.1f}MB / {time.time() - started:.0f}s')
    return 0


if __name__ == '__main__':
    sys.exit(main())
