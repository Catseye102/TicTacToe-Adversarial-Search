// Task 2 - automatic test of the alpha-beta engine (run with: node test-engine.js)
// The human side tries EVERY possible sequence of moves; the computer must never lose.
const assert = require('node:assert/strict');
const T = require('./engine.js');
const first = T.bestMove(['', '', '', '', '', '', '', '', ''], 'O', 'X');
console.log('Computer on an empty board:', first);
let games = 0, wins = 0, draws = 0, losses = 0;
function play(b, turn) {
  const w = T.winner(b);
  if (w || T.emptyCells(b).length === 0) {
    games++; if (w === 'X') losses++; else if (w === 'O') wins++; else draws++;
    return;
  }
  if (turn === 'O') {
    const m = T.bestMove(b, 'O', 'X');
    assert.equal(b[m.id], '', 'The computer must choose a free square');
    assert.ok(m.abNodes <= m.mmNodes, 'Pruning must not visit extra nodes');
    b[m.id] = 'O';
    play(b, 'X');
    b[m.id] = '';
  } else {
    for (const c of T.emptyCells(b)) {
      b[c] = 'X';
      play(b, 'O');
      b[c] = '';
    }
  }
}
play(Array(9).fill(''), 'X');   // human starts
play(Array(9).fill(''), 'O');   // computer starts
console.log('All human strategies:', { games, computerWins: wins, draws, computerLosses: losses });
assert.equal(losses, 0, 'The computer must never lose');
