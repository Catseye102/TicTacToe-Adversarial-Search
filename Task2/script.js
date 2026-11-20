// Task 2 - user interface: human (X) vs computer (O) using alpha-beta (engine.js)
window.onload = function () {
  var human = 'X', ai = 'O';
  var board, gameOver, turn, gameNo = 0, aiTimer;
  var tic = document.getElementById('tic');
  var resultEl = document.getElementById('result');
  var logEl = document.getElementById('log');

  // build the 9 canvases (same drawing style as the base code)
  for (var i = 0; i < 9; i++) {
    var c = document.createElement('canvas');
    c.width = 100; c.height = 100; c.id = 'cell' + i;
    c.tabIndex = 0;
    c.setAttribute('role', 'button');
    c.addEventListener('click', onClick);
    c.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!event.repeat) event.currentTarget.click();
      }
    });
    tic.appendChild(c);
  }

  function log(s) { logEl.textContent += s + '\n'; logEl.scrollTop = logEl.scrollHeight; }
  function boardText(b) {
    var t = '';
    for (var r = 0; r < 3; r++) {
      t += '   ' + [0, 1, 2].map(function (c) { return b[r * 3 + c] || '.'; }).join(' ') + '\n';
    }
    return t;
  }

  function drawX(ctx) {
    ctx.fillStyle = '#fb5181';
    ctx.fillRect(0, 0, 100, 100);
    ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(80, 80); ctx.moveTo(80, 20); ctx.lineTo(20, 80);
    ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.strokeStyle = 'white'; ctx.stroke();
  }
  function drawO(ctx) {
    ctx.fillStyle = '#5cbf3f';
    ctx.fillRect(0, 0, 100, 100);
    ctx.beginPath(); ctx.arc(50, 50, 30, 0, 2 * Math.PI);
    ctx.lineWidth = 16; ctx.strokeStyle = 'white'; ctx.stroke();
  }
  function place(id, p) {
    board[id] = p;
    var box = document.getElementById('cell' + id), ctx = box.getContext('2d');
    if (p === human) drawX(ctx); else drawO(ctx);
    box.setAttribute('aria-label', 'Square ' + (id + 1) + ', ' + p);
  }

  function newGame() {
    clearTimeout(aiTimer);
    gameNo++;
    board = ['', '', '', '', '', '', '', '', ''];
    gameOver = false;
    for (var i = 0; i < 9; i++) {
      var box = document.getElementById('cell' + i);
      box.getContext('2d').clearRect(0, 0, 100, 100);
      box.classList.remove('win');
      box.setAttribute('aria-label', 'Square ' + (i + 1) + ', empty');
    }
    ['sMove', 'sScore', 'sAB', 'sCut', 'sMM', 'sSave', 'sTime'].forEach(function (id) {
      document.getElementById(id).textContent = '-';
    });
    var first = document.getElementById('starter').value;
    log('=== Game ' + gameNo + ' (' + (first === 'human' ? 'human X' : 'computer O') + ' moves first) ===');
    if (first === 'ai') scheduleAiMove();
    else { turn = human; resultEl.textContent = 'Your turn: click a square'; }
  }

  function scheduleAiMove() {
    turn = ai;
    resultEl.textContent = 'Computer is thinking...';
    aiTimer = setTimeout(aiMove, 300);
  }

  function finished() {
    var w = TTT2.winner(board);
    if (w || TTT2.emptyCells(board).length === 0) {
      gameOver = true;
      if (w) {
        TTT2.LINES.forEach(function (l) {
          if (board[l[0]] === w && board[l[1]] === w && board[l[2]] === w)
            l.forEach(function (k) { document.getElementById('cell' + k).classList.add('win'); });
        });
      }
      var msg = w === human ? "Player 'X' (human) won!" : w === ai ? "Player 'O' (computer) won!" : 'GAME OVER! IT WAS A DRAW!';
      resultEl.textContent = msg;
      log(boardText(board) + 'Result: ' + msg + '\n');
      return true;
    }
    return false;
  }

  function onClick(e) {
    if (gameOver) { alert('Game over. Click NEW GAME to play again.'); return; }
    if (turn !== human) return;
    var id = parseInt(e.target.id.replace('cell', ''), 10);
    if (board[id] !== '') { alert('This square is already filled. Please pick another one.'); return; }
    place(id, human);
    log('Human X -> square ' + (id + 1));
    if (finished()) return;
    scheduleAiMove();
  }

  function aiMove() {
    var r = TTT2.bestMove(board, ai, human);
    place(r.id, ai);
    var saved = r.mmNodes > 0 ? (100 * (1 - r.abNodes / r.mmNodes)).toFixed(1) + '%' : '-';
    document.getElementById('sMove').textContent = 'square ' + (r.id + 1);
    document.getElementById('sScore').textContent = r.score;
    document.getElementById('sAB').textContent = r.abNodes.toLocaleString();
    document.getElementById('sCut').textContent = r.cutoffs.toLocaleString();
    document.getElementById('sMM').textContent = r.mmNodes.toLocaleString();
    document.getElementById('sSave').textContent = saved;
    document.getElementById('sTime').textContent = r.ms + ' ms';
    log('Computer O -> square ' + (r.id + 1) + '  (score ' + r.score + ', alpha-beta nodes ' + r.abNodes +
        ', cut-offs ' + r.cutoffs + ', minimax nodes ' + r.mmNodes + ', saved ' + saved + ')');
    if (finished()) return;
    turn = human;
    resultEl.textContent = 'Your turn: click a square';
  }

  document.getElementById('new').addEventListener('click', newGame);
  document.getElementById('dl').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([logEl.textContent], { type: 'text/plain' }));
    a.download = 'task2-session-log.txt';
    a.click();
  });
  log('Task 2 session started ' + new Date().toString());
  newGame();
};
