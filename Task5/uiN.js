// Tasks 4 and 5 - user interface for B x B Tic-Tac-Toe with M machine players
// Reads its settings from the page, plays N games with engineN.js and keeps a scoreboard.
window.onload = function () {
  var $ = function (id) { return document.getElementById(id); };
  var TASK = document.body.getAttribute('data-task');
  var logEl = $('log'), boardEl = $('board');
  var running = false, stopRequested = false, score = [];

  function log(s) { logEl.textContent += s + '\n'; logEl.scrollTop = logEl.scrollHeight; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function sym(p) { return TTTN.SYMBOLS[p]; }
  function rc(cell, B) { return '(' + (Math.floor(cell / B) + 1) + ',' + (cell % B + 1) + ')'; }

  function settings() {
    return {
      n: $('nGames').valueAsNumber,
      B: +$('boardSize').value, K: 3, M: 3,
      opt: {
        maxDepth: +$('depth').value,
        winBlock: $('winBlock').checked,
        neighbourhood: $('neighbourhood').checked,
        ordering: $('ordering').checked,
        beam: $('beam').valueAsNumber,
        nodeLimit: +$('nodeLimit').value,
        randomTies: $('randomTies').checked
      },
      rotate: $('rotate').checked, speed: +$('speed').value
    };
  }

  function factorialText(n) {
    var lg = 0; for (var i = 2; i <= n; i++) lg += Math.log10(i);
    return lg < 6 ? String(Math.round(Math.pow(10, lg))) : '10^' + lg.toFixed(1);
  }

  function drawEmpty() {
    var B = +$('boardSize').value;
    var size = Math.max(30, Math.min(80, Math.floor(480 / B)));
    boardEl.parentElement.style.width = (B * (size + 3) + 3) + 'px';
    boardEl.style.gridTemplateColumns = 'repeat(' + B + ', minmax(0, 1fr))';
    boardEl.innerHTML = '';
    for (var i = 0; i < B * B; i++) {
      var c = document.createElement('div');
      c.className = 'cell'; c.id = 'c' + i;
      c.style.fontSize = 'min(' + (54 / B) + 'vw, ' + Math.floor(size * 0.6) + 'px)';
      boardEl.appendChild(c);
    }
    $('treeInfo').textContent = 'Ignoring early wins, a ' + B + '×' + B + ' board has ' +
      factorialText(B * B) + ' possible full move orders.';
  }

  function paint(b, line) {
    for (var i = 0; i < b.length; i++) {
      var el = $('c' + i), v = b[i];
      el.textContent = v === TTTN.EMPTY ? '' : sym(v);
      el.className = 'cell' + (v === TTTN.EMPTY ? '' : ' p' + v) + (line && line.indexOf(i) >= 0 ? ' win' : '');
    }
  }

  function renderScores() {
    $('scoreBody').innerHTML = score.map(function (s, p) {
      return '<tr><td class="p' + p + '">' + sym(p) + '</td><td>' + s.w + '</td><td>' + s.l + '</td><td>' + s.d + '</td></tr>';
    }).join('');
  }

  function resetResults() {
    score = TTTN.SYMBOLS.slice(0, 3).map(function () { return { w: 0, l: 0, d: 0 }; });
    renderScores();
    $('historyBody').innerHTML = '';
    ['mPlayer', 'mCell', 'mRule', 'mDepth', 'mNodes', 'mTime', 'mStop', 'mMem'].forEach(function (id) {
      $(id).textContent = '-';
    });
    $('result').textContent = 'Set N and press PLAY N GAMES';
    drawEmpty();
  }

  function showMove(p, cell, info, B) {
    var mem = (window.performance && performance.memory) ?
      (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : 'n/a in this browser';
    $('mPlayer').textContent = sym(p);
    $('mCell').textContent = rc(cell, B);
    $('mRule').textContent = info.rule === 'search' ? 'max^n search' : info.rule;
    $('mDepth').textContent = info.rule === 'search' ? info.depth : '-';
    $('mNodes').textContent = info.nodes.toLocaleString();
    $('mTime').textContent = info.ms + ' ms';
    $('mStop').textContent = info.aborted ? 'YES - node limit reached' : 'no';
    $('mMem').textContent = mem;
  }

  async function playAll() {
    var s = settings();
    if (!Number.isInteger(s.n) || s.n < 1 || s.n > 10) {
      alert('Please enter an integer N between 1 and 10.');
      return;
    }
    if (!Number.isInteger(s.opt.beam) || s.opt.beam < 0 || s.opt.beam > 50) {
      alert('Please enter a whole number from 0 to 50 for the beam width.');
      return;
    }
    var controls = document.querySelectorAll('.controls :is(input, select, button):enabled');
    running = true; stopRequested = false;
    controls.forEach(function (control) { control.disabled = true; });
    $('stop').disabled = false;
    var g = TTTN.makeGame(s.B, s.K, s.M);
    resetResults();
    log('=== ' + TASK + ' run: N=' + s.n + ', board ' + s.B + 'x' + s.B + ', ' + s.K + ' in a row, ' + s.M +
        ' players (' + TTTN.SYMBOLS.slice(0, s.M).join(', ') + '), look-ahead ' + (s.opt.maxDepth || 'full') +
        ', win/block=' + s.opt.winBlock + ', neighbourhood=' + s.opt.neighbourhood + ', ordering=' + s.opt.ordering +
        ', beam=' + (s.opt.beam || 'all') + ', node limit=' + s.opt.nodeLimit +
        ', random ties=' + s.opt.randomTies + ', rotate starter=' + s.rotate + ' ===');
    var runStart = Date.now(), aborts = 0, completed = 0;

    for (var gi = 1; gi <= s.n && !stopRequested; gi++) {
      var first = s.rotate ? (gi - 1) % s.M : 0;
      var b = TTTN.newBoard(g), pl = first, moves = 0, t0 = Date.now(), result = null, line = null;
      log('--- Game ' + gi + ' of ' + s.n + ' (' + sym(first) + ' starts) ---');
      $('result').textContent = 'Game ' + gi + ' of ' + s.n + ' ...';
      paint(b);
      while (!stopRequested) {
        var m = TTTN.chooseMove(b, g, pl, s.opt);
        b[m.cell] = pl; moves++;
        if (m.info.aborted) aborts++;
        log(sym(pl) + ' -> ' + rc(m.cell, s.B) + '  ' + (m.info.rule === 'search'
            ? 'search depth ' + m.info.depth + ', ' + m.info.nodes + ' nodes' + (m.info.aborted ? ' (NODE LIMIT REACHED)' : '')
            : m.info.rule) + ', ' + m.info.ms + ' ms');
        showMove(pl, m.cell, m.info, s.B);
        line = TTTN.isWinningMove(b, g, m.cell);
        paint(b, line);
        if (line) { result = pl; break; }
        if (TTTN.emptyCells(b).length === 0) { result = -1; break; }
        pl = (pl + 1) % s.M;
        await sleep(s.speed);       // also lets the browser redraw
      }
      if (result === null) break;   // stopped by the user
      completed++;
      var text;
      if (result >= 0) {
        for (var q = 0; q < s.M; q++) { if (q === result) score[q].w++; else score[q].l++; }
        text = sym(result) + ' wins';
      } else {
        for (var q2 = 0; q2 < s.M; q2++) score[q2].d++;
        text = 'Draw';
      }
      var secs = ((Date.now() - t0) / 1000).toFixed(2);
      var rows = '';
      for (var r = 0; r < s.B; r++) {
        var row = [];
        for (var c = 0; c < s.B; c++) { var v = b[r * s.B + c]; row.push(v === TTTN.EMPTY ? '.' : sym(v)); }
        rows += '   ' + row.join(' ') + '\n';
      }
      log(rows + 'Result: ' + text + ' after ' + moves + ' moves (' + secs + ' s)');
      $('historyBody').innerHTML += '<tr><td>' + gi + '</td><td>' + sym(first) + '</td><td>' + moves +
        '</td><td>' + text + '</td><td>' + secs + ' s</td></tr>';
      renderScores();
      if (gi < s.n) await sleep(s.speed * 3);
    }

    var parts = score.map(function (x, p) { return sym(p) + ' ' + x.w + 'W/' + x.l + 'L/' + x.d + 'D'; });
    var summary = (completed < s.n ? 'Stopped after ' + completed + ' of ' + s.n + ' games. '
      : 'Finished ' + completed + (completed === 1 ? ' game. ' : ' games. ')) + parts.join(', ');
    $('result').textContent = summary;
    log('=== ' + summary + ' | total ' + ((Date.now() - runStart) / 1000).toFixed(1) + ' s, moves stopped by node limit: ' + aborts + ' ===\n');
    running = false;
    controls.forEach(function (control) { control.disabled = false; });
    $('stop').disabled = true;
  }

  // presets (Task 5): all heuristics on / pure max^n with no heuristics
  if ($('presetOn')) $('presetOn').addEventListener('click', function () {
    $('winBlock').checked = $('neighbourhood').checked = $('ordering').checked = true;
    $('beam').value = 8; $('depth').value = 3; $('nodeLimit').value = 200000;
  });
  if ($('presetOff')) $('presetOff').addEventListener('click', function () {
    $('winBlock').checked = $('neighbourhood').checked = $('ordering').checked = false;
    $('beam').value = 0; $('depth').value = 0; $('nodeLimit').value = 500000;
  });

  $('boardSize').addEventListener('change', resetResults);
  $('start').addEventListener('click', function () { if (!running) playAll(); });
  $('stop').addEventListener('click', function () { stopRequested = true; });
  $('dl').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([logEl.textContent], { type: 'text/plain' }));
    a.download = TASK.toLowerCase().replace(' ', '') + '-session-log.txt'; a.click();
  });
  resetResults();
  log(TASK + ' session started ' + new Date().toString());
};
