// SPDX-License-Identifier: MIT

import { useState, useRef } from 'react';
import { Alert, Button } from 'react-bootstrap';

import ImageCard from './ImageCard';
import { enumActionSimulator, enumStateSimulator } from './reducerSimulator';
import { dataCardsMap as dataCards } from './dataCards';
import { sum } from './utils';

function excludeCards(array, deck) {
  array.forEach((element) => {
    const numCopies = deck.get(element);
    if (numCopies > 1) {
      deck.set(element, numCopies - 1);
    } else {
      deck.delete(element);
    }
  });
  return deck;
}

function makeIdArray(deck) {
  const result = [];
  for (const [id, numCopies] of deck.entries()) {
    for (let i = 0; i < numCopies; i += 1) {
      result.push(id);
    }
  }
  return result;
}

function makeRandomIndices(n) {
  const result = [];
  for (let i = 0; i < n; i += 1) {
    result.push(i);
  }
  // シャッフルする
  for (let i = n - 1; i >= 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function setupCards(n, idArray, randomIndices) {
  const result = [];
  for (let i = 0; i < n; i += 1) {
    result.push(idArray.at(randomIndices.pop()));
  }
  return result;
}

function setupGuardians(idArray, randomIndices) {
  // ガーディアン4枚
  return setupCards(4, idArray, randomIndices);
}

function setupHands(idArray, randomIndices) {
  // 手札6枚
  return setupCards(6, idArray, randomIndices);
}

function TabPaneSimulator({ deck, state, dispatch }) {
  // プレイヤーの状態管理
  const [playerGuardians, setPlayerGuardians] = useState(null);
  const [playerHands, setPlayerHands] = useState(null);
  const [playerDeck, setPlayerDeck] = useState(null);
  const [playerMagicZone, setPlayerMagicZone] = useState([]);
  const [playerBattlefield, setPlayerBattlefield] = useState([]);
  const [playerGraveyard, setPlayerGraveyard] = useState([]);
  const [playerMagicPlacementRights, setPlayerMagicPlacementRights] = useState(1);
  const [playerIjinSummonRights, setPlayerIjinSummonRights] = useState(1);

  // 敵の状態管理
  const [enemyGuardians, setEnemyGuardians] = useState(null);
  const [enemyHands, setEnemyHands] = useState(null);
  const [enemyDeck, setEnemyDeck] = useState(null);
  const [enemyMagicZone, setEnemyMagicZone] = useState([]);
  const [enemyBattlefield, setEnemyBattlefield] = useState([]);
  const [enemyGraveyard, setEnemyGraveyard] = useState([]);

  const [turn, setTurn] = useState('player'); // 'player' or 'enemy'
  const [battleLog, setBattleLog] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const logIdRef = useRef(0);

  function handleClickReset() {
    setPlayerGuardians(null);
    setPlayerHands(null);
    setPlayerDeck(null);
    setPlayerMagicZone([]);
    setPlayerBattlefield([]);
    setPlayerGraveyard([]);
    setPlayerMagicPlacementRights(1);
    setPlayerIjinSummonRights(1);

    setEnemyGuardians(null);
    setEnemyHands(null);
    setEnemyDeck(null);
    setEnemyMagicZone([]);
    setEnemyBattlefield([]);
    setEnemyGraveyard([]);

    setTurn('player');
    setBattleLog([]);
    setErrorMessage(null);
    dispatch(enumActionSimulator.RESET);
  }

  function handleClickStart() {
    const numCards = sum(deck.values());
    if (numCards < 20) {
      dispatch(enumActionSimulator.CHECK_MAIN_DECK);
      return;
    }
    const idArray = makeIdArray(deck);
    const randomIndices = makeRandomIndices(numCards);

    // プレイヤーのデッキセットアップ
    const playerGuardiansSetup = setupGuardians(idArray, randomIndices);
    const playerHandsSetup = setupHands(idArray, randomIndices);
    const playerDeckRemaining = excludeCards(
      playerGuardiansSetup,
      excludeCards(playerHandsSetup, new Map(deck)),
    );
    const playerDeckArray = makeIdArray(playerDeckRemaining);

    // 敵のデッキセットアップ（同じデッキを使用する場合）
    const enemyGuardiansSetup = setupGuardians(idArray, randomIndices);
    const enemyHandsSetup = setupHands(idArray, randomIndices);
    const enemyDeckRemaining = excludeCards(
      enemyGuardiansSetup,
      excludeCards(enemyHandsSetup, new Map(deck)),
    );
    const enemyDeckArray = makeIdArray(enemyDeckRemaining);

    setPlayerGuardians(playerGuardiansSetup);
    setPlayerHands(playerHandsSetup);
    setPlayerDeck(playerDeckArray);

    setEnemyGuardians(enemyGuardiansSetup);
    setEnemyHands(enemyHandsSetup);
    setEnemyDeck(enemyDeckArray);

    dispatch(enumActionSimulator.START);
  }

  function handleClickNextTurn() {
    if (turn === 'player') {
      // プレイヤーのターン開始処理
      setPlayerMagicPlacementRights(1);
      setPlayerIjinSummonRights(1);

      // カードを1枚ドロー
      if (playerDeck.length > 0) {
        const newCard = playerDeck[0];
        setPlayerDeck(playerDeck.slice(1));
        setPlayerHands([...playerHands, newCard]);
        setBattleLog((prevLogs) => [
          ...prevLogs,
          {
            id: logIdRef.current,
            message: 'あなたはカードを1枚ドローしました。',
          },
        ]);
        logIdRef.current += 1;
      } else {
        setBattleLog((prevLogs) => [
          ...prevLogs,
          {
            id: logIdRef.current,
            message: 'あなたのデッキが尽きました。',
          },
        ]);
        logIdRef.current += 1;
      }
      // ターンプレイヤーを変更しない（プレイヤーの行動を待つ）
    } else {
      // 敵のターン開始処理
      // カードを1枚ドロー
      if (enemyDeck.length > 0) {
        const newCard = enemyDeck[0];
        setEnemyDeck(enemyDeck.slice(1));
        setEnemyHands([...enemyHands, newCard]);
        setBattleLog((prevLogs) => [
          ...prevLogs,
          {
            id: logIdRef.current,
            message: '敵がカードを1枚ドローしました。',
          },
        ]);
        logIdRef.current += 1;
      } else {
        setBattleLog((prevLogs) => [
          ...prevLogs,
          {
            id: logIdRef.current,
            message: '敵のデッキが尽きました。',
          },
        ]);
        logIdRef.current += 1;
      }

      // 敵のターン処理（何もしない）
      // 敵のターン終了時にプレイヤーのターンに移行
      setTurn('player');
      setBattleLog((prevLogs) => [
        ...prevLogs,
        {
          id: logIdRef.current,
          message: '敵のターンが終了しました。',
        },
      ]);
      logIdRef.current += 1;
    }
  }

  function handleEndPlayerTurn() {
    // プレイヤーのターン終了時に敵のターンに移行
    setTurn('enemy');
    setBattleLog((prevLogs) => [
      ...prevLogs,
      {
        id: logIdRef.current,
        message: 'あなたのターンが終了しました。',
      },
    ]);
    logIdRef.current += 1;

    // 次のターン処理を呼び出す
    handleClickNextTurn();
  }

  function handlePlayCard(cardId, zone) {
    if (turn !== 'player') {
      setErrorMessage('あなたのターンではありません。');
      return;
    }

    const cardIndex = playerHands.findIndex((id) => id === cardId);
    if (cardIndex === -1) {
      setErrorMessage('そのカードは手札にありません。');
      return;
    }

    const card = dataCards.get(cardId);

    if (zone === 'magic') {
      if (playerMagicPlacementRights < 1) {
        setErrorMessage('魔力配置権がありません。');
        return;
      }
      setPlayerMagicPlacementRights(playerMagicPlacementRights - 1);
      setPlayerMagicZone([...playerMagicZone, cardId]);
      setBattleLog((prevLogs) => [
        ...prevLogs,
        {
          id: logIdRef.current,
          message: `あなたは「${card.name}」を魔力ゾーンに配置しました。`,
        },
      ]);
      logIdRef.current += 1;
    } else if (zone === 'battlefield') {
      if (playerIjinSummonRights < 1) {
        setErrorMessage('イジン召喚権がありません。');
        return;
      }
      setPlayerIjinSummonRights(playerIjinSummonRights - 1);
      setPlayerBattlefield([...playerBattlefield, cardId]);
      setBattleLog((prevLogs) => [
        ...prevLogs,
        {
          id: logIdRef.current,
          message: `あなたは「${card.name}」を戦場に召喚しました。`,
        },
      ]);
      logIdRef.current += 1;
    }

    // 手札からカードを削除
    const newHand = [...playerHands];
    newHand.splice(cardIndex, 1);
    setPlayerHands(newHand);
  }

  const enabledStart = state === enumStateSimulator.INITIAL;
  const enabledReset = state !== enumStateSimulator.INITIAL;
  const enabledNextTurn = state === enumStateSimulator.RUNNING;
  const showBattlefield =
    state === enumStateSimulator.RUNNING ||
    state === enumStateSimulator.FINISHED;

  return (
    <>
      <h2 className="m-2">対戦シミュレータ</h2>
      {errorMessage && (
        <Alert
          variant="danger"
          onClose={() => setErrorMessage(null)}
          dismissible
          className="m-2"
        >
          {errorMessage}
        </Alert>
      )}
      <div className="container-button mx-2 mt-2 mb-3">
        <Button
          variant="outline-danger"
          onClick={handleClickReset}
          disabled={!enabledReset}
        >
          リセット
        </Button>
        <Button
          variant="outline-success"
          onClick={handleClickStart}
          disabled={!enabledStart}
        >
          スタート
        </Button>
        <Button
          variant="outline-primary"
          onClick={handleClickNextTurn}
          disabled={!enabledNextTurn || turn !== 'enemy'}
        >
          次のターン
        </Button>
      </div>
      {state === enumStateSimulator.LESS_THAN_TEN && (
        <Alert variant="warning">
          メインデッキの枚数が少なすぎます。20枚以上にしてください。
        </Alert>
      )}
      {state === enumStateSimulator.ABORTED && (
        <Alert variant="warning">
          シミュレーション中にメインデッキが編集されました。リセットしてください。
        </Alert>
      )}
      {showBattlefield && (
        <>
          <h3 className="m-2">敵のフィールド</h3>
          <ContainerSection
            title="ガーディアン"
            cards={enemyGuardians}
            guardian
          />
          <ContainerSection title="手札" cards={enemyHands} />
          <ContainerSection title="魔力ゾーン" cards={enemyMagicZone} />
          <ContainerSection title="戦場" cards={enemyBattlefield} />
          <ContainerSection title="墓地" cards={enemyGraveyard} />
          <hr />
          <h3 className="m-2">あなたのフィールド</h3>
          <ContainerSection
            title="ガーディアン"
            cards={playerGuardians}
            guardian
          />
          <ContainerSection title="魔力ゾーン" cards={playerMagicZone} />
          <ContainerSection title="戦場" cards={playerBattlefield} />
          <ContainerSection title="墓地" cards={playerGraveyard} />
          <ContainerSection title="手札" cards={playerHands}>
            {turn === 'player' &&
              playerHands.map((cardId) => {
                const card = dataCards.get(cardId);
                return (
                  <div key={cardId} className="card-action">
                    <ImageCard imageUrl={card.imageUrl} alt={card.name} />
                    <Button
                      variant="outline-info"
                      onClick={() => handlePlayCard(cardId, 'magic')}
                      disabled={playerMagicPlacementRights < 1}
                    >
                      魔力に配置
                    </Button>
                    <Button
                      variant="outline-info"
                      onClick={() =>
                        handlePlayCard(cardId, 'battlefield')
                      }
                      disabled={playerIjinSummonRights < 1}
                    >
                      戦場に召喚
                    </Button>
                  </div>
                );
              })}
          </ContainerSection>
          {turn === 'player' && (
            <Button
              variant="outline-primary"
              onClick={handleEndPlayerTurn}
              className="m-2"
            >
              ターン終了
            </Button>
          )}
        </>
      )}
      {battleLog.length > 0 && (
        <div className="m-2">
          <h3>バトルログ</h3>
          <ul>
            {battleLog.map((log) => (
              <li key={log.id}>{log.message}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ContainerSection({ title, cards, guardian = false, children }) {
  const containerClass = guardian
    ? 'container-card-line-up container-guardian ms-2'
    : 'container-card-line-up ms-2';
  return (
    <>
      <h4 className="m-2">{title}</h4>
      <div className={containerClass}>
        {cards &&
          cards.map((element, index) => {
            const key = `${element}-${index}`;
            const card = dataCards.get(element);
            return (
              <ImageCard key={key} imageUrl={card.imageUrl} alt={card.name} />
            );
          })}
        {children}
      </div>
    </>
  );
}

export default TabPaneSimulator;
