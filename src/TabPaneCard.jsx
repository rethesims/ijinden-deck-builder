// SPDX-License-Identifier: MIT

import {
  memo, useCallback, useMemo, useState,
} from 'react';
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
  Button,
  Form,
  FormControl,
  InputGroup,
  Table,
  ToggleButton,
} from 'react-bootstrap';

import ImageCard from './ImageCard';
import { dataCardsArrayForTable as dataCards } from './dataCards';
import { handleClickDecrement, handleClickIncrement } from './handleClick';
import { enumActionSimulator } from './reducerSimulator';
import usePersistentState from './usePersistentState';

const dataExpansions = [
  { value: 0, label: 'すべて' },
  { value: 10, label: '伝説の武将' },
  { value: 11, label: '美と知の革命' },
  { value: 12, label: '日本の大天才' },
  { value: 15, label: '第１弾ブースター' },
  { value: 20, label: '三国の英傑' },
  { value: 25, label: '第２弾ブースター' },
  { value: 30, label: '発展する医学' },
  { value: 35, label: '第３弾ブースター' },
  { value: 45, label: '第４弾ブースター' },
  { value: 55, label: '第５弾ブースター' },
  { value: 65, label: '第６弾ブースター' },
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

// 能力語はビットフラグ。魔導は色ごとの派生 (魔導【赤】など) が上位ビットに乗るため、
// 完全一致ではなくビット包含で判定する。
const dataTerms = [
  { value: 0, label: '指定なし' },
  { value: 1, label: '航海' },
  { value: 2, label: '執筆' },
  { value: 4, label: '決起' },
  { value: 8, label: '徴募' },
  { value: 16, label: '魔導' },
  { value: 1024, label: '勝鬨' },
  { value: 2048, label: '躍進' },
];

const dataRarities = [
  { value: 0, label: 'すべて' },
  { value: 1, label: 'Nのみ' },
  { value: 3, label: 'NとR' },
  { value: 2, label: 'Rのみ' },
  { value: 6, label: 'RとSR' },
  { value: 4, label: 'SRのみ' },
];

const dataTraits = [
  { value: 0, label: '指定なし' },
  { value: 1, label: '剣術' },
  { value: 2, label: '美術' },
  { value: 4, label: '音楽' },
  { value: 8, label: '思想' },
  { value: 16, label: '医術' },
  { value: 32, label: '志願' },
];

const dataLegacies = [
  { value: 0, label: '指定なし' },
  { value: 1, label: '遺業能力なし' },
  { value: 2, label: '遺業能力あり' },
  { value: 6, label: '魔力化' },
  { value: 10, label: '冥府発動' },
  { value: 18, label: '復元' },
  { value: 130, label: '反魂' },
  { value: 514, label: '木霊' },
  { value: 1026, label: '喪神' },
  { value: 34, label: '1ドローする' },
  { value: 66, label: '手札に戻す' },
  { value: 258, label: '山札の上か下に戻す' },
];

export const enumViewMode = {
  NAME: 'name',
  IMAGE: 'image',
};

const dataViewModes = [
  { value: enumViewMode.NAME, label: 'カード名' },
  { value: enumViewMode.IMAGE, label: 'カード画像' },
];

// ルールテキスト中の改行は ¶ で表される。
const SEPARATOR_TEXT = '¶';

function matchesCard(card, filters) {
  const {
    expansion, color, type, term, rarity, trait, legacy, words,
  } = filters;
  /* eslint-disable no-bitwise */
  return (expansion === 0 || card.expansion === expansion)
    && (rarity === 0 || (card.rarity & rarity) === card.rarity)
    && (color === 0 || (card.color & color) === color)
    && (type === 0 || card.type === type)
    && (term === 0 || (card.term & term) === term)
    && (trait === 0 || (card.trait & trait) === trait)
    && (legacy === 0 || (card.legacy & legacy) === legacy)
    && words.every((word) => card.haystack.includes(word));
  /* eslint-enable no-bitwise */
}

// 検索対象の文字列はカードごとに一度だけ組み立てる。
const dataCardsSearchable = dataCards.map((card) => ({
  ...card,
  haystack: [
    card.name, card.displayName, card.kana, card.traitText,
    card.ruleText, card.legacyText, card.illustration,
  ].filter(Boolean).join('').toLowerCase(),
}));

function TabPaneCard({
  deckMain, handleSetDeckMain, deckSide, handleSetDeckSide,
  dispatchSimulator,
}) {
  const [expansion, setExpansion] = useState(0);
  const [color, setColor] = useState(0);
  const [type, setType] = useState(0);
  const [term, setTerm] = useState(0);
  const [rarity, setRarity] = useState(0);
  const [trait, setTrait] = useState(0);
  const [legacy, setLegacy] = useState(0);
  const [search, setSearch] = useState('');

  // 表示設定はブラウザに残す。既定はこれまでどおりカード名のみ。
  const [viewMode, setViewMode] = usePersistentState(
    'viewModeCard',
    enumViewMode.NAME,
    (value) => value === enumViewMode.NAME || value === enumViewMode.IMAGE,
  );
  const [showRuleText, setShowRuleText] = usePersistentState(
    'showRuleTextCard',
    false,
    (value) => typeof value === 'boolean',
  );

  const words = useMemo(
    () => search.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [search],
  );

  const cardsVisible = useMemo(
    () => dataCardsSearchable.filter((card) => matchesCard(card, {
      expansion, color, type, term, rarity, trait, legacy, words,
    })),
    [expansion, color, type, term, rarity, trait, legacy, words],
  );

  function handleClickReset() {
    setExpansion(0);
    setColor(0);
    setType(0);
    setTerm(0);
    setRarity(0);
    setTrait(0);
    setLegacy(0);
    setSearch('');
  }

  const numFiltersActive = [expansion, color, type, term, rarity, trait, legacy]
    .filter((value) => value !== 0).length + (words.length > 0 ? 1 : 0);

  return (
    <>
      <div className="container-toolbar sticky-top-toolbar p-2">
        <InputGroup className="mb-2">
          <FormControl
            type="search"
            value={search}
            placeholder="カード名・効果テキストで検索"
            aria-label="カード検索"
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          {
            search !== '' && (
              <Button variant="outline-secondary" onClick={() => setSearch('')} aria-label="検索条件を消す">
                ✕
              </Button>
            )
          }
        </InputGroup>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <fieldset className="container-view-mode">
            <legend className="visually-hidden">表示形式</legend>
            {
              dataViewModes.map((element) => (
                <ToggleButton
                  key={element.value}
                  type="radio"
                  variant="outline-primary"
                  size="sm"
                  id={`view-mode-${element.value}`}
                  name="view-mode"
                  value={element.value}
                  onChange={(e) => setViewMode(e.currentTarget.value)}
                  checked={viewMode === element.value}
                >
                  {element.label}
                </ToggleButton>
              ))
            }
          </fieldset>

          {
            viewMode === enumViewMode.NAME && (
              <Form.Check
                type="switch"
                id="show-rule-text"
                label="効果テキスト"
                checked={showRuleText}
                onChange={(e) => setShowRuleText(e.currentTarget.checked)}
              />
            )
          }

          <span className="ms-auto text-body-secondary small text-nowrap">
            {`${cardsVisible.length} / ${dataCards.length} 種`}
          </span>
        </div>
      </div>

      <Accordion className="m-2">
        <AccordionItem eventKey="filters">
          <AccordionHeader>
            {`絞り込み${numFiltersActive > 0 ? ` (${numFiltersActive})` : ''}`}
          </AccordionHeader>
          <AccordionBody>
            <ContainerFilter title="エキスパンション" name="expansion" state={expansion} handleChange={setExpansion} data={dataExpansions} />
            <ContainerFilter title="色" name="color" state={color} handleChange={setColor} data={dataColors} />
            <ContainerFilter title="種類" name="type" state={type} handleChange={setType} data={dataTypes} />
            <ContainerFilter title="レアリティ" name="rarity" state={rarity} handleChange={setRarity} data={dataRarities} />
            <ContainerFilter title="能力語" name="term" state={term} handleChange={setTerm} data={dataTerms} />
            <ContainerFilter title="特性" name="trait" state={trait} handleChange={setTrait} data={dataTraits} />
            <ContainerFilter title="遺業能力" name="legacy" state={legacy} handleChange={setLegacy} data={dataLegacies} />
            <Button variant="outline-secondary" size="sm" onClick={handleClickReset}>
              絞り込みを解除
            </Button>
          </AccordionBody>
        </AccordionItem>
      </Accordion>

      {
        cardsVisible.length === 0
          ? <p className="m-2">該当するカードがありません。</p>
          : (
            <ContainerCards
              viewMode={viewMode}
              showRuleText={showRuleText}
              cards={cardsVisible}
              deckMain={deckMain}
              handleSetDeckMain={handleSetDeckMain}
              deckSide={deckSide}
              handleSetDeckSide={handleSetDeckSide}
              dispatchSimulator={dispatchSimulator}
            />
          )
      }
    </>
  );
}

function ContainerCards({
  viewMode, showRuleText, cards,
  deckMain, handleSetDeckMain, deckSide, handleSetDeckSide, dispatchSimulator,
}) {
  // カードごとに関数を作り直すと memo が効かなくなるため、
  // ID を引数で受け取る固定のコールバックを1組だけ用意する。
  const handleIncrementMain = useCallback((id) => {
    handleClickIncrement(id, handleSetDeckMain);
    dispatchSimulator(enumActionSimulator.INTERRUPT);
  }, [handleSetDeckMain, dispatchSimulator]);
  const handleDecrementMain = useCallback((id) => {
    handleClickDecrement(id, handleSetDeckMain);
    dispatchSimulator(enumActionSimulator.INTERRUPT);
  }, [handleSetDeckMain, dispatchSimulator]);
  const handleIncrementSide = useCallback((id) => {
    handleClickIncrement(id, handleSetDeckSide);
  }, [handleSetDeckSide]);
  const handleDecrementSide = useCallback((id) => {
    handleClickDecrement(id, handleSetDeckSide);
  }, [handleSetDeckSide]);

  const propsShared = {
    handleIncrementMain,
    handleDecrementMain,
    handleIncrementSide,
    handleDecrementSide,
  };

  if (viewMode === enumViewMode.IMAGE) {
    return (
      <div className="container-card-grid mx-2">
        {
          /* eslint-disable react/jsx-props-no-spreading */
          cards.map((card) => (
            <GridCellCard
              key={card.id}
              card={card}
              numCopiesMain={deckMain.get(card.id) ?? 0}
              numCopiesSide={deckSide.get(card.id) ?? 0}
              {...propsShared}
            />
          ))
          /* eslint-enable react/jsx-props-no-spreading */
        }
      </div>
    );
  }

  return (
    <div className="table-responsive">
      {/* 効果テキストの有無でスマホの組み方を変える (App.css) */}
      <Table
        hover
        variant="light"
        className={`table-cards${showRuleText ? ' table-cards-with-text' : ''}`}
      >
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
            /* eslint-disable react/jsx-props-no-spreading */
            cards.map((card) => (
              <TableRowCard
                key={card.id}
                card={card}
                showRuleText={showRuleText}
                numCopiesMain={deckMain.get(card.id) ?? 0}
                numCopiesSide={deckSide.get(card.id) ?? 0}
                {...propsShared}
              />
            ))
            /* eslint-enable react/jsx-props-no-spreading */
          }
        </tbody>
      </Table>
    </div>
  );
}

