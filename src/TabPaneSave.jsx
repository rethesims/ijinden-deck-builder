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

// 必要なインポートを再度追加
import { dataCardsArrayForDeck } from './dataCards';
import ImageCard from './ImageCard';
import { enumActionSimulator } from './reducerSimulator';
import enumTabPane from './enumTabPane';

// 未使用のインポートを削除
// import { dataCardsArrayForDeck } from './dataCards';
// import enumTabPane from './enumTabPane';
// import ImageCard from './ImageCard';
// import { enumActionSimulator } from './reducerSimulator';
// import { sum } from './utils';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage('削除に失敗しました。再試行してください。');
      setShowErrorModal(true);
    } finally {
      setShowModalClear(false);
    }
  }

  async function handleDeduplicateAndResetIds() {
    if (!decksSaved || decksSaved.length === 0) {
      setErrorMessage('保存済みレシピがありません。');
      setShowErrorModal(true);
      return;
    }

    const uniqueDecks = [];
    const seenCodes = new Set();

    decksSaved.reverse().forEach((deck) => {
      if (!seenCodes.has(deck.code)) {
        seenCodes.add(deck.code);
        uniqueDecks.push(deck);
      }
    });

    try {
      await db.decks.clear();
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

      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage('データ再登録に失敗しました。');
      setShowErrorModal(true);
    }
  }

  async function handleImportDeckByCode(importDeckCode) {
    if (!importDeckCode) {
      setErrorMessage('デッキコードが入力されていません');
      setShowErrorModal(true);
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

      const timestamp = new Date(deckData.timestamp || Date.now());
      const objectMain = deckData.main || [];
      const objectSide = deckData.side || [];
      const maxId = await db.decks
        .toCollection()
        .keys()
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

      handleSetDeckMain(new Map(objectMain));
      handleSetDeckSide(new Map(objectSide));

      setShowSuccessModal(true);
      setShowImportModal(false);
    } catch (error) {
      setErrorMessage(`デッキ読み込みに失敗しました: ${error.message}`);
      setShowErrorModal(true);
    }
  }

  // 条件に応じたコンテンツを定義
  let content;

  if (!decksSaved) {
    content = (
      <Spinner animation="border" role="status">
        <span className="visually-hidden">読み込み中...</span>
      </Spinner>
    );
  } else if (decksSaved.length === 0) {
    content = (
      <>
        <h2 className="m-2">保存済みデッキはありません</h2>
        <h2 className="m-2">操作</h2>
        <div className="m-2">
          <Button variant="outline-primary" onClick={() => setShowImportModal(true)}>
            デッキコードでインポート
          </Button>
        </div>
      </>
    );
  } else {
    content = (
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
      </>
    );
  }

  return (
    <>
      {content}

      {/* モーダルのレンダリング */}
      {/* 成功モーダル */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)}>
        <ModalHeader closeButton>
          <ModalTitle>成功</ModalTitle>
        </ModalHeader>
        <ModalBody>操作が正常に完了しました。</ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={() => setShowSuccessModal(false)}>
            閉じる
          </Button>
        </ModalFooter>
      </Modal>

      {/* エラーモーダル */}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)}>
        <ModalHeader closeButton>
          <ModalTitle>エラー</ModalTitle>
        </ModalHeader>
        <ModalBody>{errorMessage}</ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={() => setShowErrorModal(false)}>
            閉じる
          </Button>
        </ModalFooter>
      </Modal>

      {/* インポートモーダル */}
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

      {/* クリア確認モーダル */}
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

// ContainerDeckSaved コンポーネントの定義を追加
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
      // 成功時の処理を追加
    } catch (error) {
      // エラー処理を追加
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
      <ContainerDeckSavedPart title="メインデッキ" deckSaved={new Map(aDeckSaved.main)} />
      <ContainerDeckSavedPart title="サイドデッキ" deckSaved={new Map(aDeckSaved.side)} />
    </>
  );
}

// ContainerDeckSavedPart コンポーネントの定義を追加
function ContainerDeckSavedPart({ title, deckSaved }) {
  const totalCards = Array.from(deckSaved.values()).reduce((sum, val) => sum + val, 0);
  const titleFull = `${title} (${totalCards}枚)`;

  return (
    <>
      <h3 className="mb-1">{titleFull}</h3>
      <div className="overflow-auto mb-1" style={{ minHeight: 60, maxHeight: 300 }}>
        {/* 必要であれば dataCardsArrayForDeck や ImageCard を使用 */}
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

export default TabPaneSave;
