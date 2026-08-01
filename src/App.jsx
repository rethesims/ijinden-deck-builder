// SPDX-License-Identifier: MIT

import { useReducer, useState } from 'react';
import { Alert } from 'react-bootstrap';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

import TabPaneCard from './TabPaneCard';
import TabPaneDeck from './TabPaneDeck';
import TabPaneSave from './TabPaneSave';
import TabPaneSimulator from './TabPaneSimulator';
import TabPaneUploadedDecks from './TabPaneUploadedDecks';
import { PATH_SHARE, decodeDeckCode } from './deckCode';
import enumTabPane from './enumTabPane';
import { enumStateSimulator, reducerSimulator } from './reducerSimulator';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// 共有リンク (#/deck/<コード>) で開かれたときは、その中身を初期レシピにする。
// 読み終えたらハッシュを消して、リロードで再度読み込まれないようにする。
function readDeckFromHash() {
  const { hash } = window.location;
  if (!hash.startsWith(PATH_SHARE)) {
    return null;
  }
  const decoded = decodeDeckCode(hash.substring(PATH_SHARE.length));
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return decoded;
}

// StrictMode で初期化関数が2回呼ばれても結果が変わらないよう、
// ハッシュの読み取りはモジュール評価時に一度だけ行う。
const deckShared = readDeckFromHash();

