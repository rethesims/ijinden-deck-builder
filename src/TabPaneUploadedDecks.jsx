import React, { useState, useEffect } from 'react';
import {
  Button, Spinner, Alert, Form, InputGroup,
} from 'react-bootstrap';

import { dataCardsArrayForDeck } from './dataCards';
import ImageCard from './ImageCard';
import { enumActionSimulator } from './reducerSimulator';
import enumTabPane from './enumTabPane';

const DTF = new Intl.DateTimeFormat([], {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

async function fetchUploadedDecks(searchData, setUploadedDecks, setErrorMessage) {
  try {
    const response = await fetch(
      'https://23axhh57na.execute-api.ap-northeast-1.amazonaws.com/v2/decks/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 404 || errorData?.body === 'データが見つかりませんでした') {
        setUploadedDecks([]);
        setErrorMessage('デッキデータがありませんでした');
      } else {
        throw new Error(`デッキの取得に失敗しました。ステータスコード: ${response.status}`);
      }
    } else {
      const data = await response.json();
      const decks = data.decks && data.decks.length > 0 ? data.decks : data;
      setUploadedDecks(decks);
      setErrorMessage('');
    }
  } catch (error) {
    console.error('API Error:', error);
    // ネットワークエラーやその他エラーの場合も特定のメッセージを表示
    setErrorMessage('デッキデータがありませんでした');
    setUploadedDecks([]);
  }
}

function TabPaneUploadedDecks({
  handleSetDeckMain,
  handleSetDeckSide,
  handleSetActiveTab,
  dispatchSimulator,
  activeTab,
}) {
  const [uploadedDecks, setUploadedDecks] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [keyword, setKeyword] = useState('親鸞'); // 検索フォームのデフォルト値
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 初回ロードフラグ

  useEffect(() => {
    if (activeTab === enumTabPane.UPLOADED_DECKS) {
      const searchData = isInitialLoad
        ? { keyword: 'deck', get_count: 10 } // 初回ロード用
        : { keyword, get_count: 50 }; // 通常検索用
      fetchUploadedDecks(searchData, setUploadedDecks, setErrorMessage);
      setIsInitialLoad(false); // 初回ロードが終わったらフラグをオフに
    } else {
      setUploadedDecks(null); // タブが変わったらデータをリセット
    }
  }, [activeTab]); // activeTabの変更を監視

  const handleSearch = () => {
    const searchData = { keyword, get_count: 50 }; // 検索用データ
    fetchUploadedDecks(searchData, setUploadedDecks, setErrorMessage);
  };

  let content;

  if (errorMessage) {
    content = (
      <div className="m-2">
        <Alert variant="danger">{errorMessage}</Alert>
      </div>
    );
  } else if (uploadedDecks === null) {
    content = (
      <Spinner animation="border" role="status">
        <span className="visually-hidden">読み込み中...</span>
      </Spinner>
    );
  } else if (uploadedDecks.length === 0) {
    content = <h2 className="m-2">デッキデータがありませんでした</h2>;
  } else {
    content = (
      <>
        <h2 className="m-2">アップロードされたデッキ</h2>
        {uploadedDecks.map((deck) => (
          <ContainerUploadedDeck
            key={deck.code || deck.id}
            deck={deck}
            handleSetDeckMain={handleSetDeckMain}
            handleSetDeckSide={handleSetDeckSide}
            handleSetActiveTab={handleSetActiveTab}
            dispatchSimulator={dispatchSimulator}
          />
        ))}
      </>
    );
  }

  return (
    <div>
      {/* 検索フォーム */}
      <div className="m-3">
        <InputGroup>
          <Form.Control
            type="text"
            value={keyword}
            placeholder="キーワードを入力"
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button variant="primary" onClick={handleSearch}>
            検索
          </Button>
        </InputGroup>
      </div>

      {/* コンテンツ */}
      {content}
    </div>
  );
}

function ContainerUploadedDeck({
  deck,
  handleSetDeckMain,
  handleSetDeckSide,
  handleSetActiveTab,
  dispatchSimulator,
}) {
  function convertToMap(deckArray) {
    const deckMap = new Map();
    deckArray.forEach(([id, count]) => {
      deckMap.set(id, count);
    });
    return deckMap;
  }

  const mainDeckMap = convertToMap(deck.main || []);
  const sideDeckMap = convertToMap(deck.side || []);

  return (
    <div
      className="mb-4 p-3"
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#f9f9f9',
      }}
    >
      <h3>
        {deck.name || 'デッキ名なし'}
        {' '}
        (
        {DTF.format(new Date(deck.timestamp || Date.now()))}
        )
      </h3>
      <ContainerDeckPart title="メインデッキ" deckSaved={mainDeckMap} />
      <ContainerDeckPart title="サイドデッキ" deckSaved={sideDeckMap} />
      <h4 className="mt-3">説明</h4>
      <p>{deck.description || '説明なし'}</p>
      <h4 className="mt-3">キーワード</h4>
      <ul>
        {(deck.keywords || []).map((keyword) => (
          <li key={keyword}>{keyword}</li> // keywordをキーに使用
        ))}
      </ul>
      <div className="container-button mt-2">
        <Button
          variant="outline-success"
          onClick={() => {
            handleSetDeckMain(mainDeckMap);
            handleSetDeckSide(sideDeckMap);
            dispatchSimulator(enumActionSimulator.INTERRUPT);
            handleSetActiveTab(enumTabPane.DECK);
          }}
        >
          読込み
        </Button>
      </div>
    </div>
  );
}

function ContainerDeckPart({ title, deckSaved }) {
  const totalCards = Array.from(deckSaved.values()).reduce((sum, val) => sum + val, 0);
  const titleFull = `${title} (${totalCards}枚)`;

  return (
    <>
      <h4 className="mb-1">{titleFull}</h4>
      <div className="overflow-auto mb-1" style={{ minHeight: 60, maxHeight: 300 }}>
        {dataCardsArrayForDeck.map((card) => (deckSaved.has(card.id) ? (
          <ImageCard
            key={card.id}
            imageUrl={card.imageUrl}
            alt={card.name}
            numCopies={deckSaved.get(card.id)}
            loading="lazy"
            small
          />
        ) : null))}
      </div>
    </>
  );
}

export default TabPaneUploadedDecks;
