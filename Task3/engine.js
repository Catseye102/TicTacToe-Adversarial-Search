// Task 3 - 3x3 Tic-Tac-Toe engine for machine vs machine
// Minimax with Alpha-Beta pruning, an optional depth limit with a heuristic
// evaluation, and random tie-breaking between equally good moves.
// Works in the browser (global TTT3) and in Node.js (module.exports).
var TTT3 = (function () {
  var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  var ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7];   // centre, corners, edges
  var WIN = 100;

  function winner(b) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (b[l[0]] !== '' && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return b[l[0]];
    }
    return null;
  }
  function emptyCells(b) {
    var e = [];
    for (var i = 0; i < 9; i++) if (b[ORDER[i]] === '') e.push(ORDER[i]);
    return e;
  }

  // Heuristic used when the depth limit is reached (from "me"'s point of view):
  // every line that only contains my marks is good for me, every line that only
  // contains the opponent's marks is bad. Two in an open line counts much more.
  function evaluate(b, me, opp) {
    var s = 0;
    for (var i = 0; i < LINES.length; i++) {
      var mine = 0, theirs = 0;
      for (var k = 0; k < 3; k++) {
        if (b[LINES[i][k]] === me) mine++;
        else if (b[LINES[i][k]] === opp) theirs++;
      }
      if (theirs === 0) s += [0, 1, 5][mine] || 0;
      if (mine === 0) s -= [0, 1, 5][theirs] || 0;
    }
    return s;
  }

  // alpha-beta from "me"'s point of view; "toMove" is whose turn it is
  function alphaBeta(b, toMove, me, opp, depth, ply, alpha, beta, st) {
    st.nodes++;
    var w = winner(b);
    if (w === me) return WIN - ply;            // faster win is better
    if (w === opp) return ply - WIN;           // slower loss is better
    var moves = emptyCells(b);
    if (moves.length === 0) return 0;          // draw
    if (depth === 0) return evaluate(b, me, opp);
    var maximizing = toMove === me, next = maximizing ? opp : me;
    var best = maximizing ? -Infinity : Infinity;
    for (var i = 0; i < moves.length; i++) {
      b[moves[i]] = toMove;
      var v = alphaBeta(b, next, me, opp, depth - 1, ply + 1, alpha, beta, st);
      b[moves[i]] = '';
      if (maximizing) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else            { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta && i < moves.length - 1) {
        st.cutoffs++;
        break;
      }
    }
    return best;
  }

  // Choose a move for player "me". depth = how many plies to look ahead (1..9).
  // Every root move gets an exact score (full window), so equally good moves can
  // be found and one of them picked at random when randomTies is true.
  function chooseMove(board, me, opp, depth, randomTies, rng) {
    rng = rng || Math.random;
    var b = board.slice(), st = { nodes: 0, cutoffs: 0 };
    var moves = emptyCells(b), scored = [];
    for (var i = 0; i < moves.length; i++) {
      b[moves[i]] = me;
      var v = alphaBeta(b, opp, me, opp, depth - 1, 1, -Infinity, Infinity, st);
      b[moves[i]] = '';
      scored.push({ id: moves[i], score: v });
    }
    var bestScore = Math.max.apply(null, scored.map(function (m) { return m.score; }));
    var ties = scored.filter(function (m) { return m.score === bestScore; });
    var pick = randomTies ? ties[Math.floor(rng() * ties.length)] : ties[0];
    return { id: pick.id, score: bestScore, ties: ties.length, nodes: st.nodes, cutoffs: st.cutoffs };
  }

  // Play one complete game. opts: {first:'X'|'O', depthX, depthO, randomTies, randomOpening, rng}
  function playGame(opts) {
    var rng = opts.rng || Math.random;
    var b = ['', '', '', '', '', '', '', '', ''], turn = opts.first, moves = [];
    while (!winner(b) && emptyCells(b).length > 0) {
      var other = turn === 'X' ? 'O' : 'X', m;
      if (moves.length === 0 && opts.randomOpening) {
        m = { id: Math.floor(rng() * 9), score: null, ties: 9, nodes: 0, cutoffs: 0 };
      } else {
        m = chooseMove(b, turn, other, turn === 'X' ? opts.depthX : opts.depthO, opts.randomTies, rng);
      }
      b[m.id] = turn;
      moves.push({ player: turn, cell: m.id, info: m });
      turn = other;
    }
    return { board: b, moves: moves, winner: winner(b) };
  }

  return { LINES: LINES, winner: winner, emptyCells: emptyCells, evaluate: evaluate,
           alphaBeta: alphaBeta, chooseMove: chooseMove, playGame: playGame };
})();

if (typeof module !== 'undefined') module.exports = TTT3;
