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
import { enumActionSimulator } from './reducerSimulator';
import { sum } from './utils';

// サーバーに在庫を更新する
async function updateStockOnServer(groupId, cardId, delta, deckId, deckMain) {
  try {
    const objectMain = [...deckMain.entries()];
    const objectDeck = { main: objectMain };
    const response = await fetch(
      'https://bo28t7vh47.execute-api.ap-northeast-1.amazonaws.com/update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          id: cardId,
          value: delta,
          deck_id: deckId,
          deck_data: JSON.stringify({ deckData: objectDeck }),
        }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to update stock: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    if (data?.value === cardId) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function TabPaneDeck({
  deckMain, handleSetDeckMain, deckSide, handleSetDeckSide,
  dispatchSimulator,
  selectedDeckId, selectedGroupId,
}) {
  const [idZoom, setIdZoom] = useState(null);
  const [showModalEmpty, setShowModalEmpty] = useState(false);

  function handleSetIdZoom(newIdZoom) {
    setIdZoom(newIdZoom);
  }

  function handleClearIdZoom() {
    setIdZoom(null);
  }

  async function handleClickClear() {
    const newDeck = new Map(deckMain);
    const tasks = [];

    for (const [cardId, count] of newDeck.entries()) {
      for (let i = 0; i < count; i++) {
        const currentCount = newDeck.get(cardId) ?? 0;
        if (currentCount <= 1) {
          newDeck.delete(cardId);
        } else {
          newDeck.set(cardId, currentCount - 1);
        }
        handleSetDeckMain(new Map(newDeck));
        tasks.push(
          updateStockOnServer(
            selectedGroupId,
            cardId,
            +1,
            selectedDeckId,
            newDeck,
          ),
        );
      }
    }

    await Promise.all(tasks);
    dispatchSimulator(enumActionSimulator.INTERRUPT);
  }

  function handleClickConfirmEmpty() {
    setShowModalEmpty(false);
  }

  const numCardsMain = sum(deckMain.values());
  const titleMain = `メインデッキ (${numCardsMain}枚)`;

  return (
    <>
      <h2 className="m-2">デッキレシピ</h2>
      <div className="container-button mx-2 mt-2 mb-3">
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
              selectedDeckId={selectedDeckId}
              selectedGroupId={selectedGroupId}
            />
          ))
        }
      </div>
      {
        idZoom !== null && (
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
  id,
  imageUrl,
  name,
  deckThis,
  handleSetDeckThis,
  handleSetIdZoom,
  dispatchSimulator,
  isSide = false,
  selectedDeckId,
  selectedGroupId,
}) {
  async function handleClickPlus() {
    const newDeck = new Map(deckThis);
    const currentCount = newDeck.get(id) ?? 0;
    newDeck.set(id, currentCount + 1);
    handleSetDeckThis(newDeck);

    if (!isSide) {
      dispatchSimulator(enumActionSimulator.INTERRUPT);
    }

    const result = await updateStockOnServer(
      selectedGroupId,
      id,
      -1,
      selectedDeckId,
      newDeck,
    );
    if (!result) {
      const rollbackDeck = new Map(deckThis);
      const rollbackCount = rollbackDeck.get(id) ?? 0;
      rollbackDeck.set(id, rollbackCount);
      handleSetDeckThis(rollbackDeck);
    }
  }
  async function handleClickMinus() {
    const newDeck = new Map(deckThis);
    const currentCount = newDeck.get(id) ?? 0;
    if (currentCount <= 1) {
      newDeck.delete(id);
    } else {
      newDeck.set(id, currentCount - 1);
    }
    handleSetDeckThis(newDeck);

    if (!isSide) {
      dispatchSimulator(enumActionSimulator.INTERRUPT);
    }

    const result = await updateStockOnServer(
      selectedGroupId,
      id,
      +1,
      selectedDeckId,
      newDeck,
    );
    if (!result) {
      const rollbackDeck = new Map(deckThis);
      const rollbackCount = rollbackDeck.get(id) ?? 0;
      rollbackDeck.set(id, rollbackCount);
      handleSetDeckThis(rollbackDeck);
    }
  }

  function handleClickMove() {
    handleClickMinus();
    handleClickPlus();
    dispatchSimulator(enumActionSimulator.INTERRUPT);
  }

  function handleClickZoom() {
    handleSetIdZoom(id);
  }

  const numCopies = deckThis.has(id) ? deckThis.get(id) : 0;
  const moveText = isSide ? '^' : 'v';

  return (
    numCopies > 0 && (
      <ImageCard imageUrl={imageUrl} alt={name} numCopies={numCopies}>
        <Button variant="primary" size="sm" className="btn-pop" onClick={handleClickMinus}>
          -
        </Button>
        <Button variant="primary" size="sm" className="btn-push" onClick={handleClickPlus}>
          +
        </Button>
        <Button variant="primary" size="sm" className="btn-move" onClick={handleClickMove}>
          {moveText}
        </Button>
        <Button variant="primary" size="sm" className="btn-zoom" onClick={handleClickZoom}>
          🔍
        </Button>
      </ImageCard>
    )
  );
}

export default TabPaneDeck;