function ContainerFilter({
  title, name, state, handleChange, data,
}) {
  return (
    <fieldset className="container-button mb-3">
      <legend className="h6">
        {title}
      </legend>
      {
        data.map((element) => {
          const id = `${name}-${element.value}`;
          return (
            <ToggleButton
              key={id}
              type="radio"
              variant="outline-primary"
              size="sm"
              id={id}
              name={name}
              value={element.value}
              onChange={(e) => handleChange(Number(e.currentTarget.value))}
              checked={state === element.value}
            >
              {element.label}
            </ToggleButton>
          );
        })
      }
    </fieldset>
  );
}

/* eslint-disable no-bitwise */
function classNameOfColor(color) {
  switch (color) {
    case 1: return 'bg-ijinden-red';
    case 2: return 'bg-ijinden-blue';
    case 4: return 'bg-ijinden-green';
    case 8: return 'bg-ijinden-yellow';
    case 16: return 'bg-ijinden-purple';
    case 37: return 'bg-ijinden-red-green';
    case 38: return 'bg-ijinden-blue-green';
    case 41: return 'bg-ijinden-red-yellow';
    case 42: return 'bg-ijinden-blue-yellow';
    case 44: return 'bg-ijinden-green-yellow';
    case 50: return 'bg-ijinden-blue-purple';
    case 56: return 'bg-ijinden-yellow-purple';
    default: return 'bg-ijinden-colorless';
  }
}
/* eslint-enable no-bitwise */

