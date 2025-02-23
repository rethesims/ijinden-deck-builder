import {
  useReducer,
  useState,
} from 'react';
import {
  Alert,
  Modal,
  Button,
  Spinner,
} from 'react-bootstrap';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

import TabPaneCard from './TabPaneCard';
import TabPaneDeck from './TabPaneDeck';
import TabPaneSimulator from './TabPaneSimulator';
import TabPaneUploadedDecks from './TabPaneUploadedDecks';
import enumTabPane from './enumTabPane';
import {
  enumStateSimulator,
  reducerSimulator,
} from './reducerSimulator';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [deckMain, setDeckMain] = useState(new Map());
  const [deckSide, setDeckSide] = useState(new Map());
  const [activeTab, setActiveTab] = useState(enumTabPane.CARD);
  const [, setActiveDeckSaved] = useState([]);
  const [stateSimulator, dispatchSimulator] = useReducer(
    reducerSimulator,
    enumStateSimulator.INITIAL,
  );

  // モーダル表示管理
  const [showModal, setShowModal] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 選択されたデッキID
  const [selectedDeckId, setSelectedDeckId] = useState(null);

  // 選択されたgroup_id
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // デッキ設定の関数
  function handleSetDeckMain(newDeckMain) {
    setDeckMain(newDeckMain);
  }

  function handleSetDeckSide(newDeckSide) {
    setDeckSide(newDeckSide);
  }

  function handleSetActiveTab(newActiveTab) {
    setActiveTab(newActiveTab);
  }

  function handleSetActiveDeckSaved(newActiveDeckSaved) {
    setActiveDeckSaved(newActiveDeckSaved);
  }

  // fetchを使ってデッキデータを取得
  async function fetchDeckData(deckId) {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(
        'https://bo28t7vh47.execute-api.ap-northeast-1.amazonaws.com/deck',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ group_id: 'sample', deck_id: deckId }), // デッキIDを送信
        },
      );

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const { mainDeck } = data;
      const objectMain = mainDeck || [];

      // まず、現在のデッキ状態を初期化
      setDeckMain(new Map(objectMain));

      setSelectedDeckId(deckId); // 選択したデッキIDを保存
      setSelectedGroupId('sample'); // 選択したgroup_idを保存

      // デッキ編集開始
      setActiveTab(enumTabPane.CARD);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to fetch deck data:', err);
      setError('デッキ情報の取得に失敗しました。もう一度試してください。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <h1 className="m-2">イジンデン デッキ作成_デッキ共有版</h1>

      {/* デッキ選択モーダル */}
      <Modal show={showModal} backdrop="static" keyboard={false}>
        <Modal.Header>
          <Modal.Title>編集するデッキを選択してください</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {isLoading ? (
            <div className="text-center">
              <Spinner animation="border" role="status" />
              <p>デッキ情報を取得中...</p>
            </div>
          ) : (
            <>
              <p>どのデッキを編集しますか？</p>
              <div className="d-flex justify-content-around">
                <Button variant="primary" onClick={() => fetchDeckData(1)}>
                  デッキ 1
                </Button>
                <Button variant="primary" onClick={() => fetchDeckData(2)}>
                  デッキ 2
                </Button>
                <Button variant="primary" onClick={() => fetchDeckData(3)}>
                  デッキ 3
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* メインコンテンツ */}
      {!showModal && (
        <Tabs
          activeKey={activeTab}
          defaultActiveKey={enumTabPane.CARD}
          transition={false}
          onSelect={(k) => {
            console.log('Selected Tab:', k);
            const tabKey = Number(k);
            setActiveTab(tabKey);
          }}
        >
          {/* カードタブ */}
          <Tab eventKey={enumTabPane.CARD} title="カード">
            <TabPaneCard
              deckMain={deckMain}
              handleSetDeckMain={handleSetDeckMain}
              deckSide={deckSide}
              handleSetDeckSide={handleSetDeckSide}
              dispatchSimulator={dispatchSimulator}
              selectedDeckId={selectedDeckId} // デッキIDを渡す
              selectedGroupId={selectedGroupId} // group_idを渡す
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
              selectedDeckId={selectedDeckId} // デッキIDを渡す
              selectedGroupId={selectedGroupId} // group_idを渡す
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
              activeTab={activeTab}
              selectedDeckId={selectedDeckId} // デッキIDを渡す
              selectedGroupId={selectedGroupId} // group_idを渡す
            />
          </Tab>
        </Tabs>
      )}
    </>
  );
}

export default App;
