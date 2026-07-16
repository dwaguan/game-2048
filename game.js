(() => {
  "use strict";

  const SIZE = 4;
  const STORAGE_KEY = "game2048:best";

  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const newGameBtn = document.getElementById("new-game");

  let grid;        // SIZE x SIZE of values (0 = empty)
  let score;
  let best;
  let tileLayer;   // absolutely-positioned layer holding tile elements
  let won;         // keep playing after first win
  let over;

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

    newGame();
    bindInput();
  }

  function newGame() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    won = false;
    over = false;
    clearOverlay();
    addRandomTile();
    addRandomTile();
    render();
    scoreEl.textContent = score;
  }

  // ---- core logic ----
  function emptyCells() {
    const out = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c] === 0) out.push([r, c]);
    return out;
  }

  function addRandomTile() {
    const cells = emptyCells();
    if (!cells.length) return;
    const [r, c] = cells[Math.floor(Math.random() * cells.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  // move tiles in the given direction. Returns true if anything changed.
  function move(dir) {
    // dir: "left" | "right" | "up" | "down"
    let changed = false;
    const rotated = rotateTo(dir);   // work on a "left" orientation
    for (let r = 0; r < SIZE; r++) {
      const row = rotated[r].filter((v) => v !== 0);
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) {
          row[i] *= 2;
          score += row[i];
          if (row[i] === 2048 && !won) won = "just";
          row.splice(i + 1, 1);
        }
      }
      while (row.length < SIZE) row.push(0);
      if (row.some((v, i) => v !== rotated[r][i])) changed = true;
      rotated[r] = row;
    }
    grid = rotateBack(rotated, dir);
    return changed;
  }

  // transform grid so that moving `dir` becomes moving left
  function rotateTo(dir) {
    if (dir === "left") return grid.map((r) => [...r]);
    if (dir === "right") return grid.map((r) => [...r].reverse());
    if (dir === "up") return transpose(grid);
    if (dir === "down") return transpose(grid).map((r) => [...r].reverse());
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

  function canMove() {
    if (emptyCells().length) return true;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
        if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
      }
    return false;
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
    window.addEventListener("resize", render);
  }

  init();
})();
