// Tasks 4 and 5 - generalised Tic-Tac-Toe engine
//   board size B x B, K marks in a row to win, M machine players.
// Search: multi-player minimax ("max^n"). With M players a position is scored by a
// vector [v0, v1, ..., vM-1]; the player to move picks the child whose vector is
// best for HIM. For M = 2 this is exactly ordinary minimax.
// Heuristics (needed for big boards, see chooseMove):
//   1. take an immediate win or block the next player's only immediate win
//   2. only consider empty cells next to existing marks (neighbourhood)
//   3. order moves by a quick score and keep only the best few (beam)
//   4. depth limit + evaluation function at the leaves
//   5. iterative deepening under a per-move node budget
// Works in the browser (global TTTN) and in Node.js (module.exports).
var TTTN = (function () {
  var SYMBOLS = ['X', 'O', 'Δ', '□'];   // X, O, triangle, square
  var EMPTY = -1;

  // Precompute every window of K cells in a row (horizontal, vertical, 2 diagonals)
  function makeGame(B, K, M) {
    var windows = [], byCell = [];
    for (var c = 0; c < B * B; c++) byCell.push([]);
    var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var r = 0; r < B; r++) for (var col = 0; col < B; col++) {
      for (var d = 0; d < 4; d++) {
        var er = r + dirs[d][0] * (K - 1), ec = col + dirs[d][1] * (K - 1);
        if (er < 0 || er >= B || ec < 0 || ec >= B) continue;
        var w = [];
        for (var k = 0; k < K; k++) w.push((r + dirs[d][0] * k) * B + (col + dirs[d][1] * k));
        var id = windows.length;
        windows.push(w);
        for (var k2 = 0; k2 < K; k2++) byCell[w[k2]].push(id);
      }
    }
    // weight of a window holding n marks of a single player: 0, 1, 6, 36, ...
    var weight = [0];
    for (var n = 1; n <= K; n++) weight.push(Math.pow(6, n - 1));
    // Every win must outrank any heuristic score, even after subtracting its ply.
    var winValue = Math.max(10000, windows.length * weight[K - 1] + B * B + 1);
    return { B: B, K: K, M: M, N: B * B, windows: windows, byCell: byCell, weight: weight, winValue: winValue };
  }

  function newBoard(g) { var b = new Int8Array(g.N); b.fill(EMPTY); return b; }

  // did the player who just played "cell" complete a window?
  function isWinningMove(b, g, cell) {
    var p = b[cell], ws = g.byCell[cell];
    if (p === EMPTY) return null;
    for (var i = 0; i < ws.length; i++) {
      var w = g.windows[ws[i]], ok = true;
      for (var k = 0; k < w.length; k++) if (b[w[k]] !== p) { ok = false; break; }
      if (ok) return w;
    }
    return null;
  }

  // evaluation vector: h[p] = sum of weights of windows that only p can still complete;
  // each player's value = own potential minus the strongest opponent's potential
  function evaluate(b, g) {
    var M = g.M, h = new Array(M).fill(0);
    for (var i = 0; i < g.windows.length; i++) {
      var w = g.windows[i], owner = -1, n = 0, mixed = false;
      for (var k = 0; k < w.length; k++) {
        var v = b[w[k]];
        if (v === EMPTY) continue;
        if (owner === -1) { owner = v; n = 1; }
        else if (v === owner) n++;
        else { mixed = true; break; }
      }
      if (!mixed && owner !== -1) h[owner] += g.weight[n];
    }
    var out = new Array(M);
    for (var p = 0; p < M; p++) {
      var mx = -Infinity;
      for (var q = 0; q < M; q++) if (q !== p && h[q] > mx) mx = h[q];
      out[p] = h[p] - mx;
    }
    return out;
  }

  // quick score of playing "cell" for player p (used for move ordering):
  // how much it builds p's own windows plus how much it blocks opponents
  function quickScore(b, g, cell, p) {
    var s = 0, ws = g.byCell[cell];
    for (var i = 0; i < ws.length; i++) {
      var w = g.windows[ws[i]], owner = -1, n = 0, mixed = false;
      for (var k = 0; k < w.length; k++) {
        var v = b[w[k]];
        if (v === EMPTY) continue;
        if (owner === -1) { owner = v; n = 1; } else if (v === owner) n++; else { mixed = true; break; }
      }
      if (mixed) continue;
      if (owner === -1) s += 1;
      else if (owner === p) s += g.weight[n + 1] * 1.1;  // extend my line
      else s += g.weight[n + 1];                           // block an opponent
    }
    return s;
  }

  function emptyCells(b) { var e = []; for (var i = 0; i < b.length; i++) if (b[i] === EMPTY) e.push(i); return e; }

  // candidate moves: all empty cells, or (heuristic) only neighbours of existing marks,
  // optionally ordered by quick score and cut to the best "beam" moves
  function candidates(b, g, p, opt) {
    var all = emptyCells(b);
    if (!opt.neighbourhood) return orderAndCut(all, b, g, p, opt);
    var B = g.B, near = [], any = false;
    for (var i = 0; i < b.length; i++) if (b[i] !== EMPTY) { any = true; break; }
    if (!any) {                                     // empty board: play the centre
      var mid = Math.floor(B / 2) * B + Math.floor(B / 2);
      return [mid];
    }
    for (var j = 0; j < all.length; j++) {
      var c = all[j], r = Math.floor(c / B), col = c % B, ok = false;
      for (var dr = -1; dr <= 1 && !ok; dr++) for (var dc = -1; dc <= 1 && !ok; dc++) {
        var rr = r + dr, cc = col + dc;
        if (rr >= 0 && rr < B && cc >= 0 && cc < B && b[rr * B + cc] !== EMPTY) ok = true;
      }
      if (ok) near.push(c);
    }
    return orderAndCut(near, b, g, p, opt);
  }

  // move ordering (best quick score first) and beam cut (keep only the best "beam" moves)
  function orderAndCut(cells, b, g, p, opt) {
    if (!opt.ordering && !(opt.beam > 0)) return cells;
    var scored = cells.map(function (c) { return { c: c, s: quickScore(b, g, c, p) }; });
    scored.sort(function (a, z) { return z.s - a.s; });
    if (opt.beam > 0 && scored.length > opt.beam) scored.length = opt.beam;
    return scored.map(function (x) { return x.c; });
  }

  // A completed node returns one score per player. Null marks an unfinished search.
  function maxn(b, g, toMove, depth, ply, lastCell, remaining, st, opt) {
    if (st.nodes >= st.limit) return null;
    st.nodes++;
    if (lastCell >= 0 && isWinningMove(b, g, lastCell)) {
      var winnerP = b[lastCell], v = new Array(g.M);
      for (var p = 0; p < g.M; p++) v[p] = p === winnerP ? g.winValue - ply : ply - g.winValue;
      return v;
    }
    if (remaining === 0) return new Array(g.M).fill(0);
    if (depth === 0) return evaluate(b, g);
    var moves = candidates(b, g, toMove, opt);
    var best = null, next = (toMove + 1) % g.M;
    for (var i = 0; i < moves.length; i++) {
      b[moves[i]] = toMove;
      var r = maxn(b, g, next, depth - 1, ply + 1, moves[i], remaining - 1, st, opt);
      b[moves[i]] = EMPTY;
      if (r === null) return null;
      if (best === null || r[toMove] > best[toMove]) best = r;
    }
    return best;
  }

  // find cells where player p would win immediately
  function winningCells(b, g, p) {
    var out = [], e = emptyCells(b);
    for (var i = 0; i < e.length; i++) {
      b[e[i]] = p;
      if (isWinningMove(b, g, e[i])) out.push(e[i]);
      b[e[i]] = EMPTY;
    }
    return out;
  }

  // opt: {winBlock, neighbourhood, ordering, beam (0 = all moves),
  //      maxDepth (0 = to the end of the game), nodeLimit, randomTies, rng}
  function chooseMove(board, g, p, opt) {
    var rng = opt.rng || Math.random, t0 = Date.now();
    var b = Int8Array.from(board);
    var info = { nodes: 0, depth: 0, aborted: false, rule: '', ties: 1 };
    var pick = function (arr) { return opt.randomTies ? arr[Math.floor(rng() * arr.length)] : arr[0]; };
    var remaining = emptyCells(b).length, next = (p + 1) % g.M;

    if (opt.winBlock) {
      // rule 1: win now if possible
      var win = winningCells(b, g, p);
      if (win.length) {
        info.rule = 'win';
        info.ties = win.length;
        info.ms = Date.now() - t0;
        return { cell: pick(win), info: info };
      }
      // Only the next player can win before anyone else has a chance to respond.
      var threat = winningCells(b, g, next);
      if (threat.length === 1) {
        info.rule = 'block ' + SYMBOLS[next];
        info.ms = Date.now() - t0;
        return { cell: threat[0], info: info };
      }
    }

    var roots = candidates(b, g, p, opt);
    var maxDepth = opt.maxDepth > 0 ? Math.min(opt.maxDepth, remaining) : remaining;
    var bestMoves = [roots[0]], bestVal = null;
    // iterative deepening: depth 1, 2, ... until maxDepth or the node budget runs out
    for (var d = 1; d <= maxDepth; d++) {
      var st = { nodes: 0, limit: opt.nodeLimit - info.nodes };
      var scored = [];
      for (var i = 0; i < roots.length; i++) {
        b[roots[i]] = p;
        var v = maxn(b, g, next, d - 1, 1, roots[i], remaining - 1, st, opt);
        b[roots[i]] = EMPTY;
        if (v === null) break;
        scored.push({ c: roots[i], v: v[p] });
      }
      info.nodes += st.nodes;
      if (scored.length < roots.length) {
        info.aborted = true;
        break; // keep the last complete depth
      }
      var mx = Math.max.apply(null, scored.map(function (s) { return s.v; }));
      bestVal = mx;
      bestMoves = scored.filter(function (s) { return s.v === mx; }).map(function (s) { return s.c; });
      info.depth = d;
      if (mx >= g.winValue - d) break;                      // winning line found in this search
    }
    info.rule = 'search';
    info.ties = bestMoves.length;
    info.value = bestVal;
    info.ms = Date.now() - t0;
    return { cell: pick(bestMoves), info: info };
  }

  // play one full game; returns {winner (-1 = draw), moves, board, winLine}
  function playGame(g, first, opt, onMove) {
    var b = newBoard(g), p = first, moves = [];
    while (true) {
      var m = chooseMove(b, g, p, opt);
      b[m.cell] = p;
      moves.push({ p: p, cell: m.cell, info: m.info });
      if (onMove) onMove(b, p, m);
      var line = isWinningMove(b, g, m.cell);
      if (line) return { winner: p, moves: moves, board: b, winLine: line };
      if (emptyCells(b).length === 0) return { winner: -1, moves: moves, board: b, winLine: null };
      p = (p + 1) % g.M;
    }
  }

  return { SYMBOLS: SYMBOLS, EMPTY: EMPTY, makeGame: makeGame, newBoard: newBoard,
           isWinningMove: isWinningMove, evaluate: evaluate, candidates: candidates,
           chooseMove: chooseMove, emptyCells: emptyCells, playGame: playGame };
})();

if (typeof module !== 'undefined') module.exports = TTTN;
