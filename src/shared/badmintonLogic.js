const DEFAULT_GAME_SCORE = Object.freeze({ a: 0, b: 0 });

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEmptyGameScore() {
  return { ...DEFAULT_GAME_SCORE };
}

function snapshotMatchState(state) {
  return {
    tournamentName: state?.tournamentName || '',
    category: state?.category || '',
    courtNumber: state?.courtNumber || '',
    playerA: state?.playerA || '',
    playerB: state?.playerB || '',
    playerA1: state?.playerA1 || '',
    playerA2: state?.playerA2 || '',
    playerB1: state?.playerB1 || '',
    playerB2: state?.playerB2 || '',
    scoreGame1: clone(state?.scoreGame1 || createEmptyGameScore()),
    scoreGame2: clone(state?.scoreGame2 || createEmptyGameScore()),
    scoreGame3: clone(state?.scoreGame3 || createEmptyGameScore()),
    activeGame: Number(state?.activeGame || 1),
    serverSide: state?.serverSide || '',
    receiverSide: state?.receiverSide || '',
    intervalReached: Boolean(state?.intervalReached),
    gameFinished: Boolean(state?.gameFinished),
    matchFinished: Boolean(state?.matchFinished),
    winnerSide: state?.winnerSide || '',
    gameWins: clone(state?.gameWins || { a: 0, b: 0 })
  };
}

function createInitialMatchState(overrides = {}) {
  return {
    tournamentName: '',
    category: '',
    courtNumber: '',
    playerA: '',
    playerB: '',
    playerA1: '',
    playerA2: '',
    playerB1: '',
    playerB2: '',
    scoreGame1: createEmptyGameScore(),
    scoreGame2: createEmptyGameScore(),
    scoreGame3: createEmptyGameScore(),
    activeGame: 1,
    serverSide: '',
    receiverSide: '',
    intervalReached: false,
    gameFinished: false,
    matchFinished: false,
    winnerSide: '',
    gameWins: { a: 0, b: 0 },
    history: [],
    ...overrides
  };
}

function resetMatchState(state) {
  const nextState = createInitialMatchState({
    tournamentName: state?.tournamentName || '',
    category: state?.category || '',
    courtNumber: state?.courtNumber || '',
    playerA: state?.playerA || '',
    playerB: state?.playerB || '',
    playerA1: state?.playerA1 || '',
    playerA2: state?.playerA2 || '',
    playerB1: state?.playerB1 || '',
    playerB2: state?.playerB2 || '',
    serverSide: state?.serverSide || '',
    receiverSide: state?.receiverSide || ''
  });

  return nextState;
}

function normalizeSide(side) {
  return String(side || '').trim().toUpperCase();
}

function getGameKey(gameNumber) {
  return `scoreGame${gameNumber}`;
}

function getGameScore(state, gameNumber = state.activeGame || 1) {
  const scoreKey = getGameKey(gameNumber);
  return state[scoreKey] || createEmptyGameScore();
}

function getScoreSummary(score) {
  return {
    scoreA: score.a,
    scoreB: score.b,
    total: score.a + score.b,
    difference: Math.abs(score.a - score.b),
    maxScore: Math.max(score.a, score.b)
  };
}

function isDeuce(score) {
  return score.a >= 20 && score.b >= 20 && score.a === score.b;
}

function isGameWinner(score) {
  const { maxScore, difference } = getScoreSummary(score);

  if (maxScore >= 30) {
    return true;
  }

  return maxScore >= 21 && difference >= 2;
}

function getWinnerSide(score) {
  if (score.a === score.b) {
    return '';
  }

  return score.a > score.b ? 'A' : 'B';
}

function shouldTriggerInterval(score) {
  return score.a === 11 || score.b === 11;
}

function swapService(state) {
  return {
    ...state,
    serverSide: state.receiverSide,
    receiverSide: state.serverSide
  };
}

