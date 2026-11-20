const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const T2 = require('../Task2/engine.js');
const T3 = require('../Task3/engine.js');
const T = require('../Task5/engineN.js');

const root = path.resolve(__dirname, '..');
execFileSync(process.execPath, [path.join(root, 'Task2/test-engine.js')], { stdio: 'inherit' });

for (const file of ['engineN.js', 'uiN.js', 'style.css']) {
  assert.equal(
    fs.readFileSync(path.join(root, 'Task4', file), 'utf8'),
    fs.readFileSync(path.join(root, 'Task5', file), 'utf8')
  );
}

function lines(size) {
  const result = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const endRow = row + 2 * dr, endCol = col + 2 * dc;
        if (endRow < size && endCol >= 0 && endCol < size) {
          result.push([row * size + col, (row + dr) * size + col + dc, endRow * size + endCol]);
        }
      }
    }
  }
  return result;
}

const winningLines = lines(3);
function reference(board, turn, me, other, ply, winValue) {
  const line = winningLines.find(cells => board[cells[0]] && cells.every(cell => board[cell] === board[cells[0]]));
  if (line) return board[line[0]] === me ? winValue - ply : ply - winValue;
  const values = [];
  for (let cell = 0; cell < 9; cell++) {
    if (board[cell]) continue;
    board[cell] = turn;
    values.push(reference(board, turn === me ? other : me, me, other, ply + 1, winValue));
    board[cell] = '';
  }
  if (!values.length) return 0;
  return turn === me ? Math.max(...values) : Math.min(...values);
}

const visited = new Set();
function verifyPosition(board, turn) {
  const key = board.map(cell => cell || '.').join('') + turn;
  if (visited.has(key) || T2.winner(board) || !board.includes('')) return;
  visited.add(key);
  const other = turn === 'X' ? 'O' : 'X';
  const before = board.slice();
  for (const [result, value] of [
    [T2.bestMove(board, turn, other), 10],
    [T3.chooseMove(board, turn, other, 9, false), 100]
  ]) {
    assert.deepEqual(board, before);
    assert.equal(result.score, reference(board, turn, turn, other, 0, value));
    assert.equal(board[result.id], '');
    board[result.id] = turn;
    assert.equal(reference(board, other, turn, other, 1, value), result.score);
    board[result.id] = '';
  }
  for (let cell = 0; cell < 9; cell++) {
    if (board[cell]) continue;
    board[cell] = turn;
    verifyPosition(board, other);
    board[cell] = '';
  }
}
verifyPosition(Array(9).fill(''), 'X');
verifyPosition(Array(9).fill(''), 'O');
assert.equal(visited.size, 9040);
console.log('Two-player search matched the reference on 9,040 reachable positions.');

let windows = 0;
for (let size = 3; size <= 10; size++) {
  const game = T.makeGame(size, 3, 3);
  const expected = lines(size);
  assert.deepEqual(game.windows, expected);
  for (const line of expected) {
    const board = T.newBoard(game);
    assert.equal(T.isWinningMove(board, game, line[0]), null);
    board[line[0]] = board[line[1]] = 2;
    assert.equal(T.isWinningMove(board, game, line[1]), null);
    board[line[2]] = 2;
    assert.deepEqual(T.isWinningMove(board, game, line[2]), line);
  }
  windows += expected.length;
}
assert.equal(windows, 960);
const game = T.makeGame(4, 3, 3);
const board = T.newBoard(game);
const settings = {
  winBlock: false, neighbourhood: false, ordering: false, beam: 0,
  maxDepth: 0, nodeLimit: 16, randomTies: false
};
for (const limit of [1, 16, 50]) {
  const result = T.chooseMove(board, game, 0, { ...settings, nodeLimit: limit });
  assert.equal(result.info.nodes, limit);
  assert.equal(result.info.aborted, true);
  assert.equal(board[result.cell], -1);
  assert.deepEqual(board, T.newBoard(game));
  assert.equal(result.info.depth, limit < 16 ? 0 : 1);
}
board[0] = board[1] = 1;
assert.equal(T.chooseMove(board, game, 0, { ...settings, winBlock: true }).cell, 2);
board[4] = board[5] = 0;
const win = T.chooseMove(board, game, 0, { ...settings, winBlock: true });
assert.equal(win.cell, 6);
assert.equal(win.info.rule, 'win');
console.log('Three-player search passed 960 winning-window checks, exact-budget checks, undo checks, and win/block cases.');
console.log('All engine checks passed.');
