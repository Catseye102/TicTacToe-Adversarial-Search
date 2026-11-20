const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const T2 = require('../Task2/engine.js');
const T3 = require('../Task3/engine.js');
const T4 = require('../Task4/engineN.js');
const T5 = require('../Task5/engineN.js');

const root = path.resolve(__dirname, '..');
const seed = 20261120;

function randomGenerator(initialSeed) {
  let state = initialSeed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function winner(board, size) {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const mark = board[row * size + col];
      if (mark === '' || mark === -1) continue;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const endRow = row + 2 * dr;
        const endCol = col + 2 * dc;
        if (endRow >= size || endCol < 0 || endCol >= size) continue;
        if (board[(row + dr) * size + col + dc] === mark &&
            board[endRow * size + endCol] === mark) return mark;
      }
    }
  }
  return null;
}

function recordGame(result, size, players, first, limit) {
  const empty = size === 3 && typeof first === 'string' ? '' : -1;
  const board = Array(size * size).fill(empty);
  const moves = result.moves.map((move, index) => {
    const player = move.player ?? move.p;
    assert.equal(player, players[(players.indexOf(first) + index) % players.length]);
    assert.ok(Number.isInteger(move.cell) && move.cell >= 0 && move.cell < board.length);
    assert.equal(board[move.cell], empty);
    assert.equal(winner(board, size), null, 'Play must stop at the first win');
    board[move.cell] = player;
    const { ms, ...info } = move.info;
    assert.ok(info.nodes >= 0 && info.nodes <= limit);
    return { player, cell: move.cell, ...info };
  });
  assert.deepEqual(board, Array.from(result.board));
  const expectedWinner = winner(board, size);
  assert.equal(expectedWinner, result.winner === -1 ? null : result.winner);
  if (expectedWinner === null) assert.ok(!board.includes(empty), 'A draw fills the board');
  return { first, winner: expectedWinner, moves, board };
}

function scores(games, players) {
  return players.map(player => {
    const wins = games.filter(game => game.winner === player).length;
    const draws = games.filter(game => game.winner === null).length;
    return { player, wins, losses: games.length - wins - draws, draws };
  });
}

function task2Example(humanMoves) {
  const board = Array(9).fill('');
  const moves = [];
  for (const square of humanMoves) {
    assert.equal(winner(board, 3), null);
    assert.equal(board[square - 1], '');
    board[square - 1] = 'X';
    moves.push({ player: 'X', cell: square - 1, info: { nodes: 0 } });
    if (winner(board, 3) || !board.includes('')) break;
    const move = T2.bestMove(board, 'O', 'X');
    assert.equal(board[move.id], '');
    board[move.id] = 'O';
    moves.push({
      player: 'O', cell: move.id,
      info: { score: move.score, nodes: move.abNodes, cutoffs: move.cutoffs, minimaxNodes: move.mmNodes }
    });
  }
  return recordGame({ board, moves, winner: T2.winner(board) }, 3, ['X', 'O'], 'X', Infinity);
}

function task3Batch(name, count, depthO, offset) {
  const settings = { depthX: 9, depthO, randomTies: true, randomOpening: false, rotateStarter: true };
  const rng = randomGenerator(seed + offset);
  const games = Array.from({ length: count }, (_, index) => {
    const first = index % 2 === 0 ? 'X' : 'O';
    const result = T3.playGame({ ...settings, first, rng });
    return recordGame(result, 3, ['X', 'O'], first, Infinity);
  });
  return { name, seed: seed + offset, settings, games, scoreboard: scores(games, ['X', 'O']) };
}

function multiplayerBatch(engine, name, size, count, settings, offset) {
  const rng = randomGenerator(seed + offset);
  const game = engine.makeGame(size, 3, 3);
  const games = Array.from({ length: count }, (_, index) => {
    const first = index % 3;
    const result = engine.playGame(game, first, { ...settings, rng });
    return recordGame(result, size, [0, 1, 2], first, settings.nodeLimit);
  });
  return {
    name, seed: seed + offset,
    settings: { boardSize: size, winLength: 3, players: ['X', 'O', 'Δ'], rotateStarter: true, ...settings },
    games, scoreboard: scores(games, [0, 1, 2])
  };
}

function reproduce() {
  const task4 = {
    maxDepth: 3, beam: 0, nodeLimit: 300000,
    winBlock: false, neighbourhood: false, ordering: true, randomTies: true
  };
  const task5 = {
    maxDepth: 3, beam: 8, nodeLimit: 200000,
    winBlock: true, neighbourhood: true, ordering: true, randomTies: true
  };
  const fullWidth = {
    maxDepth: 0, beam: 0, nodeLimit: 500000,
    winBlock: false, neighbourhood: false, ordering: false, randomTies: true
  };
  const engineFiles = ['Task2/engine.js', 'Task3/engine.js', 'Task4/engineN.js', 'Task5/engineN.js'];
  const engineHashes = Object.fromEntries(engineFiles.map(file => [
    file, crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'))
      .digest('hex')
  ]));
  const { ms, ...opening } = T2.bestMove(Array(9).fill(''), 'O', 'X');
  const experiments = [
    task3Batch('task3-full-depth', 10, 9, 30),
    task3Batch('task3-depth-1-opponent', 5, 1, 31),
    multiplayerBatch(T4, 'task4-4x4', 4, 10, task4, 40)
  ];
  for (let size = 3; size <= 10; size++) {
    experiments.push(multiplayerBatch(T5, 'task5-' + size + 'x' + size, size, 10, task5, 50 + size));
  }
  experiments.push(multiplayerBatch(T5, 'task5-full-width', 4, 1, fullWidth, 99));
  const result = {
    schemaVersion: 1, seed, engineHashes,
    task2: {
      emptyBoard: opening,
      draw: task2Example([1, 2, 7, 6, 8]),
      computerWin: task2Example([1, 2, 7, 9])
    },
    experiments
  };
  assert.equal(result.task2.draw.winner, null);
  assert.equal(result.task2.computerWin.winner, 'O');
  assert.ok(experiments[0].games.every(game => game.winner === null));
  assert.ok(experiments.at(-1).games.some(game => game.moves.some(move => move.aborted)));
  return result;
}

const args = process.argv.slice(2);
const check = args.includes('--check');
const outputIndex = args.indexOf('--output');
const valid = check ? args.length === 1 : args.length === 0 || (args.length === 2 && outputIndex === 0);
if (!valid) {
  console.error('Usage: node scripts/reproduce.cjs [--check | --output path.json]');
  process.exit(1);
}
const result = reproduce();
if (check) {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'experiments/baseline.json'), 'utf8'));
  assert.deepEqual(result, baseline, 'Seeded results must match the recorded baseline');
}
const output = path.resolve(root, outputIndex === 0 ? args[1] : '.results/latest.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
for (const experiment of result.experiments) {
  const capped = experiment.games.flatMap(game => game.moves).filter(move => move.aborted).length;
  console.log(experiment.name + ': ' + JSON.stringify(experiment.scoreboard) + ', capped moves ' + capped);
}
console.log(check ? 'Seeded baseline matched.' : 'Seeded experiments completed.');
console.log('Results saved to ' + path.relative(root, output));
