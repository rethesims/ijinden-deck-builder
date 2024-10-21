import { useState } from "react";
import { Button, FormControl, InputGroup, Table, ToggleButton } from "react-bootstrap";

import { dataCardsArrayForTable as dataCards } from "./dataCards"
import { handleClickIncrement, handleClickDecrement } from "./handleClick"

const dataExpansions = [
  { value: 0, label: "すべて" },
  { value: 10, label: "伝説の武将" },
  { value: 11, label: "知と美の革命" },
  { value: 12, label: "日本の大天才" },
  { value: 15, label: "第１弾ブースター" },
  { value: 20, label: "三国の英傑" },
  { value: 25, label: "第２弾ブースター" },
  { value: 30, label: "発展する医療" },
  { value: 35, label: "第３弾ブースター" }
];

const dataColors = [
  { value: 0, label: "すべて" },
  { value: 1, label: "赤" },
  { value: 2, label: "青" },
  { value: 4, label: "緑" },
  { value: 8, label: "黄" },
  { value: 16, label: "紫" },
  { value: 32, label: "多色" },
  { value: 64, label: "無色" }
];

const dataTypes = [
  { value: 0, label: "すべて" },
  { value: 1, label: "イジン" },
  { value: 2, label: "ハイケイ" },
  { value: 3, label: "マホウ" },
  { value: 4, label: "マリョク" }
];

const dataTerms = [
  { value: 0, label: "指定なし" },
  { value: 1, label: "航海" },
  { value: 2, label: "執筆" },
  { value: 3, label: "決起" },
  { value: 4, label: "徴募" }
];

function TabPaneCard({
      deckMain, setDeckMain, deckSide, setDeckSide,
      stateSimulator, setStateSimulator }) {
  const [ expansion, setExpansion ] = useState(0);
  const [ color, setColor ] = useState(0);
  const [ type, setType ] = useState(0);
  const [ term, setTerm ] = useState(0);

  function handleChangeExpansion(e) {
    setExpansion(Number(e.currentTarget.value));
  }

  function handleChangeColor(e) {
    setColor(Number(e.currentTarget.value));
  }

  function handleChangeType(e) {
    setType(Number(e.currentTarget.value));
  }

  function handleChangeTerm(e) {
    setTerm(Number(e.currentTarget.value));
  }

  return (
    <>
      <ContainerFilter title="エキスパンション" name="expansion" state={expansion}
          handleChange={handleChangeExpansion} data={dataExpansions} />
      <ContainerFilter title="色" name="color" state={color}
          handleChange={handleChangeColor} data={dataColors} />
      <ContainerFilter title="種類" name="type" state={type}
          handleChange={handleChangeType} data={dataTypes} />
      <ContainerFilter title="能力語" name="term" state={term}
          handleChange={handleChangeTerm} data={dataTerms} />
      <Table responsive={true} hover={true} variant="light">
        <thead className="sticky-top">
          <tr>
            <th scope="col">ID</th>
            <th scope="col">カード名</th>
            <th scope="col">メイン</th>
            <th scope="col">サイド</th>
          </tr>
        </thead>
        <tbody>
          {
            dataCards.map((element) => (
              <TableRowCard {...element} key={element.id}
                  selectedExpansion={expansion} selectedColor={color}
                  selectedType={type} selectedTerm={term}
                  deckMain={deckMain} setDeckMain={setDeckMain}
                  deckSide={deckSide} setDeckSide={setDeckSide}
                  stateSimulator={stateSimulator}
                  setStateSimulator={setStateSimulator} />
            ))
          }
        </tbody>
      </Table>
    </>
  );
}

function ContainerFilter({ title, name, state, handleChange, data }) {
  return (
    <>
      <fieldset className="container-button m-2">
        <legend className="h3">
          {title}
        </legend>
        {
          data.map((element) => {
            const id = name + "-" + element.value;
            return (
              <ToggleButton key={id} type="radio" variant="outline-primary"
                  id={id} name={name} value={element.value} onChange={handleChange}
                  checked={state === element.value}>{element.label}</ToggleButton>
            );
          })
        }
      </fieldset>
    </>
  );
}

function TableRowCard({
    id, name, expansion, color, type, term,
    selectedExpansion, selectedType, selectedColor, selectedTerm,
    deckMain, setDeckMain, deckSide, setDeckSide,
    stateSimulator, setStateSimulator }) {
  const show =
      (selectedExpansion === 0 || expansion === selectedExpansion) &&
      (selectedColor === 0 || (color & selectedColor) === selectedColor) &&
      (selectedType === 0 || type === selectedType) &&
      (selectedTerm === 0 || term === selectedTerm);
  return (
    <tr data-id={id} data-expansion={expansion}
        data-color={color} data-type={type} data-term={term}
        style={{ display: (show ? 'table-row' : 'none')}}>
      <td>{id}</td>
      <td>{name}</td>
      <td>
        <FormControlCounter id={id} deck={deckMain} setDeck={setDeckMain}
            stateSimulator={stateSimulator} setStateSimulator={setStateSimulator} />
      </td>
      <td>
        <FormControlCounter id={id} deck={deckSide} setDeck={setDeckSide} isSide={true} />
      </td>
    </tr>
  );
}

function FormControlCounter({
    id, deck, setDeck,
    stateSimulator=undefined,
    setStateSimulator=undefined,
    isSide=false }) {
  function handleClickMinus() {
    handleClickDecrement(id, deck, setDeck,
        isSide ? undefined : stateSimulator,
        isSide ? undefined : setStateSimulator);
  }

  function handleClickPlus() {
    handleClickIncrement(id, deck, setDeck,
        isSide ? undefined : stateSimulator,
        isSide ? undefined : setStateSimulator);
  }

  const name = (isSide ? "side-" : "main-") + id;
  const counter = deck.has(id) ? deck.get(id) : 0;
  return (
    <InputGroup>
      <Button variant="outline-secondary" onClick={handleClickMinus}
          disabled={counter <= 0}>-</Button>
      <FormControl type="number" readOnly={true} name={name} value={counter} />
      <Button variant="outline-secondary" onClick={handleClickPlus}>+</Button>
    </InputGroup>
  );
}

export default TabPaneCard;