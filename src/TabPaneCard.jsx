// SPDX-License-Identifier: MIT
/* eslint-disable no-bitwise */

import { useState, useEffect } from 'react';
import {
  Button, FormControl, InputGroup, Table, ToggleButton,
} from 'react-bootstrap';

import { dataCardsArrayForTable as dataCards } from './dataCards';
import { handleClickDecrement, handleClickIncrement } from './handleClick';
import { enumActionSimulator } from './reducerSimulator';

const dataExpansions = [
  { value: 0, label: 'すべて' },
  { value: 10, label: '伝説の武将' },
  { value: 11, label: '知と美の革命' },
  { value: 12, label: '日本の大天才' },
  { value: 15, label: '第１弾ブースター' },
  { value: 20, label: '三国の英傑' },
  { value: 25, label: '第２弾ブースター' },
  { value: 30, label: '発展する医療' },
  { value: 35, label: '第３弾ブースター' },
];

const dataColors = [
  { value: 0, label: 'すべて' },
  { value: 1, label: '赤' },
  { value: 2, label: '青' },
  { value: 4, label: '緑' },
  { value: 8, label: '黄' },
  { value: 16, label: '紫' },
  { value: 32, label: '多色' },
  { value: 64, label: '無色' },
];

const dataTypes = [
  { value: 0, label: 'すべて' },
  { value: 1, label: 'イジン' },
  { value: 2, label: 'ハイケイ' },
  { value: 3, label: 'マホウ' },
  { value: 4, label: 'マリョク' },
];

