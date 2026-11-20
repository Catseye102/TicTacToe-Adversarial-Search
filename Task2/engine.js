// Task 2 - Tic-Tac-Toe engine (3x3) with Minimax + Alpha-Beta pruning
// Works in the browser (global TTT2) and in Node.js (module.exports) for testing.
var TTT2 = (function () {
  // the 8 winning lines of a 3x3 board (cells numbered 0..8)
  var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  // move ordering heuristic: centre first, then corners, then edges
  // (good moves first => more alpha-beta cut-offs)
  var ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7];

  function winner(b) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (b[l[0]] !== '' && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return b[l[0]];
    }
    return null;
  }

  function emptyCells(b) {
    var e = [];
    for (var i = 0; i < ORDER.length; i++) if (b[ORDER[i]] === '') e.push(ORDER[i]);
    return e;
  }

  // Score from the AI's point of view.
  // A faster win scores higher (10 - ply) and a slower loss scores higher (ply - 10).
  function terminalScore(b, ai, human, ply) {
    var w = winner(b);
    if (w === ai) return 10 - ply;
    if (w === human) return ply - 10;
    if (emptyCells(b).length === 0) return 0;
    return null; // not terminal
  }

  // Plain minimax (no pruning) - only used to count nodes for comparison
  function minimax(b, player, ai, human, ply, stats) {
    stats.nodes++;
    var t = terminalScore(b, ai, human, ply);
    if (t !== null) return { score: t };
    var moves = emptyCells(b);
    var best = { id: -1, score: player === ai ? -Infinity : Infinity };
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      b[m] = player;
      var r = minimax(b, player === ai ? human : ai, ai, human, ply + 1, stats);
      b[m] = '';
      if ((player === ai && r.score > best.score) || (player !== ai && r.score < best.score)) {
        best = { id: m, score: r.score };
      }
    }
    return best;
  }

  // Minimax with Alpha-Beta pruning
  //   alpha = best score MAX (ai) can already guarantee
  //   beta  = best score MIN (human) can already guarantee
  // When alpha >= beta the remaining moves cannot change the result -> cut off.
  function alphaBeta(b, player, ai, human, ply, alpha, beta, stats) {
    stats.nodes++;
    var t = terminalScore(b, ai, human, ply);
    if (t !== null) return { score: t };
    var moves = emptyCells(b);
    var best = { id: -1, score: player === ai ? -Infinity : Infinity };
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      b[m] = player;
      var r = alphaBeta(b, player === ai ? human : ai, ai, human, ply + 1, alpha, beta, stats);
      b[m] = '';
      if (player === ai) {
        if (r.score > best.score) best = { id: m, score: r.score };
        alpha = Math.max(alpha, best.score);
      } else {
        if (r.score < best.score) best = { id: m, score: r.score };
        beta = Math.min(beta, best.score);
      }
      if (alpha >= beta && i < moves.length - 1) {
        stats.cutoffs++;
        break;
      }
    }
    return best;
  }

  // Pick the AI move with alpha-beta, and also count what plain minimax would cost
  function bestMove(board, ai, human) {
    var b = board.slice();
    var ab = { nodes: 0, cutoffs: 0 };
    var t0 = Date.now();
    var r = alphaBeta(b, ai, ai, human, 0, -Infinity, Infinity, ab);
    var ms = Date.now() - t0;
    var mm = { nodes: 0 };
    minimax(board.slice(), ai, ai, human, 0, mm);
    return { id: r.id, score: r.score, abNodes: ab.nodes, cutoffs: ab.cutoffs, mmNodes: mm.nodes, ms: ms };
  }

  return { LINES: LINES, winner: winner, emptyCells: emptyCells,
           minimax: minimax, alphaBeta: alphaBeta, bestMove: bestMove };
})();

if (typeof module !== 'undefined') module.exports = TTT2;