function ContainerRuleText({ card }) {
  return (
    <div className="container-rule-text small text-body-secondary">
      {
        card.traitText !== null
          && <div className="fst-italic">{card.traitText}</div>
      }
      {
        (card.ruleText ?? '').split(SEPARATOR_TEXT).filter(Boolean).map((line) => (
          <div key={line}>{line}</div>
        ))
      }
      {
        card.legacyText !== null
          && (
            <div>
              <span className="badge text-bg-light me-1">遺業</span>
              {card.legacyText}
            </div>
          )
      }
    </div>
  );
}

// 一覧は576行あり、増減のたびに全部を作り直すと重い。
// 自分の行の枚数が変わったときだけ再描画されるよう memo で包む。
const TableRowCard = memo(({
  card, showRuleText, numCopiesMain, numCopiesSide,
  handleIncrementMain, handleDecrementMain, handleIncrementSide, handleDecrementSide,
}) => {
  const {
    id, displayName, expansion, color, type, term,
  } = card;
  return (
    <tr
      data-id={id}
      data-expansion={expansion}
      data-color={color}
      data-type={type}
      data-term={term}
    >
      <td className={classNameOfColor(color)}>{id}</td>
      <td className="td-name">
        <div className="text-break">{displayName}</div>
        {showRuleText && <ContainerRuleText card={card} />}
      </td>
      {/* data-label は狭い画面で見出しの代わりに表示する (App.css) */}
      <td data-label="メイン">
        <FormControlCounter
          id={id}
          isMain
          numCopies={numCopiesMain}
          handleIncrement={handleIncrementMain}
          handleDecrement={handleDecrementMain}
        />
      </td>
      <td data-label="サイド">
        <FormControlCounter
          id={id}
          numCopies={numCopiesSide}
          handleIncrement={handleIncrementSide}
          handleDecrement={handleDecrementSide}
        />
      </td>
    </tr>
  );
});

