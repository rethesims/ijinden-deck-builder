#!/usr/bin/env python3
"""元サイトのカードデータと突き合わせて、当サイトのカードデータの差分を調べる。

新しい弾が出たときに気づくためのもの。カードの増減と、
カードの並び順 (orderTable / orderDeck) の変化を報告する。

    python3 scripts/check-upstream-cards.py

差異があれば終了コード1。
"""
import json
import os
import re
import sys
import urllib.request

URL_UPSTREAM = 'https://sweetpotato.github.io/ijinden-deck-builder/'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH_CARDS = os.path.join(ROOT, 'src', 'cards.json')

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode('utf-8')


def fetch_upstream_cards():
    html = fetch(URL_UPSTREAM)
    names = re.findall(r'assets/(cards-[\w-]+\.js)', html)
    if not names:
        raise RuntimeError('元サイトのカードデータの場所がわからない (構成が変わった可能性)')
    source = fetch(f'{URL_UPSTREAM}assets/{names[0]}')
    start = source.index('`') + 1
    end = source.rindex('`')
    raw = source[start:end].replace('\\`', '`').replace('\\$', '$')
    return json.loads(raw)


def main():
    with open(PATH_CARDS, encoding='utf-8') as fh:
        ours = json.load(fh)

    try:
        theirs = fetch_upstream_cards()
    except Exception as exc:  # noqa: BLE001
        print(f'元サイトのカードデータを取得できなかった: {exc}', file=sys.stderr)
        return 2

    ours_by_id = {c['id']: c for c in ours}
    theirs_by_id = {c['id']: c for c in theirs}

    # 元サイトが既存カードの番号を振り直したケース
    renumbered = [
        (i, ours_by_id[i]['orderTable'], theirs_by_id[i]['orderTable'])
        for i in ours_by_id.keys() & theirs_by_id.keys()
        if ours_by_id[i]['orderTable'] != theirs_by_id[i]['orderTable']
    ]
    added = sorted(theirs_by_id.keys() - ours_by_id.keys())
    removed = sorted(ours_by_id.keys() - theirs_by_id.keys())

    print(f'当サイト: {len(ours)}種 / 元サイト: {len(theirs)}種')

    if renumbered:
        print()
        print('既存カードの orderTable が変わっている')
        print('    カードの並び順が元サイトとずれる。cards.json を合わせ直すこと。')
        for card_id, mine, theirs_value in sorted(renumbered)[:20]:
            print(f'    {card_id}: 当サイト {mine} -> 元サイト {theirs_value}')
        if len(renumbered) > 20:
            print(f'    ... 他 {len(renumbered) - 20} 件')

    if added:
        print()
        print(f'元サイトにあって当サイトにないカード: {len(added)}種')
        print(f'    {", ".join(added[:10])}{" ..." if len(added) > 10 else ""}')
        print('    -> cards.json を更新し、scripts/make-thumbnails.py を実行する')

    if removed:
        print()
        print(f'当サイトにあって元サイトにないカード: {len(removed)}種')
        print(f'    {", ".join(removed[:10])}{" ..." if len(removed) > 10 else ""}')

    if not (renumbered or added or removed):
        print('差異なし。')
        return 0
    return 1


if __name__ == '__main__':
    sys.exit(main())
