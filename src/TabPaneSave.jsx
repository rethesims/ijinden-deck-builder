import React, { useState } from 'react';
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
  Form,
} from 'react-bootstrap';
import { useLiveQuery } from 'dexie-react-hooks';
import db from './db';
import { dataCardsArrayForDeck } from './dataCards';
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [deckCode, setDeckCode] = useState('');
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
      alert('保存済みデッキがすべて削除されました。'); // eslint-disable-line no-alert
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
        };
        return db.decks.add(newDeck);
      });
      await Promise.all(promises);

      alert('データを整理し、IDを再設定しました。'); // eslint-disable-line no-alert
    } catch (error) {
      console.error('データ再登録中にエラー:', error); // eslint-disable-line no-console
      alert('データ再登録に失敗しました。'); // eslint-disable-line no-alert
    }
  }

  async function handleImportDeckByCode(importDeckCode) {
    if (!importDeckCode) {
      alert('デッキコードが入力されていません'); // eslint-disable-line no-alert
      return;
    }

    try {
      const response = await fetch('https://23axhh57na.execute-api.ap-northeast-1.amazonaws.com/v2/deck/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: importDeckCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'デッキデータの読み込みに失敗しました');
      }

      const deckData = data;

      // デッキデータの登録
      const timestamp = new Date(deckData.timestamp || Date.now());
      const objectMain = deckData.main || [];
      const objectSide = deckData.side || [];
      const maxId = await db.decks.toCollection().keys()
        .then((keys) => (keys.length > 0 ? Math.max(...keys) : 0));
      const currentId = maxId + 1;

      const objectDeck = {
        id: currentId,
        key: currentId,
        code: deckData.code,
        timestamp,
        main: objectMain,
        side: objectSide,
      };

      await db.decks.put(objectDeck);

      // デッキを設定
      handleSetDeckMain(new Map(objectMain));
      handleSetDeckSide(new Map(objectSide));

      alert(`デッキが正常に読み込まれました (コード: ${deckData.code})`); // eslint-disable-line no-alert
      setShowImportModal(false);
    } catch (error) {
      console.error('デッキ読み込み中にエラー:', error); // eslint-disable-line no-console
      alert(`デッキ読み込みに失敗しました: ${error.message}`); // eslint-disable-line no-alert
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
      <h2 className="m-2">操作</h2>
      <div className="m-2">
        <Button variant="outline-primary" onClick={() => setShowImportModal(true)}>
          デッキコードでインポート
        </Button>
        <Button variant="outline-danger" onClick={handleClickClear} className="ms-2">
          保存済みレシピをすべて削除
        </Button>
        <Button variant="outline-primary" onClick={handleDeduplicateAndResetIds} className="ms-2">
          重複を削除しIDを再設定
        </Button>
      </div>
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
        <ModalHeader closeButton>
          <ModalTitle>デッキインポート</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form.Group>
            <Form.Label>デッキコードを入力してください:</Form.Label>
            <Form.Control
              type="text"
              value={deckCode}
              onChange={(e) => setDeckCode(e.target.value)}
              placeholder="デッキコード"
            />
          </Form.Group>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={() => handleImportDeckByCode(deckCode)}>
            インポート
          </Button>
        </ModalFooter>
      </Modal>
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
      alert('デッキが削除されました。'); // eslint-disable-line no-alert
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