const dataTerms = [
  { value: 0, label: '指定なし' },
  { value: 1, label: '航海' },
  { value: 2, label: '執筆' },
  { value: 3, label: '決起' },
  { value: 4, label: '徴募' },
];

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
      throw new Error(`Failed to update stock: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data?.value === cardId) {
      return data;
    }
    return null;
  } catch (err) {
    return null;
  }
}

function TabPaneCard({
  deckMain,
  handleSetDeckMain,
  dispatchSimulator,
  selectedDeckId,
  selectedGroupId,
}) {
  const [expansion, setExpansion] = useState(0);
  const [color, setColor] = useState(0);
  const [type, setType] = useState(0);
  const [term, setTerm] = useState(0);
  const [stockInfo, setStockInfo] = useState({});

  async function fetchStock() {
    try {
      const response = await fetch(
        'https://bo28t7vh47.execute-api.ap-northeast-1.amazonaws.com/stock',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group_id: 'sample' }),
        },
      );
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setStockInfo(data);
    } catch (err) {
      // omitted console
    }
  }

  useEffect(() => {
    fetchStock();
    const intervalId = setInterval(() => {
      fetchStock();
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <ContainerFilter
        title="エキスパンション"
        name="expansion"
        state={expansion}
        handleChange={(e) => setExpansion(Number(e.currentTarget.value))}
        data={dataExpansions}
      />
      <ContainerFilter
        title="色"
        name="color"
        state={color}
        handleChange={(e) => setColor(Number(e.currentTarget.value))}
        data={dataColors}
      />
      <ContainerFilter
        title="種類"
        name="type"
        state={type}
        handleChange={(e) => setType(Number(e.currentTarget.value))}
        data={dataTypes}
      />
      <ContainerFilter
        title="能力語"
        name="term"
        state={term}
        handleChange={(e) => setTerm(Number(e.currentTarget.value))}
        data={dataTerms}
      />
      <Table hover variant="light">
        <thead className="sticky-top">
          <tr>
            <th scope="col">ID</th>
            <th scope="col">カード名</th>
            <th scope="col">残り枚数</th>
            <th scope="col">メイン</th>
          </tr>
        </thead>
        <tbody>
          {dataCards.map((element) => (
            <TableRowCard
              key={element.id}
              id={element.id}
              name={element.name}
              expansion={element.expansion}
              color={element.color}
              type={element.type}
              term={element.term}
              selectedExpansion={expansion}
              selectedColor={color}
              selectedType={type}
              selectedTerm={term}
              deckMain={deckMain}
              handleSetDeckMain={handleSetDeckMain}
              dispatchSimulator={dispatchSimulator}
              stockInfo={stockInfo}
              setStockInfo={setStockInfo}
              selectedDeckId={selectedDeckId}
              selectedGroupId={selectedGroupId}
            />
          ))}
        </tbody>
      </Table>
    </>
  );
}

function ContainerFilter({
  title, name, state, handleChange, data,
}) {
  return (
    <fieldset className="container-button m-2">
      <legend className="h3">{title}</legend>
      {data.map((element) => {
        const id = `${name}-${element.value}`;
        return (
          <ToggleButton
            key={id}
            type="radio"
            variant="outline-primary"
            id={id}
            name={name}
            value={element.value}
            onChange={handleChange}
            checked={state === element.value}
          >
            {element.label}
          </ToggleButton>
        );
      })}
    </fieldset>
  );
}

function TableRowCard({
  id,
  name,
  expansion,
  color,
  type,
  term,
  selectedExpansion,
  selectedColor,
  selectedType,
  selectedTerm,
  deckMain,
  handleSetDeckMain,
  dispatchSimulator,
  stockInfo,
  setStockInfo,
  selectedDeckId,
  selectedGroupId,
}) {
  const show = (selectedExpansion === 0 || expansion === selectedExpansion)
    && (selectedColor === 0 || (color & selectedColor) === selectedColor)
    && (selectedType === 0 || type === selectedType)
    && (selectedTerm === 0 || term === selectedTerm);

  const remainingStock = stockInfo[id] != null ? stockInfo[id] : 4;
  if (!show) {
    return null;
  }

  return (
    <tr
      data-id={id}
      data-expansion={expansion}
      data-color={color}
      data-type={type}
      data-term={term}
    >
      <td>{id}</td>
      <td>{name}</td>
      <td>{remainingStock}</td>
      <td>
        <FormControlCounter
          id={id}
          deck={deckMain}
          handleSetDeck={handleSetDeckMain}
          dispatchSimulator={dispatchSimulator}
          remainingStock={remainingStock}
          stockInfo={stockInfo}
          setStockInfo={setStockInfo}
          selectedDeckId={selectedDeckId}
          selectedGroupId={selectedGroupId}
        />
      </td>
    </tr>
  );
}

function FormControlCounter({
  id,
  deck,
  handleSetDeck,
  dispatchSimulator,
  remainingStock,
  setStockInfo,
  selectedDeckId,
  selectedGroupId,
}) {
  async function handleClickPlus() {
    const newDeck = new Map(deck);
    const currentCount = newDeck.get(id) ?? 0;
    newDeck.set(id, currentCount + 1);
    handleSetDeck(newDeck);
    if (dispatchSimulator) {
      dispatchSimulator(enumActionSimulator.INTERRUPT);
    }
    const result = await updateStockOnServer(selectedGroupId, id, -1, selectedDeckId, newDeck);
    if (result) {
      setStockInfo((prev) => ({
        ...prev,
        [id]: result.stock,
      }));
    } else {
      handleClickDecrement(id, deck, handleSetDeck);
    }
  }

  async function handleClickMinus() {
    const newDeck = new Map(deck);
    const currentCount = newDeck.get(id) ?? 0;
    if (currentCount <= 1) {
      newDeck.delete(id);
    } else {
      newDeck.set(id, currentCount - 1);
    }
    handleSetDeck(newDeck);
    if (dispatchSimulator) {
      dispatchSimulator(enumActionSimulator.INTERRUPT);
    }
    const result = await updateStockOnServer(selectedGroupId, id, +1, selectedDeckId, newDeck);
    if (result) {
      setStockInfo((prev) => ({
        ...prev,
        [id]: result.stock,
      }));
    } else {
      handleClickIncrement(id, deck, handleSetDeck);
    }
  }

  const name = `main-${id}`;
  const counter = deck.has(id) ? deck.get(id) : 0;

  return (
    <InputGroup>
      <Button variant="outline-secondary" onClick={handleClickMinus} disabled={counter <= 0}>
        -
      </Button>
      <FormControl type="number" readOnly name={name} value={counter} />
      <Button variant="outline-secondary" onClick={handleClickPlus} disabled={remainingStock <= 0}>
        +
      </Button>
    </InputGroup>
  );
}

export default TabPaneCard;
