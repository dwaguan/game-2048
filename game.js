(() => {
  "use strict";

  const SIZE = 4;
  const STORAGE_KEY = "game2048:best";
  const LUCKY_KEY = "game2048:lucky";

  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const newGameBtn = document.getElementById("new-game");
  const luckyToggle = document.getElementById("lucky-toggle");

  let grid;        // SIZE x SIZE of values (0 = empty)
  let prevGrid;    // snapshot of grid before the player's last move
  let score;
  let best;
  let tileLayer;   // absolutely-positioned layer holding tile elements
  let won;         // keep playing after first win
  let over;
  let luckyMode = localStorage.getItem(LUCKY_KEY) === "1";

  const DIRS = ["left", "right", "up", "down"];

  // ---- setup ----
  function init() {
    boardEl.innerHTML = "";
    // background cells
    for (let i = 0; i < SIZE * SIZE; i++) {
      const c = document.createElement("div");
      c.className = "cell";
      boardEl.appendChild(c);
    }
    tileLayer = document.createElement("div");
    tileLayer.className = "tile-layer";
    boardEl.appendChild(tileLayer);

    best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
    bestEl.textContent = best;
    syncLuckyUI();

    newGame();
    bindInput();
  }

  function newGame() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    prevGrid = null;
    score = 0;
    won = false;
    over = false;
    clearOverlay();
    addRandomTile();
    addRandomTile();
    render();
    scoreEl.textContent = score;
  }

  // ---- pure helpers ----
  function cloneGrid(g) { return g.map((r) => [...r]); }

  function emptyCellsOf(g) {
    const out = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (g[r][c] === 0) out.push([r, c]);
    return out;
  }

  function emptyCells() { return emptyCellsOf(grid); }

  // Rotate a grid so that moving `dir` becomes "move left". Pure.
  function rotateTo(g, dir) {
    if (dir === "left") return g.map((r) => [...r]);
    if (dir === "right") return g.map((r) => [...r].reverse());
    if (dir === "up") return transpose(g);
    if (dir === "down") return transpose(g).map((r) => [...r].reverse());
  }

  function rotateBack(g, dir) {
    if (dir === "left") return g;
    if (dir === "right") return g.map((r) => [...r].reverse());
    if (dir === "up") return transpose(g);
    if (dir === "down") return transpose(g.map((r) => [...r].reverse()));
  }

  function transpose(g) {
    return g[0].map((_, c) => g.map((row) => row[c]));
  }

  // Simulate a move on a given grid. Returns { grid, score, changed }. Pure.
  function simulateMove(g, dir) {
    let gained = 0;
    let changed = false;
    const rotated = rotateTo(g, dir);
    for (let r = 0; r < SIZE; r++) {
      const row = rotated[r].filter((v) => v !== 0);
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) {
          row[i] *= 2;
          gained += row[i];
          row.splice(i + 1, 1);
        }
      }
      while (row.length < SIZE) row.push(0);
      if (row.some((v, i) => v !== rotated[r][i])) changed = true;
      rotated[r] = row;
    }
    return { grid: rotateBack(rotated, dir), score: gained, changed };
  }

  function canMoveOf(g) {
    if (emptyCellsOf(g).length) return true;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        const v = g[r][c];
        if (c + 1 < SIZE && g[r][c + 1] === v) return true;
        if (r + 1 < SIZE && g[r + 1][c] === v) return true;
      }
    return false;
  }

  function canMove() { return canMoveOf(grid); }

  // ---- tile placement ----
  function addRandomTile() {
    const cells = emptyCells();
    if (!cells.length) return;
    if (luckyMode) addLuckyTile(cells);
    else addNaiveTile(cells);
  }

  function addNaiveTile(cells) {
    const [r, c] = cells[Math.floor(Math.random() * cells.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  // ---- Lucky Mode -----------------------------------------------------------
  // Replaces naive random placement with a heuristic that:
  //   1. Avoids placements that stall the board in 1-2 player moves.
  //   2. Prefers placements that enable an immediate (one-step) merge.
  //   3. After a forced move that pulled a big tile off the border, places the
  //      new tile near the smallest existing tile so the move can be reversed
  //      and the big tile restored to the border.
  //   4. Keeps the board monotonic / corner-anchored (classic 2048 structure).
  //   5. Ties broken with weighted randomness so play still feels varied.
  function addLuckyTile(cells) {
    const scored = cells.map(([r, c]) => {
      // Try both possible spawn values; score the better of the two.
      const as2 = scoreCandidate(r, c, 2);
      const as4 = scoreCandidate(r, c, 4);
      const best = as2.score >= as4.score ? as2 : as4;
      return { r, c, value: best.value, score: best.score };
    });

    const maxScore = scored.reduce((m, s) => Math.max(m, s.score), -Infinity);

    // Survivors: candidates within a small tolerance of the best. Lucky mode
    // is a nudge, not a solver — we keep some variety among near-optimal spots.
    const tol = 2;
    const survivors = scored.filter((s) => s.score >= maxScore - tol);
    const pick = survivors[Math.floor(Math.random() * survivors.length)];
    grid[pick.r][pick.c] = pick.value;
  }

  // Score a candidate (r,c,value) placement. Higher is better.
  function scoreCandidate(r, c, value) {
    const g = cloneGrid(grid);
    g[r][c] = value;

    let score = 0;

    // (1) Hard stall avoidance: penalize boards that leave the player with
    //     no move, or only moves that themselves lead to a dead end (2-step).
    const moves = DIRS
      .map((d) => simulateMove(g, d))
      .filter((m) => m.changed);

    if (moves.length === 0) {
      // Placement itself leaves no legal move — very bad.
      score -= 1000;
    } else {
      // Count how many follow-ups each move leaves. Penalize if every move
      // leads to a board that itself has few/no replies.
      let worstFollowup = Infinity;
      for (const m of moves) {
        const replies = DIRS
          .map((d) => simulateMove(m.grid, d))
          .filter((x) => x.changed);
        worstFollowup = Math.min(worstFollowup, replies.length);
      }
      if (worstFollowup === 0) score -= 50;   // forced into a stall next turn
      else score += Math.min(worstFollowup, 3); // more options = better

      // Reward keeping at least one empty cell after the best move.
      const bestMove = moves.reduce((a, b) =>
        emptyCellsOf(b.grid).length > emptyCellsOf(a.grid).length ? b : a);
      score += Math.min(emptyCellsOf(bestMove.grid).length, 4);
    }

    // (2) One-step merge enabler: reward if the player has a move that merges
    //     this newly placed tile on the very next turn.
    for (const m of moves) {
      // A merge happened involving value if the resulting board has fewer of
      // `value` than before *and* gained score from a `value`+`value` pair.
      if (m.score > 0 && mergeInvolves(m.grid, g, value)) {
        score += 6;
        // Strongly prefer spawning a 2 when it enables a merge — 2s are the
        // lifeblood of chains and fill the board more slowly than 4s.
        if (value === 2) score += 3;
        break;
      }
    }

    // (3) Border-preservation reversal: if the player's last move pulled a
    //     big tile away from the border, prefer placing near the smallest
    //     tile so the move can be reversed without stranding the big one.
    score += borderReversalBonus(g, r, c);

    // (4) Structure: reward monotonic rows/cols and keeping a corner anchor.
    score += structureBonus(g);

    // Small positional preference: corners and edges are more flexible.
    if (isCorner(r, c)) score += 1;

    return { value, score };
  }

  // Did a merge involving `value` occur between `before` and `after`?
  // Detected by checking if any `value` tile disappeared (merged away).
  function mergeInvolves(after, before, value) {
    const countBefore = countValue(before, value);
    const countAfter = countValue(after, value);
    return countAfter < countBefore;
  }

  function countValue(g, value) {
    let n = 0;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (g[r][c] === value) n++;
    return n;
  }

  // If the previous grid had a big tile on the border that the player's last
  // move pulled inward, return a bonus for placing the new tile adjacent to
  // the smallest tile (so the reverse move clears the new tile rather than
  // the big one).
  function borderReversalBonus(g, newR, newC) {
    if (!prevGrid) return 0;
    const bigThreshold = largestValue(prevGrid) / 2;
    if (bigThreshold < 8) return 0; // nothing worth protecting

    // Find big tiles that were on the border before but not after the move.
    const displaced = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (prevGrid[r][c] >= bigThreshold && isBorder(r, c) &&
            !isBorderOfValue(g, prevGrid[r][c])) {
          displaced.push(prevGrid[r][c]);
        }
    if (!displaced.length) return 0;

    // Reward placing the new tile near the smallest existing tile: a reverse
    // move will tend to clear/merge the small neighbor and the fresh tile,
    // leaving the big tile free to return to the border.
    const smallest = smallestFilled(g);
    if (smallest == null) return 0;
    const [sr, sc] = smallest;
    const dist = Math.abs(sr - newR) + Math.abs(sc - newC);
    return Math.max(0, 5 - dist); // up to +5 if adjacent to the smallest
  }

  // Is there any border cell holding `value` in g?
  function isBorderOfValue(g, value) {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (g[r][c] === value && isBorder(r, c)) return true;
    return false;
  }

  function largestValue(g) {
    let m = 0;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) m = Math.max(m, g[r][c]);
    return m;
  }

  function smallestFilled(g) {
    let min = Infinity, pos = null;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        const v = g[r][c];
        if (v > 0 && v < min) { min = v; pos = [r, c]; }
      }
    return pos;
  }

  // Classic structure signal: monotonicity along rows and columns. Reward
  // sequences that increase or decrease smoothly, which keeps merges flowing.
  function structureBonus(g) {
    let bonus = 0;
    for (let r = 0; r < SIZE; r++) bonus += monotonicScore(g[r]);
    for (let c = 0; c < SIZE; c++) {
      const col = g.map((row) => row[c]);
      bonus += monotonicScore(col);
    }
    return bonus;
  }

  function monotonicScore(line) {
    let inc = 0, dec = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      if (a <= b) inc++;
      if (a >= b) dec++;
    }
    return Math.max(inc, dec) - 1; // 0..2
  }

  function isCorner(r, c) {
    return (r === 0 || r === SIZE - 1) && (c === 0 || c === SIZE - 1);
  }
  function isBorder(r, c) {
    return r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1;
  }

  // ---- move (mutates grid + score) ----
  function move(dir) {
    prevGrid = cloneGrid(grid); // remember state before the move
    const res = simulateMove(grid, dir);
    if (!res.changed) {
      prevGrid = null; // move didn't happen; don't mislead lucky logic
      return false;
    }
    grid = res.grid;
    score += res.score;
    if (res.score > 0) {
      // detect a 2048 produced by a merge
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (grid[r][c] === 2048 && !won) won = "just";
    }
    return true;
  }

  // ---- rendering ----
  function render() {
    tileLayer.innerHTML = "";
    const rect = boardEl.getBoundingClientRect();
    const pad = 12;            // matches CSS padding
    const gap = 12;            // matches CSS gap
    const inner = rect.width - pad * 2;
    const tile = (inner - gap * (SIZE - 1)) / SIZE;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (!v) continue;
        const el = document.createElement("div");
        el.className = "tile t-" + Math.min(v, 2048);
        el.textContent = v;
        el.style.width = tile + "px";
        el.style.height = tile + "px";
        el.style.left = c * (tile + gap) + "px";
        el.style.top = r * (tile + gap) + "px";
        el.style.fontSize = Math.max(16, tile * 0.4) + "px";
        tileLayer.appendChild(el);
      }
    }

    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem(STORAGE_KEY, String(best));
    }

    if (won === "just") {
      won = true;
      showOverlay("You win! 🎉", "win", true);
    } else if (!over && !canMove()) {
      over = true;
      showOverlay("Game over!", "lose", false);
    }
  }

  function showOverlay(text, cls, keepPlaying) {
    clearOverlay();
    const o = document.createElement("div");
    o.className = "overlay " + cls;
    const h = document.createElement("h2");
    h.textContent = text;
    o.appendChild(h);
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = keepPlaying ? "Keep going" : "Try again";
    btn.onclick = (e) => {
      e.stopPropagation();
      if (keepPlaying) clearOverlay();
      else newGame();
    };
    o.appendChild(btn);
    boardEl.appendChild(o);
  }

  function clearOverlay() {
    boardEl.querySelectorAll(".overlay").forEach((n) => n.remove());
  }

  // ---- lucky mode UI ----
  function syncLuckyUI() {
    if (!luckyToggle) return;
    luckyToggle.setAttribute("aria-pressed", String(luckyMode));
    luckyToggle.classList.toggle("on", luckyMode);
    luckyToggle.textContent = luckyMode ? "🍀 Lucky: ON" : "🍀 Lucky: OFF";
  }

  function toggleLucky() {
    luckyMode = !luckyMode;
    localStorage.setItem(LUCKY_KEY, luckyMode ? "1" : "0");
    syncLuckyUI();
  }

  // ---- input ----
  function handleMove(dir) {
    if (over) return;
    if (move(dir)) {
      addRandomTile();
      render();
    }
  }

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      const map = {
        ArrowLeft: "left", ArrowRight: "right",
        ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      if (e.key === "r" || e.key === "R") { newGame(); return; }
      if (e.key === "l" || e.key === "L") { toggleLucky(); return; }
      const dir = map[e.key];
      if (dir) { e.preventDefault(); handleMove(dir); }
    });

    // touch / swipe
    let sx = 0, sy = 0, tracking = false;
    boardEl.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      sx = t.clientX; sy = t.clientY; tracking = true;
    }, { passive: true });
    boardEl.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < 24) return;
      if (ax > ay) handleMove(dx > 0 ? "right" : "left");
      else handleMove(dy > 0 ? "down" : "up");
    }, { passive: true });

    newGameBtn.addEventListener("click", newGame);
    if (luckyToggle) luckyToggle.addEventListener("click", toggleLucky);
    window.addEventListener("resize", render);
  }

  init();
})();
