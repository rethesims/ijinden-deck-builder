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

// 一意のIDを生成する関数
let keywordIdCounter = 0;
function generateId() {
  keywordIdCounter += 1;
  return keywordIdCounter;
}

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
  const [errorModalMessage, setErrorModalMessage] = useState(''); // 修正: 名前変更
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deckToUpload, setDeckToUpload] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [keywords, setKeywords] = useState([{ id: generateId(), value: '' }]);
  const [deckDescription, setDeckDescription] = useState('');
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
      setErrorModalMessage('削除に失敗しました。再試行してください。');
      setShowErrorModal(true);
    } finally {
      setShowModalClear(false);
    }
  }

  async function handleDeduplicateAndResetIds() {
    if (!decksSaved || decksSaved.length === 0) {
      setErrorModalMessage('保存済みレシピがありません。');
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
      setErrorModalMessage('データ再登録に失敗しました。');
      setShowErrorModal(true);
    }
  }

  async function handleImportDeckByCode(importDeckCode) {
    if (!importDeckCode) {
      setErrorModalMessage('デッキコードが入力されていません');
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
      setErrorModalMessage(`デッキ読み込みに失敗しました: ${error.message}`);
      setShowErrorModal(true);
    }
  }

  function handleUploadClick(aDeckSaved) {
    setDeckToUpload(aDeckSaved);
    setShowUploadModal(true);
  }

  function handleKeywordChange(id, value) {
    const newKeywords = keywords.map((kw) => (kw.id === id ? { ...kw, value } : kw));
    setKeywords(newKeywords);
  }

  function addKeywordInput() {
    setKeywords([...keywords, { id: generateId(), value: '' }]);
  }

  function removeKeywordInput(id) {
    if (keywords.length === 1) return;
    const newKeywords = keywords.filter((kw) => kw.id !== id);
    setKeywords(newKeywords);
  }

  async function handleUploadDeck() {
    if (!deckName.trim()) {
      setErrorModalMessage('デッキ名を入力してください');
      setShowErrorModal(true);
      return;
    }

    const keywordsArray = keywords.map((kw) => kw.value.trim()).filter((kw) => kw);

    const dataToUpload = {
      name: deckName,
      keywords: keywordsArray,
      description: deckDescription,
      deckData: {
        main: deckToUpload.main,
        side: deckToUpload.side,
        code: deckToUpload.code,
      },
    };

    try {
      const response = await fetch('https://23axhh57na.execute-api.ap-northeast-1.amazonaws.com/v2/deck/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToUpload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const serverErrorMessage = errorData || 'アップロードに失敗しました';

        if (serverErrorMessage.includes('同じデッキが既に存在します')) {
          setErrorModalMessage('同じデッキが既に存在します');
        } else {
          setErrorModalMessage(serverErrorMessage);
        }
        throw new Error(serverErrorMessage);
      }

      setShowSuccessModal(true);
      setShowUploadModal(false);
      setDeckName('');
      setKeywords([{ id: generateId(), value: '' }]);
      setDeckDescription('');
    } catch (error) {
      setErrorModalMessage(error.message);
      setShowErrorModal(true);
    }
  }

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
        <Button variant="outline-primary" onClick={() => setShowImportModal(true)}>
          デッキコードでインポート
        </Button>
      </>
    );
  } else {
    content = (
      <>
        <h2 className="m-2">ロード</h2>
        <Accordion activeKey={activeDeckSaved} onSelect={handleSelectAccordion}>
          {decksSaved.map((aDeckSaved) => (
            <AccordionItem key={aDeckSaved.id} eventKey={aDeckSaved.id}>
              <AccordionHeader>{`#${aDeckSaved.id}`}</AccordionHeader>
              <AccordionBody>
                <Button onClick={() => handleUploadClick(aDeckSaved)}>アップロード</Button>
              </AccordionBody>
            </AccordionItem>
          ))}
        </Accordion>
      </>
    );
  }

  return (
    <>
      {content}
      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)}>
        <ModalBody>{errorModalMessage}</ModalBody>
        <Button onClick={() => setShowErrorModal(false)}>閉じる</Button>
      </Modal>
    </>
  );
}

export default TabPaneSave;
