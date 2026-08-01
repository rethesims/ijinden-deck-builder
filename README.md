# イジンデッキ

## これは何？

すいーとポテト様の作成したイジンデンのデッキレシピを作成するアプリの改変版です
下記３点に関してのお問い合わせはムヨンまでお願いします
1. 掲示板機能とデッキコード発行機能を、独自に追加したものになります。
2. サーバ側でのデッキコードの管理などは、ムヨンによる管理となります
3. 当サイトの運営はムヨンにて行っております


Amplify でアプリを公開しています。公開ページは次の URL です。

https://bbs.d3549oz7huwdgv.amplifyapp.com/


## 特徴

- デッキ枚数の上限なし
- メインデッキとサイドデッキを別個に管理可能
- レシピを「マイデッキ」としてブラウザに保存可能
- カード枚数はカード名ごとに数字で表示
- カード一覧は「カード名」表示と「カード画像」表示を切り替え可能
  (カード名表示のときは効果テキストの表示を on/off 可能。設定はブラウザに保存される)
- カード名・効果テキスト・イラストレーター名での検索
- 並びは種類、レベル、色、エキスパンション順

## 未対応機能

- **自前の画像保存** -- OS のスクショ機能で保存願います。
- **並び順の変更** -- ご面倒ですがこのまま使用ください。

## カードデータの整合性

カードの並び順は元サイトが振った `orderTable` / `orderDeck` をそのまま使っています。
元サイトのデータとずれていないかは次のコマンドで確認できます。
カードデータを更新したときと、新しい弾が出たころに実行してください。

```sh
python3 scripts/check-upstream-cards.py     # npm run check-cards
```

カードの増減と、既存カードの並び順の変化を報告します。差異があれば終了コード1を返します。

## カード画像

カード一覧・レシピの表示には、`public/images/` に置いた JPEG サムネイル
(幅250px, 約30KB) を使っています。公式サイトの画像は1枚あたり数百KB あり
`Cache-Control` も付かないため、直接読むとスマホでかなり重くなるためです。
原寸の公式画像は、レシピの拡大表示のときだけ読み込みます。

ファイル名には内容のハッシュが入っているので、
`customHttp.yml` で1年間の immutable キャッシュを付けています。

**形式を WebP にしないこと。**
Amplify がSPA用に自動生成するリライトの既定ルールは、拡張子の許可リスト
(`css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webmanifest`) に
無いものをすべて `index.html` に書き換えます。`webp` はこのリストに無いため、
WebP で配信すると画像の代わりに HTML が返り、カード画像が1枚も表示されません
(`Content-Type: text/html` が返るので気づきにくい)。
WebP の方が2〜3割小さいですが、コンソール設定に依存せず確実に表示されることを
優先して JPEG を使っています。

## 開発

```sh
npm install
npm start          # 開発サーバー
npm test           # テスト
npm run eslint     # 静的検査
npm run build      # 本番ビルド
```

### カードデータの更新

新しい弾が出たときは、次の手順で更新します。

1. `src/cards.json` を更新する (元サイトのデータに合わせる。`orderTable` は変えない)
2. サムネイルを作り直す

```sh
pip install pillow
python3 scripts/make-thumbnails.py
```

`scripts/make-thumbnails.py` は公式サイトから画像を取得して JPEG に変換し、
`public/images/` を作り直したうえで `src/cards.json` の `thumbUrl` を書き換えます。

### デプロイ

`bbs` ブランチへの push が本番に反映されます。
配信ヘッダー (キャッシュ・CSP など) は `customHttp.yml` で設定しています。
ヘッダーを変えたときは、デプロイ後に実際の応答を確認してください。

```sh
curl -sSI https://bbs.d3549oz7huwdgv.amplifyapp.com/ | grep -i content-security-policy
```

`connect-src` は API のオリジンだけを許可しています。
API の URL を変えるときは `src/api.js` と `customHttp.yml` の両方を直してください。

## 連絡先

ムヨン &lt;rethesims AT yahoo DOT co DOT jp&gt;