function applyRallyPoint(state, pointWinnerSide, options = {}) {
  const winnerSide = normalizeSide(pointWinnerSide);
  if (winnerSide !== 'A' && winnerSide !== 'B') {
    return {
      state: clone(state),
      event: {
        type: 'invalid-point',
        reason: 'winnerSide must be A or B'
      }
    };
  }

  if (state.matchFinished) {
    return {
      state: clone(state),
      event: {
        type: 'match-finished',
        reason: 'match already finished'
      }
    };
  }

  const gameNumber = Number(options.gameNumber || state.activeGame || 1);
  const scoreKey = getGameKey(gameNumber);
  const before = snapshotMatchState(state);
  const nextState = clone(state);
  const currentScore = getGameScore(nextState, gameNumber);

  currentScore[winnerSide.toLowerCase()] += 1;
  nextState[scoreKey] = currentScore;
  nextState.activeGame = gameNumber;
  nextState.intervalReached = nextState.intervalReached || shouldTriggerInterval(currentScore);

  const serverSide = normalizeSide(nextState.serverSide);
  if (serverSide && serverSide !== winnerSide) {
    Object.assign(nextState, swapService(nextState));
  }

  const gameFinished = isGameWinner(currentScore);
  const gameWinnerSide = gameFinished ? getWinnerSide(currentScore) : '';

  if (gameFinished && gameWinnerSide) {
    const winKey = gameWinnerSide.toLowerCase();
    nextState.gameWins = {
      ...nextState.gameWins,
      [winKey]: (nextState.gameWins?.[winKey] || 0) + 1
    };

    const matchWinner = nextState.gameWins[winKey] >= 2 || gameNumber >= 3;
    nextState.matchFinished = matchWinner;
    nextState.gameFinished = matchWinner;
    nextState.winnerSide = matchWinner ? gameWinnerSide : '';

    if (!matchWinner) {
      nextState.activeGame = Math.min(gameNumber + 1, 3);
      nextState.intervalReached = false;
    }
  } else {
    nextState.gameFinished = false;
    nextState.winnerSide = '';
  }

  const event = {
    type: 'point-applied',
    gameNumber,
    winnerSide,
    score: getScoreSummary(currentScore),
    deuce: isDeuce(currentScore),
    intervalReached: nextState.intervalReached,
    serviceOver: serverSide ? serverSide !== winnerSide : false,
    gameFinished,
    winnerSide: gameWinnerSide,
    matchFinished: nextState.matchFinished,
    gameWins: clone(nextState.gameWins),
    nextGame: nextState.matchFinished ? null : nextState.activeGame
  };

  nextState.history = [...nextState.history, {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action: 'applyRallyPoint',
    before,
    after: snapshotMatchState(nextState),
    event,
    createdAt: new Date().toISOString()
  }];

  return {
    state: nextState,
    event
  };
}

function applyPatch(state, patch = {}) {
  const before = snapshotMatchState(state);
  const nextState = {
    ...clone(state),
    ...patch
  };

  if (Array.isArray(patch.teamAPlayers)) {
    nextState.playerA1 = patch.teamAPlayers[0] || '';
    nextState.playerA2 = patch.teamAPlayers[1] || '';
    nextState.playerA = [patch.teamAPlayers[0], patch.teamAPlayers[1]].filter(Boolean).join(' / ');
  }

  if (Array.isArray(patch.teamBPlayers)) {
    nextState.playerB1 = patch.teamBPlayers[0] || '';
    nextState.playerB2 = patch.teamBPlayers[1] || '';
    nextState.playerB = [patch.teamBPlayers[0], patch.teamBPlayers[1]].filter(Boolean).join(' / ');
  }

  nextState.history = [...nextState.history, {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action: 'patch',
    before,
    after: snapshotMatchState(nextState),
    patch,
    createdAt: new Date().toISOString()
  }];

  return {
    state: nextState,
    event: {
      type: 'patch-applied',
      keys: Object.keys(patch)
    }
  };
}

function undoLastAction(state) {
  const history = Array.isArray(state.history) ? state.history : [];
  const lastEntry = history[history.length - 1];

  if (!lastEntry) {
    return {
      state: clone(state),
      event: {
        type: 'undo-empty'
      }
    };
  }

  const restoredState = clone(lastEntry.before);
  restoredState.history = history.slice(0, -1);

  return {
    state: restoredState,
    event: {
      type: 'undo-applied',
      action: lastEntry.action
    }
  };
}

module.exports = {
  createInitialMatchState,
  resetMatchState,
  snapshotMatchState,
  getGameScore,
  getScoreSummary,
  isDeuce,
  isGameWinner,
  shouldTriggerInterval,
  applyRallyPoint,
  applyPatch,
  undoLastAction
};
