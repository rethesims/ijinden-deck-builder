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
import { URL_API_BASE, LENGTH_MAX_NAME } from './api';
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
  // タッチ端末で操作ボタンを出しているカード。メインとサイドで同じ
  // カードが並ぶため、どちら側かも込みで持つ。
  const [keyActive, setKeyActive] = useState(null);
  const [showModalEmpty, setShowModalEmpty] = useState(false);
  const [messageError, setMessageError] = useState(null);
  const [deckName, setDeckName] = useState('');

  function handleSetIdZoom(newIdZoom) {
    setIdZoom(newIdZoom);
  }

  function handleClearIdZoom() {
    setIdZoom(null);
  }

  function handleToggleActive(key) {
    setKeyActive((keyPrev) => (keyPrev === key ? null : key));
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
        name: deckName.trim().slice(0, LENGTH_MAX_NAME),
        timestamp,
        main: objectMain,
        side: objectSide,
      };

      // サーバーにデッキデータを送信
      const response = await fetch(`${URL_API_BASE}deck/add`, {
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
      // サーバーからのメッセージをそのまま画面に出さない (内部情報の露出を避ける)。
      setMessageError('デッキの保存に失敗しました。通信環境を確認して、もう一度お試しください。');
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
        <input
          type="text"
          value={deckName}
          placeholder="デッキ名"
          onChange={(e) => setDeckName(e.target.value)}
          maxLength={LENGTH_MAX_NAME}
        />
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
      <Modal show={messageError !== null} onHide={() => setMessageError(null)}>
        <ModalHeader closeButton>
          <ModalTitle>エラー</ModalTitle>
        </ModalHeader>
        <ModalBody>{messageError}</ModalBody>
        <ModalFooter>
          <Button variant="outline-secondary" onClick={() => setMessageError(null)}>OK</Button>
        </ModalFooter>
      </Modal>
      <h3 className="m-2">{titleMain}</h3>
      <div className="container-card-line-up container-deck-cards">
        {
          dataCardsArray.map((element) => (
            <ContainerDeckCard
              id={element.id}
              key={element.id}
              name={element.displayName}
              imageUrl={element.thumbUrl}
              deckThis={deckMain}
              handleSetDeckThis={handleSetDeckMain}
              deckThat={deckSide}
              handleSetDeckThat={handleSetDeckSide}
              handleSetIdZoom={handleSetIdZoom}
              dispatchSimulator={dispatchSimulator}
              keyActive={keyActive}
              handleToggleActive={handleToggleActive}
            />
          ))
        }
      </div>
      <h3 className="m-2">{titleSide}</h3>
      <div className="container-card-line-up container-deck-cards">
        {
          dataCardsArray.map((element) => (
            <ContainerDeckCard
              id={element.id}
              key={element.id}
              name={element.displayName}
              imageUrl={element.thumbUrl}
              deckThis={deckSide}
              handleSetDeckThis={handleSetDeckSide}
              deckThat={deckMain}
              handleSetDeckThat={handleSetDeckMain}
              handleSetIdZoom={handleSetIdZoom}
              dispatchSimulator={dispatchSimulator}
              keyActive={keyActive}
              handleToggleActive={handleToggleActive}
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
                <ModalTitle>{dataCardsMap.get(idZoom).displayName}</ModalTitle>
              </ModalHeader>
              <ModalBody>
                {/* 拡大表示のときだけ公式サイトの原寸画像を読み込む。 */}
                <img
                  src={dataCardsMap.get(idZoom).imageUrl}
                  alt={dataCardsMap.get(idZoom).displayName}
                  style={{ width: '100%', height: 'auto' }}
                  decoding="async"
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
  handleSetIdZoom, dispatchSimulator, keyActive, handleToggleActive, isSide = false,
}) {
  function handleClickMinus() {
    handleClickDecrement(id, handleSetDeckThis);
    if (!isSide) {
      dispatchSimulator(enumActionSimulator.INTERRUPT);
    }
  }

  function handleClickPlus() {
    handleClickIncrement(id, handleSetDeckThis);
    if (!isSide) {
      dispatchSimulator(enumActionSimulator.INTERRUPT);
    }
  }

  function handleClickMove() {
    handleClickDecrement(id, handleSetDeckThis);
    handleClickIncrement(id, handleSetDeckThat);
    dispatchSimulator(enumActionSimulator.INTERRUPT);
  }

  function handleClickZoom() {
    handleSetIdZoom(id);
  }

  const numCopies = deckThis.has(id) ? deckThis.get(id) : 0;
  const moveText = isSide ? '^' : 'v';
  const key = `${isSide ? 'side' : 'main'}-${id}`;
  return numCopies > 0
    && (
      <ImageCard
        imageUrl={imageUrl}
        alt={name}
        numCopies={numCopies}
        isActive={keyActive === key}
        handleClickImage={() => handleToggleActive(key)}
      >
        <Button variant="primary" size="sm" className="btn-pop" onClick={handleClickMinus}>-</Button>
        <Button variant="primary" size="sm" className="btn-push" onClick={handleClickPlus}>+</Button>
        <Button variant="primary" size="sm" className="btn-move" onClick={handleClickMove}>{moveText}</Button>
        <Button variant="primary" size="sm" className="btn-zoom" onClick={handleClickZoom}>🔍</Button>
      </ImageCard>
    );
}

export default TabPaneDeck;
