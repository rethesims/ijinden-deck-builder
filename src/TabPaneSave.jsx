// SPDX-License-Identifier: MIT

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Spinner,
} from 'react-bootstrap';

import { dataCardsArrayForDeck } from './dataCards';
import db from './db';
import enumTabPane from './enumTabPane';
import ImageCard from './ImageCard';
import { enumActionSimulator } from './reducerSimulator';
import { sum } from './utils';

const DTF = new Intl.DateTimeFormat([], {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function TabPaneSave({
  handleSetDeckMain,
  handleSetDeckSide,
  activeDeckSaved,
  handleSetActiveDeckSaved,
  handleSetActiveTab,
  dispatchSimulator,
}) {
  const [showModalClear, setShowModalClear] = useState(false);
  const decksSaved = useLiveQuery(async () => db.decks.orderBy(':id').reverse().toArray(), []);

  function handleSelectAccordion(eventKey) {
    handleSetActiveDeckSaved(eventKey);
  }

  function handleClickClear() {
    setShowModalClear(true);
  }

  function handleClickCancelClear() {
    setShowModalClear(false);
  }

  async function handleClickConfirmClear() {
    try {
      await db.decks.clear();
    } catch (error) {
      console.error('デッキ削除中にエラー:', error); // eslint-disable-line no-console
      alert('削除に失敗しました。再試行してください。'); // eslint-disable-line no-alert
    } finally {
      setShowModalClear(false);
    }
  }

  async function handleDeduplicateAndResetIds() {
    if (!decksSaved || decksSaved.length === 0) {
      alert('保存済みレシピがありません。'); // eslint-disable-line no-alert
      return;
    }

    const uniqueDecks = [];
    const seenCodes = new Set();

    // 重複削除
    decksSaved.reverse().forEach((deck) => {
      if (!seenCodes.has(deck.code)) {
        seenCodes.add(deck.code);
        uniqueDecks.push(deck);
      }
    });

    // 再登録
    try {
      await db.decks.clear(); // 既存データをクリア
      const promises = uniqueDecks.map((deck, index) => {
        const newDeck = {
          id: index + 1,
          key: index + 1,
          code: deck.code,
          timestamp: deck.timestamp,
          main: deck.main,
          side: deck.side,
        }; // ショートハンド形式に修正
        return db.decks.add(newDeck);
      });
      await Promise.all(promises);
      // alert('データを整理し、IDを再設定しました。'); // eslint-disable-line no-alert

      // 重複削除後のデータをAPIに送信
      await sendDecksToAPI(uniqueDecks);
    } catch (error) {
      console.error('データ再登録中にエラー:', error); // eslint-disable-line no-console
      alert('データ再登録に失敗しました。'); // eslint-disable-line no-alert
    }
  }

  // 重複削除後のデータを指定されたAPIエンドポイントに送信
  async function sendDecksToAPI(decks) {
    try {
      const response = await fetch('https://23axhh57na.execute-api.ap-northeast-1.amazonaws.com/v2/user/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decks }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'データ送信に失敗しました');
      }

      console.log('APIレスポンス:', data); // eslint-disable-line no-console
      const userId = data.user_id; // `user_id` を `userId` に変更
      alert(`デッキ保存コード: ${userId}`); // eslint-disable-line no-alert
    } catch (error) {
      console.error('データ送信中にエラーが発生しました:', error); // eslint-disable-line no-console
      alert(`データ送信に失敗しました: ${error.message}`); // eslint-disable-line no-alert
    }
  }

  if (!decksSaved) {
    return (
      <Spinner animation="border" role="status">
        <span className="visually-hidden">読み込み中...</span>
      </Spinner>
    );
  }

  if (decksSaved.length === 0) {
    return <p>保存されたデッキがありません。</p>;
  }

  return (
    <>
      <h2 className="m-2">ロード</h2>
      <Accordion activeKey={activeDeckSaved} onSelect={handleSelectAccordion}>
        {decksSaved.map((aDeckSaved) => {
          const timestamp = DTF.format(new Date(aDeckSaved.timestamp));
          const code = aDeckSaved.code || 'コードなし';
          const header = `#${aDeckSaved.id} - コード: ${code} (${timestamp})`;

          return (
            <AccordionItem key={aDeckSaved.id} eventKey={aDeckSaved.id}>
              <AccordionHeader>{header}</AccordionHeader>
              <AccordionBody>
                <ContainerDeckSaved
                  aDeckSaved={aDeckSaved}
                  handleSetDeckMain={handleSetDeckMain}
                  handleSetDeckSide={handleSetDeckSide}
                  handleSetActiveTab={handleSetActiveTab}
                  dispatchSimulator={dispatchSimulator}
                />
              </AccordionBody>
            </AccordionItem>
          );
        })}
      </Accordion>
      <h2 className="m-2">クリア</h2>
      <div className="m-2">
        <Button variant="outline-danger" onClick={handleClickClear}>
          保存済みレシピをすべて削除
        </Button>
        <Button variant="outline-primary" onClick={handleDeduplicateAndResetIds} className="ms-2">
          重複を削除しIDを再設定
        </Button>
      </div>
      <Modal show={showModalClear} onHide={handleClickCancelClear}>
        <ModalHeader closeButton>
          <ModalTitle>マイデッキ</ModalTitle>
        </ModalHeader>
        <ModalBody>保存済みレシピをすべて削除します。よろしいですか？</ModalBody>
        <ModalFooter>
          <Button variant="outline-secondary" onClick={handleClickCancelClear}>
            キャンセル
          </Button>
          <Button variant="outline-danger" onClick={handleClickConfirmClear}>
            削除する
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

function ContainerDeckSaved({
  aDeckSaved,
  handleSetDeckMain,
  handleSetDeckSide,
  handleSetActiveTab,
  dispatchSimulator,
}) {
  function handleClickLoad() {
    handleSetDeckMain(new Map(aDeckSaved.main));
    handleSetDeckSide(new Map(aDeckSaved.side));
    dispatchSimulator(enumActionSimulator.INTERRUPT);
    handleSetActiveTab(enumTabPane.DECK);
  }

  async function handleClickDelete() {
    try {
      await db.decks.delete(aDeckSaved.id);
    } catch (error) {
      console.error('デッキ削除中にエラー:', error); // eslint-disable-line no-console
      alert('削除に失敗しました。再試行してください。'); // eslint-disable-line no-alert
    }
  }

  return (
    <>
      <div className="container-button mb-2">
        <Button variant="outline-success" onClick={handleClickLoad}>
          読込み
        </Button>
        <Button variant="outline-danger" onClick={handleClickDelete}>
          削除
        </Button>
      </div>
      <ContainerDeckSavedPart
        title="メインデッキ"
        deckSaved={new Map(aDeckSaved.main)}
      />
      <ContainerDeckSavedPart
        title="サイドデッキ"
        deckSaved={new Map(aDeckSaved.side)}
      />
    </>
  );
}

function ContainerDeckSavedPart({ title, deckSaved }) {
  const titleFull = `${title} (${sum(deckSaved.values())}枚)`;

  return (
    <>
      <h3 className="mb-1">{titleFull}</h3>
      <div className="overflow-auto mb-1" style={{ minHeight: 60, maxHeight: 300 }}>
        {dataCardsArrayForDeck.map((card) => (
          deckSaved.has(card.id) ? (
            <ImageCard
              key={card.id}
              imageUrl={card.imageUrl}
              alt={card.name}
              numCopies={deckSaved.get(card.id)}
              loading="lazy"
              small
            />
          ) : null
        ))}
      </div>
    </>
  );
}

export default TabPaneSave;