const GridCellCard = memo(({
  card, numCopiesMain, numCopiesSide,
  handleIncrementMain, handleDecrementMain, handleIncrementSide, handleDecrementSide,
}) => {
  const numCopiesTotal = numCopiesMain + numCopiesSide;
  return (
    <div className="container-card-grid-cell" data-id={card.id}>
      <ImageCard
        imageUrl={card.thumbUrl}
        alt={card.displayName}
        numCopies={numCopiesTotal > 0 ? numCopiesTotal : undefined}
        loading="lazy"
      />
      <div className="container-card-grid-name small text-break">{card.displayName}</div>
      <FormControlCounter
        id={card.id}
        isMain
        label="メイン"
        numCopies={numCopiesMain}
        handleIncrement={handleIncrementMain}
        handleDecrement={handleDecrementMain}
      />
      <FormControlCounter
        id={card.id}
        label="サイド"
        numCopies={numCopiesSide}
        handleIncrement={handleIncrementSide}
        handleDecrement={handleDecrementSide}
      />
    </div>
  );
});

function FormControlCounter({
  id, numCopies, handleIncrement, handleDecrement, isMain = false, label = undefined,
}) {
  const name = (isMain ? 'main-' : 'side-') + id;
  const titleDeck = isMain ? 'メインデッキ' : 'サイドデッキ';
  return (
    <InputGroup size="sm" className="input-group-counter">
      {label !== undefined && <InputGroup.Text className="label-counter">{label}</InputGroup.Text>}
      <Button
        variant="outline-secondary"
        onClick={() => handleDecrement(id)}
        disabled={numCopies <= 0}
        aria-label={`${titleDeck}から減らす`}
      >
        -
      </Button>
      <FormControl
        type="number"
        readOnly
        name={name}
        value={numCopies}
        aria-label={`${titleDeck}の枚数`}
      />
      <Button
        variant="outline-secondary"
        onClick={() => handleIncrement(id)}
        aria-label={`${titleDeck}へ増やす`}
      >
        +
      </Button>
    </InputGroup>
  );
}

export default TabPaneCard;