function App() {
  const [deckMain, setDeckMain] = useState(
    () => new Map(deckShared === null ? [] : deckShared[0]),
  );
  const [deckSide, setDeckSide] = useState(
    () => new Map(deckShared === null ? [] : deckShared[1]),
  );
  const [activeTab, setActiveTab] = useState(
    deckShared === null ? enumTabPane.CARD : enumTabPane.DECK,
  );
  const [activeDeckSaved, setActiveDeckSaved] = useState([]);
  const [stateSimulator, dispatchSimulator] = useReducer(
    reducerSimulator,
    enumStateSimulator.INITIAL,
  );

  // useState の更新関数はレンダリングをまたいで同じものが渡ってくる。
  // ラップして毎回新しい関数を作ると、それを props で受け取る子が
  // すべて再描画されてしまうため、そのまま渡す。
  const handleSetDeckMain = setDeckMain;
  const handleSetDeckSide = setDeckSide;
  const handleSetActiveTab = setActiveTab;
  const handleSetActiveDeckSaved = setActiveDeckSaved;

  return (
    <>
      <h1 className="h3 m-2">イジンデン デッキ作成_デッキ共有版</h1>

      {/* スマホでは6つのタブが1行に収まらないため、はみ出す分は横スクロールさせる。 */}
      <Tabs
        className="flex-nowrap overflow-x-auto tabs-main sticky-top"
        activeKey={activeTab}
        defaultActiveKey={enumTabPane.CARD}
        transition={false}
        onSelect={(k) => setActiveTab(Number(k))}
      >
        {/* カードタブ */}
        <Tab eventKey={enumTabPane.CARD} title="カード">
          <TabPaneCard
            deckMain={deckMain}
            handleSetDeckMain={handleSetDeckMain}
            deckSide={deckSide}
            handleSetDeckSide={handleSetDeckSide}
            dispatchSimulator={dispatchSimulator}
          />
        </Tab>

        {/* レシピタブ */}
        <Tab eventKey={enumTabPane.DECK} title="レシピ">
          <TabPaneDeck
            deckMain={deckMain}
            handleSetDeckMain={handleSetDeckMain}
            deckSide={deckSide}
            handleSetDeckSide={handleSetDeckSide}
            handleSetActiveDeckSaved={handleSetActiveDeckSaved}
            handleSetActiveTab={handleSetActiveTab}
            dispatchSimulator={dispatchSimulator}
          />
        </Tab>

        {/* マイデッキタブ */}
        <Tab eventKey={enumTabPane.SAVE_AND_LOAD} title="マイデッキ">
          <TabPaneSave
            handleSetDeckMain={handleSetDeckMain}
            handleSetDeckSide={handleSetDeckSide}
            activeDeckSaved={activeDeckSaved}
            handleSetActiveDeckSaved={handleSetActiveDeckSaved}
            handleSetActiveTab={handleSetActiveTab}
            dispatchSimulator={dispatchSimulator}
          />
        </Tab>

        {/* シミュレータタブ */}
        <Tab eventKey={enumTabPane.SIMULATOR} title="シミュ">
          <TabPaneSimulator
            deck={deckMain}
            state={stateSimulator}
            dispatch={dispatchSimulator}
          />
        </Tab>

        {/* デッキ掲示板タブ */}
        <Tab eventKey={enumTabPane.UPLOADED_DECKS} title="デッキ掲示板">
          <TabPaneUploadedDecks
            handleSetDeckMain={handleSetDeckMain}
            handleSetDeckSide={handleSetDeckSide}
            handleSetActiveTab={handleSetActiveTab}
            dispatchSimulator={dispatchSimulator}
            activeTab={activeTab} // アクティブなタブ情報を渡す
          />
        </Tab>

        {/* ヘルプタブ */}
        <Tab eventKey={enumTabPane.HELP} title="ヘルプ" className="mx-2 mt-2">
          <div className="p-3">
            <h2>これは何？</h2>
            <p>
              すいーとポテト様が作成した機能をもとに、デッキコード発行とデッキ掲示板の機能を追加したアプリです。
              IDを発行する性質上ポテト様版の方が圧倒的に動作スピードが速いため、デッキコード発行やデッキ掲示板を利用しない場合は、元サイトをお使いください。
              <a href="https://sweetpotato.github.io/ijinden-deck-builder/" target="_blank" rel="noopener noreferrer">元サイト</a>
            </p>
            <p>また、下記3点に関してのお問い合わせはムヨンまでお願いします。</p>
            <ol>
              <li>掲示板機能とデッキコード発行機能を、独自に追加したものになります。</li>
              <li>サーバ側（AWS）でのデッキコードの管理などは、ムヨンによる管理となります。</li>
              <li>当サイトの運営はムヨンにて行っております。</li>
            </ol>

            <h2>マイデッキ利用時のご注意</h2>
            <Alert variant="warning">
              マイデッキに保存されたデッキは、自動でコードが発行されます。
              この時点ではデッキが公開されるわけではありませんが、コードが漏洩すると他のユーザーがそのデッキを利用できるようになります。
              また、コードを発行するため、少しの間通信が必要です。軽快な動作を優先する場合は、すいーとポテト様のサイトをご利用ください。
            </Alert>

            <h2>デッキアップロードについて</h2>
            <Alert variant="info">
              マイデッキに保存されたデッキは、デッキ掲示板にアップロード可能です。
              デッキアップロード時は、デッキ名、説明、キーワードを設定してください。
              キーワードは複数設定可能で、デッキ検索時に利用されます。
              作者名やデッキタイプ、キーカードなどを設定しておくと、他のユーザーがデッキを探しやすくなります。
            </Alert>

            <h2>デッキ掲示板について</h2>
            <Alert variant="warning">
              デッキ掲示板には、他のユーザーが公開したデッキが表示されます。
              タブを開いたら、最新10件のデッキが表示されます。
              また、デッキアップロード時に設定されたキーワードで検索することもできます。(キーワードに合致するデッキのうち最新50件まで)
            </Alert>

            <h2>共有リンクについて</h2>
            <Alert variant="info">
              レシピタブの「リンクをコピー」で、レシピの中身をそのまま埋め込んだ共有リンクを作れます。
              サーバーには何も保存されないため、リンクを渡すだけでデッキを共有できます。
              元サイト (すいーとポテト様版) の共有リンクと同じ形式なので、どちらのサイトで作ったリンクも相互に読み込めます。
              リンクの「#」以降にレシピが入っているので、短縮 URL などで切り落とされないようご注意ください。
            </Alert>

            <h2>特徴</h2>
            <ul>
              <li>デッキ枚数の上限なし</li>
              <li>デッキのカード枚数はカード名ごとに数字で表示</li>
              <li>カード一覧は「カード名」表示と「カード画像」表示を切り替え可能</li>
              <li>カード名表示のときは効果テキストの表示を on/off 可能</li>
              <li>メインデッキとサイドデッキを別個に管理可能</li>
              <li>デッキのカードの並びは種類、レベル、色、魔力コスト、エキスパンション順</li>
              <li>レシピを「マイデッキ」としてブラウザに保存可能</li>
              <li>カード画像は軽量なサムネイルを当サイトから配信 (公式画像の読み込み待ちが不要)</li>
            </ul>

            <h2>連絡先</h2>
            <p>
              ムヨン &lt;rethesims AT yahoo DOT co DOT jp&gt;
            </p>
          </div>
        </Tab>
      </Tabs>
    </>
  );
}

export default App;
