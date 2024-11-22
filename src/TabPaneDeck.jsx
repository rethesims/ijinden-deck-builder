// SPDX-License-Identifier: MIT

import { useState } from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from 'react-bootstrap';

import ImageCard from './ImageCard';
import { dataCardsArrayForDeck as dataCardsArray, dataCardsMap } from './dataCards';
import db from './db';
import enumTabPane from './enumTabPane';
import { handleClickDecrement, handleClickIncrement } from './handleClick';
import { enumActionSimulator } from './reducerSimulator';
import { sum } from './utils';

function TabPaneDeck({
  deckMain, handleSetDeckMain, deckSide, handleSetDeckSide,
  handleSetActiveDeckSaved, handleSetActiveTab, dispatchSimulator,
}) {
  const [idZoom, setIdZoom] = useState(null);
  const [showModalEmpty, setShowModalEmpty] = useState(false);

  function handleSetIdZoom(newIdZoom) {
    setIdZoom(newIdZoom);
  }

  function handleClearIdZoom() {
    setIdZoom(null);
  }

  async function handleClickSave() {
    if (deckMain.size === 0 && deckSide.size === 0) {
      setShowModalEmpty(true);
      return;
    }

    const timestamp = new Date();
    const objectMain = [...deckMain.entries()];
    const objectSide = [...deckSide.entries()];

    try {
      // 現在の保存データの最大 ID を取得
      const maxId = await db.decks.toCollection().keys()
        .then((keys) => (keys.length > 0 ? Math.max(...keys) : 0)); // 最大値がなければ 0 を返す
      const currentId = maxId + 1; // 最大値の次の数

      // デッキデータ作成
      const objectDeck = {
        id: currentId, // 手動で id を設定
        key: currentId, // 同じ値を key にも設定
        timestamp,
        main: objectMain,
        side: objectSide,
      };

      // サーバーにデッキデータを送信
      const response = await fetch('https://23axhh57na.execute-api.ap-northeast-1.amazonaws.com/v2/deck/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckData: objectDeck }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'デッキの送信に失敗しました');
      }

      objectDeck.code = data.code; // サーバーから返却されたコードを保存

      // IndexedDB に保存
      await db.decks.put(objectDeck); // 手動で設定した id をそのまま保存

      // アクティブデッキとタブの更新
      handleSetActiveDeckSaved(currentId);
      handleSetActiveTab(enumTabPane.SAVE_AND_LOAD);
    } catch (error) {
      console.error('デッキ送信中にエラーが発生しました:', error);
      alert(`デッキ送信に失敗しました: ${error.message}`);
    }
  }

  function handleClickClear() {
    handleSetDeckMain(new Map());
    handleSetDeckSide(new Map());
    dispatchSimulator(enumActionSimulator.INTERRUPT);
  }

  function handleClickConfirmEmpty() {
    setShowModalEmpty(false);
  }

  const numCardsMain = sum(deckMain.values());
  const numCardsSide = sum(deckSide.values());

  const titleMain = `メインデッキ (${numCardsMain}枚)`;
  const titleSide = `サイドデッキ (${numCardsSide}枚)`;

  return (
    <>
      <h2 className="m-2">デッキレシピ</h2>
      <div className="container-button mx-2 mt-2 mb-3">
        <Button variant="outline-success" onClick={handleClickSave}>マイデッキに保存</Button>
        <Button variant="outline-danger" onClick={handleClickClear}>レシピをクリア</Button>
      </div>
      <Modal show={showModalEmpty}>
        <ModalHeader>
          <ModalTitle>マイデッキ</ModalTitle>
        </ModalHeader>
        <ModalBody>現在のレシピが空のため保存できません。</ModalBody>
        <ModalFooter>
          <Button variant="outline-secondary" onClick={handleClickConfirmEmpty}>OK</Button>
        </ModalFooter>
      </Modal>
      <h3 className="m-2">{titleMain}</h3>
      <div className="container-card-line-up ms-2">
        {
          dataCardsArray.map((element) => (
            <ContainerDeckCard
              id={element.id}
              key={element.id}
              name={element.name}
              imageUrl={element.imageUrl}
              deckThis={deckMain}
              handleSetDeckThis={handleSetDeckMain}
              deckThat={deckSide}
              handleSetDeckThat={handleSetDeckSide}
              handleSetIdZoom={handleSetIdZoom}
              dispatchSimulator={dispatchSimulator}
            />
          ))
        }
      </div>
      <h3 className="m-2">{titleSide}</h3>
      <div className="container-card-line-up ms-2">
        {
          dataCardsArray.map((element) => (
            <ContainerDeckCard
              id={element.id}
              key={element.id}
              name={element.name}
              imageUrl={element.imageUrl}
              deckThis={deckSide}
              handleSetDeckThis={handleSetDeckSide}
              deckThat={deckMain}
              handleSetDeckThat={handleSetDeckMain}
              handleSetIdZoom={handleSetIdZoom}
              dispatchSimulator={dispatchSimulator}
              isSide
            />
          ))
        }
      </div>
      {
        idZoom !== null
          && (
            <Modal show onHide={handleClearIdZoom}>
              <ModalHeader closeButton>
                <ModalTitle>{dataCardsMap.get(idZoom).name}</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <img
                  src={dataCardsMap.get(idZoom).imageUrl}
                  alt={dataCardsMap.get(idZoom).name}
                  style={{ width: '100%', height: 'auto' }}
                />
              </ModalBody>
            </Modal>
          )
      }
    </>
  );
}

function ContainerDeckCard({
  id, imageUrl, name,
  deckThis, handleSetDeckThis, deckThat, handleSetDeckThat,
  handleSetIdZoom, dispatchSimulator, isSide = false,
}) {
  function handleClickMinus() {
    handleClickDecrement(id, deckThis, handleSetDeckThis);
    if (!isSide) {
      dispatchSimulator(enumActionSimulator.INTERRUPT);
    }
  }

  function handleClickPlus() {
    handleClickIncrement(id, deckThis, handleSetDeckThis);
    if (!isSide) {
      dispatchSimulator(enumActionSimulator.INTERRUPT);
    }
  }

  function handleClickMove() {
    handleClickDecrement(id, deckThis, handleSetDeckThis);
    handleClickIncrement(id, deckThat, handleSetDeckThat);
    dispatchSimulator(enumActionSimulator.INTERRUPT);
  }

  function handleClickZoom() {
    handleSetIdZoom(id);
  }

  const numCopies = deckThis.has(id) ? deckThis.get(id) : 0;
  const moveText = isSide ? '^' : 'v';
  return numCopies > 0
    && (
      <ImageCard imageUrl={imageUrl} alt={name} numCopies={numCopies}>
        <Button variant="primary" size="sm" className="btn-pop" onClick={handleClickMinus}>-</Button>
        <Button variant="primary" size="sm" className="btn-push" onClick={handleClickPlus}>+</Button>
        <Button variant="primary" size="sm" className="btn-move" onClick={handleClickMove}>{moveText}</Button>
        <Button variant="primary" size="sm" className="btn-zoom" onClick={handleClickZoom}>🔍</Button>
      </ImageCard>
    );
}

export default TabPaneDeck;
