#!/usr/bin/env python3
"""元サイトのカードデータと突き合わせて、共有リンクの互換性が壊れていないか調べる。

共有リンクのコードはカードの `orderTable` を鍵にしている。元サイトが既存カードの
`orderTable` を振り直すと、同じコードが両サイトで別のデッキを指すようになる。
しかもエラーにはならず、黙って違うデッキが表示される。これが一番怖い壊れ方なので、
カードデータを更新するときと、ときどき定期的にこれを実行して確認する。

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

# deckCode.js が前提にしている符号化のパラメータ。
# 元サイトのスクリプトから読み取れる値がこれと違ったら、仕様が変わっている。
EXPECTED_CONSTANTS = {
    'V1 の1カードあたりの文字数': 2,
    'V1 の orderTable のビット数': 10,
    'V1 の枚数のビット数': 2,
    'V2 の1カードあたりの文字数': 3,
    'V2 の orderTable のビット数': 12,
    'V2 の枚数のビット数': 6,
}


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


def check_constants():
    """符号化のビット幅などが変わっていないか、素朴に走査して確かめる。"""
    html = fetch(URL_UPSTREAM)
    names = re.findall(r'assets/(index-[\w-]+\.js)', html)
    if not names:
        return ['元サイトの本体スクリプトが見つからない (構成が変わった可能性)']
    source = fetch(f'{URL_UPSTREAM}assets/{names[0]}')
    problems = []

    # `var Xl=1,Zl=2,Ql=10,$l=2,eu=2,tu=3,nu=12,ru=6,` のような並びを探す。
    # 縮小後の変数名には $ が入りうるので \w だけでは足りない。
    if re.search(r'=1,[\w$]+=2,[\w$]+=10,[\w$]+=2,[\w$]+=2,[\w$]+=3,[\w$]+=12,[\w$]+=6,',
                 source) is None:
        problems.append(
            '符号化のビット幅が読み取れない。'
            ' deckCode.js の前提 (V1: 2文字/10bit/2bit, V2: 3文字/12bit/6bit) が'
            ' まだ有効か、元サイトの実際の共有リンクで確認すること')

    # 64文字の変換表 (base64url と同じ並び) が残っているか
    if '[62,`-`],[63,`_`]' not in source and '[62,"-"],[63,"_"]' not in source:
        problems.append('コードの文字表が見つからない。符号化方式が変わった可能性がある')

    # 新しいバージョン (V3 以降) が増えていないか。
    # 増えていても当サイトは「読めないリンク」として弾くので実害はないが、
    # 対応するまでそのリンクは読み込めない。
    if re.search(r'case 3:return [\w$]+\(', source) is not None:
        problems.append('元サイトに新しいコード形式 (V3?) が増えている可能性がある。'
                        ' deckCode.js の VERSIONS に追加が必要かもしれない')

    return problems


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

    # これが出たら共有リンクの互換性が壊れている (最優先で対応する)
    renumbered = [
        (i, ours_by_id[i]['orderTable'], theirs_by_id[i]['orderTable'])
        for i in ours_by_id.keys() & theirs_by_id.keys()
        if ours_by_id[i]['orderTable'] != theirs_by_id[i]['orderTable']
    ]
    added = sorted(theirs_by_id.keys() - ours_by_id.keys())
    removed = sorted(ours_by_id.keys() - theirs_by_id.keys())
    problems = check_constants()

    print(f'当サイト: {len(ours)}種 / 元サイト: {len(theirs)}種')

    if renumbered:
        print()
        print('!!! 既存カードの orderTable が変わっている !!!')
        print('    共有リンクの互換性が壊れる。cards.json を元サイトに合わせ直すこと。')
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

    for problem in problems:
        print()
        print(f'注意: {problem}')

    if not (renumbered or added or removed or problems):
        print('差異なし。共有リンクの互換性は保たれている。')
        return 0
    return 1


if __name__ == '__main__':
    sys.exit(main())
