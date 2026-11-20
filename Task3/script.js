// Task 3 - user interface: machine (X) vs machine (O), N games, scoreboard
window.onload = function () {
  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $('board'), logEl = $('log');
  var running = false;
  var score = { X: { w: 0, l: 0, d: 0 }, O: { w: 0, l: 0, d: 0 } };

  // look-ahead choices: 1..9 plies (9 = full search = perfect play)
  ['depthX', 'depthO'].forEach(function (id) {
    for (var d = 1; d <= 9; d++) {
      var o = document.createElement('option');
      o.value = d; o.textContent = d === 9 ? '9 (perfect)' : String(d);
      if (d === 9) o.selected = true;
      $(id).appendChild(o);
    }
  });
  for (var i = 0; i < 9; i++) {
    var c = document.createElement('div'); c.className = 'cell'; c.id = 'c' + i; boardEl.appendChild(c);
  }

  function log(s) { logEl.textContent += s + '\n'; logEl.scrollTop = logEl.scrollHeight; }
  function boardText(b) {
    var t = '';
    for (var r = 0; r < 3; r++) t += '   ' + [0, 1, 2].map(function (c) { return b[r * 3 + c] || '.'; }).join(' ') + '\n';
    return t;
  }
  function show(b, winLine) {
    for (var i = 0; i < 9; i++) {
      var el = $('c' + i);
      el.textContent = b[i];
      el.className = 'cell' + (b[i] ? ' p' + b[i] : '') + (winLine && winLine.indexOf(i) >= 0 ? ' win' : '');
    }
  }
  function winLine(b) {
    for (var i = 0; i < TTT3.LINES.length; i++) {
      var l = TTT3.LINES[i];
      if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return l;
    }
    return null;
  }
  function renderScores() {
    $('scoreBody').innerHTML = ['X', 'O'].map(function (p) {
      return '<tr><td class="p' + p + '">' + p + '</td><td>' + score[p].w + '</td><td>' + score[p].l + '</td><td>' + score[p].d + '</td></tr>';
    }).join('');
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function playAll() {
    var n = $('nGames').valueAsNumber;
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      alert('Please enter an integer N between 1 and 10.');
      return;
    }
    var controls = document.querySelectorAll('.controls input, .controls select, #start');
    running = true;
    controls.forEach(function (control) { control.disabled = true; });
    score = { X: { w: 0, l: 0, d: 0 }, O: { w: 0, l: 0, d: 0 } };
    $('historyBody').innerHTML = ''; renderScores();
    var dX = +$('depthX').value, dO = +$('depthO').value;
    var randomTies = $('randomTies').checked, randomOpening = $('randomOpening').checked;
    var alternate = $('alternate').checked, speed = +$('speed').value;
    log('=== Run: N=' + n + ', look-ahead X=' + dX + ', O=' + dO + ', random ties=' + randomTies +
        ', random first move=' + randomOpening + ', alternate start=' + alternate + ' ===');

    for (var g = 1; g <= n; g++) {
      var first = alternate && g % 2 === 0 ? 'O' : 'X';
      var b = ['', '', '', '', '', '', '', '', ''], turn = first, seq = [];
      log('--- Game ' + g + ' of ' + n + ' (' + first + ' starts) ---');
      show(b); $('result').textContent = 'Game ' + g + ' of ' + n;
      while (!TTT3.winner(b) && TTT3.emptyCells(b).length > 0) {
        var other = turn === 'X' ? 'O' : 'X', m;
        if (seq.length === 0 && randomOpening) {
          m = { id: Math.floor(Math.random() * 9), score: '-', ties: 9, nodes: 0, cutoffs: 0 };
        } else {
          m = TTT3.chooseMove(b, turn, other, turn === 'X' ? dX : dO, randomTies);
        }
        b[m.id] = turn; seq.push(turn + (m.id + 1));
        log(turn + ' -> square ' + (m.id + 1) + '  (score ' + m.score + ', nodes ' + m.nodes +
            ', cut-offs ' + m.cutoffs + ', equally good moves ' + m.ties + ')');
        $('gameInfo').textContent = turn + ' played square ' + (m.id + 1) + ' after searching ' + m.nodes + ' nodes';
        show(b);
        turn = other;
        await sleep(speed);
      }
      var w = TTT3.winner(b), res;
      if (w) { var o = w === 'X' ? 'O' : 'X'; score[w].w++; score[o].l++; res = w + ' wins'; }
      else { score.X.d++; score.O.d++; res = 'Draw'; }
      show(b, winLine(b));
      log(boardText(b) + 'Result: ' + res);
      $('historyBody').innerHTML += '<tr><td>' + g + '</td><td>' + first + '</td><td>' + seq.join(' ') + '</td><td>' + res + '</td></tr>';
      renderScores();
      if (speed) await sleep(speed * 2);
    }
    var summary = 'After ' + n + ' games: X won ' + score.X.w + ', O won ' + score.O.w + ', draws ' + score.X.d;
    $('result').textContent = summary;
    log('=== ' + summary + ' ===\n');
    running = false;
    controls.forEach(function (control) { control.disabled = false; });
  }

  $('start').addEventListener('click', function () { if (!running) playAll(); });
  $('dl').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([logEl.textContent], { type: 'text/plain' }));
    a.download = 'task3-session-log.txt'; a.click();
  });
  renderScores();
  log('Task 3 session started ' + new Date().toString());
};
