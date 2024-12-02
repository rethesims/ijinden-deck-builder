import React, { useState, useEffect, useRef } from 'react';
import {
  Button, Spinner, Alert, Form, InputGroup,
} from 'react-bootstrap';
import cardsJson from './cards.json';
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

const urlBase = 'https://23axhh57na.execute-api.ap-northeast-1.amazonaws.com/v2/';

async function fetchUploadedDecks(searchURL, searchData, setUploadedDecks, setErrorMessage) {
  try {
    const response = await fetch(
      searchURL,
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
  const [cardKeyword, setCardKeyword] = useState('親鸞'); // カード検索用
  const [suggestions, setSuggestions] = useState([]); // 予測変換候補
  const cards = cardsJson; // インポートした cards.json を利用

  useEffect(() => {
    if (activeTab === enumTabPane.UPLOADED_DECKS) {
      // デフォルト検索条件でリセットして検索
      const searchData = { keyword: 'deck', get_count: 10 }; // デフォルト検索用
      const searchURL = `${urlBase}decks/search`;
      setKeyword('親鸞'); // 検索フォームのキーワードもリセット
      setCardKeyword('親鸞'); // カード検索用もリセット
      fetchUploadedDecks(searchURL, searchData, setUploadedDecks, setErrorMessage);
    } else {
      setUploadedDecks(null); // タブが変わったらデータをリセット
    }
  }, [activeTab]); // activeTabの変更を監視

  const handleSearch = () => {
    // 前回の結果をリセット
    setUploadedDecks(null);
    setErrorMessage('');

    const searchData = { keyword, get_count: 50 };
    const searchURL = `${urlBase}decks/search`;
    fetchUploadedDecks(searchURL, searchData, setUploadedDecks, setErrorMessage);
  };

  const handleCardSearch = () => {
    // 前回の結果をリセット
    setUploadedDecks(null);
    setErrorMessage('');

    // カード名からIDを取得
    const selectedCard = cards.find((card) => card.name === cardKeyword);
    if (!selectedCard) {
      setErrorMessage('該当するカードが見つかりません');
      return;
    }

    // 選択されたカード名から id を取得
    const searchId = selectedCard ? selectedCard.id : '';
    const searchData = { keyword: searchId, get_count: 50 };
    const searchURL = `${urlBase}card/search`;
    fetchUploadedDecks(searchURL, searchData, setUploadedDecks, setErrorMessage);
  };

  // useRef でデバウンスタイムアウトを保持
  const debounceTimeout = useRef(null);

  const handleInputChange = (e) => {
    const { value } = e.target; // 入力値を取得
    setCardKeyword(value); // 状態を更新

    // 入力が空の場合、候補をクリア
    if (!value.trim()) {
      setSuggestions([]); // 候補リストをクリア
      return;
    }
    // デバウンス処理を追加
    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      const filteredSuggestions = cards
        .filter((card) => card.name.includes(value))
        .slice(0, 50)
        .map((card) => card.name);

      setSuggestions(filteredSuggestions);
    }, 300); // 300ms 待機
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
        {/* キーワード検索 */}
        <InputGroup>
          <Form.Control
            type="text"
            value={keyword}
            placeholder="キーワードを入力"
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button variant="primary" onClick={handleSearch}>
            キーワード検索
          </Button>
        </InputGroup>
      </div>

      <div className="m-3">
        {/* カード検索 */}
        <InputGroup>
          <Form.Control
            id="cardSearchInput"
            type="text"
            value={cardKeyword} // 修正後は別の状態を利用
            placeholder="カード名を入力"
            onChange={handleInputChange}
            list="cardSuggestions"
            aria-label="カード名を入力"
          />
          <datalist id="cardSuggestions">
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} aria-label={suggestion} />
            ))}
          </datalist>
          <Button variant="secondary" onClick={handleCardSearch}>
            カード検索
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
      <p>
        {deck.description
          ? deck.description.split('\n').map((line) => (
            <React.Fragment key={line}>
              {line}
              <br />
            </React.Fragment>
          ))
          : '説明なし'}
      </p>
      <h4 className="mt-3">キーワード</h4>
      <ul>
        {(deck.keywords || []).map((keyword) => (
          <li key={keyword}>{keyword}</li>
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
