import React, { useState, useEffect } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import { dataCardsArrayForDeck } from './dataCards';
import ImageCard from './ImageCard';
import enumTabPane from './enumTabPane';

const DTF = new Intl.DateTimeFormat([], {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const API_URL = 'https://bo28t7vh47.execute-api.ap-northeast-1.amazonaws.com/deckslist';

async function fetchDecks(groupId, setDecks, setErrorMessage) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      if (
        response.status === 404
        || errorData?.body === 'データが見つかりませんでした'
      ) {
        setDecks([]);
        setErrorMessage('デッキデータがありませんでした');
      } else {
        throw new Error(
          `デッキの取得に失敗しました。ステータスコード: ${response.status}`,
        );
      }
    } else {
      const data = await response.json();
      const decks = data.decks && data.decks.length > 0 ? data.decks : data;
      setDecks(decks);
      setErrorMessage('');
    }
  } catch (error) {
    setErrorMessage('デッキデータがありませんでした');
    setDecks([]);
  }
}

function TabPaneUploadedDecks({ activeTab, selectedGroupId }) {
  const [decks, setDecks] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (activeTab === enumTabPane.UPLOADED_DECKS) {
      fetchDecks(selectedGroupId, setDecks, setErrorMessage);
    }
  }, [activeTab, selectedGroupId]);

  let content;
  if (errorMessage) {
    content = (
      <div className="m-2">
        <Alert variant="danger">{errorMessage}</Alert>
      </div>
    );
  } else if (decks === null) {
    content = (
      <Spinner animation="border" role="status">
        <span className="visually-hidden">読み込み中...</span>
      </Spinner>
    );
  } else if (decks.length === 0) {
    content = <h2 className="m-2">デッキデータがありませんでした</h2>;
  } else {
    content = (
      <>
        <h2 className="m-2">アップロードされたデッキ</h2>
        {decks.map((deck, index) => (
          <ContainerUploadedDeck
            key={deck.code || deck.id || index}
            deck={deck}
          />
        ))}
      </>
    );
  }

  return <div>{content}</div>;
}

function ContainerUploadedDeck({ deck }) {
  function convertToMap(deckArray) {
    const deckMap = new Map();
    deckArray.forEach(([id, count]) => {
      deckMap.set(id, count);
    });
    return deckMap;
  }

  const mainDeckMap = convertToMap(deck.mainDeck || []);

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
        {deck.deck_id || 'デッキ名なし'}
        <br />
        {DTF.format(new Date(deck.timestamp || Date.now()))}
      </h3>
      <ContainerDeckPart title="メインデッキ" deckSaved={mainDeckMap} />
    </div>
  );
}

function ContainerDeckPart({ title, deckSaved }) {
  const totalCards = Array.from(deckSaved.values()).reduce(
    (sum, val) => sum + val,
    0,
  );
  const titleFull = `${title} (${totalCards}枚)`;

  return (
    <>
      <h4 className="mb-1">{titleFull}</h4>
      <div
        className="overflow-auto mb-1"
        style={{ minHeight: 60, maxHeight: 300 }}
      >
        {dataCardsArrayForDeck.map((card) => {
          if (deckSaved.has(card.id)) {
            return (
              <ImageCard
                key={card.id}
                imageUrl={card.imageUrl}
                alt={card.name}
                numCopies={deckSaved.get(card.id)}
                loading="lazy"
                scale={2}
              />
            );
          }
          return null;
        })}
      </div>
    </>
  );
}

export default TabPaneUploadedDecks;
