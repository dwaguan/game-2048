# 2048

A browser-based clone of the classic [2048](https://play2048.co/) puzzle game. No build step, no dependencies — just open `index.html`.

**▶ Play online:** <https://dwaguan.github.io/game-2048/>

## How to play

1. Use the **arrow keys** (or **WASD**) to move all tiles in a direction.
2. Tiles with the same number merge into one, doubling the value.
3. Reach **2048** to win — then keep going for a higher score.
4. **Swipe** on touch devices. Press **R** to restart, **L** to toggle Lucky Mode, **U** to regenerate.

## Lucky Mode 🍀

An optional "assisted" mode that changes *where* new tiles spawn. Instead of
purely random placement, the game looks one to two moves ahead and prefers
spawns that keep you alive and set up merges. Toggle it with the **🍀 Lucky**
button or the **L** key — your choice is remembered between sessions.

When on, each candidate spawn cell (and a `2` vs `4` value) is scored on:

1. **Stall avoidance** — rejects placements that leave you with no legal move,
   and penalizes placements that force you into a dead end next turn.
2. **One-step merge enabler** — prefers a spawn that becomes immediately
   mergeable on your next move, and favors spawning `2` (it chains and fills
   the board more slowly than `4`).
3. **Border preservation** — if your last move was forced and dragged a large
   tile off the border, the new tile is placed near your *smallest* tile so the
   move can be reversed and the big tile restored to the border.
4. **Structure** — rewards monotonic rows/columns and corner anchors, the
   classic 2048 strategy signals, so spawns don't wreck your board shape.
5. **Variety** — near-optimal candidates are chosen between with weighted
   randomness, so the game still feels fresh rather than deterministic.

Lucky Mode only affects spawn placement; you still choose every move. It's a
nudge, not a solver — it won't guarantee a win, but it stops the game from
sabotaging you.

## Regenerate 🔄

Not happy with the tile the game just gave you? Hit **🔄 Regenerate** (or press
**U**) to clear the most recently generated tile and spawn a fresh one through
the normal mechanism — random in standard play, look-ahead in Lucky Mode.

Regenerate works **only while the last tile is still sitting in its spawn cell,
unchanged**. The button auto-disables (and **U** does nothing) in every other
situation:

- The spawn tile already moved or merged away on a subsequent move
- A *different* tile slid into the spawn cell (it's not your generated tile)
- The game is over, or no tile has been generated yet

So you can re-roll a bad spawn immediately after a move, but you can't undo a
move or cherry-pick tiles that have already joined the board.

## Features

- Smooth slide and merge animations
- Score plus best-score, saved to `localStorage` between sessions
- Win and game-over overlays with "keep going" / "try again"
- **Lucky Mode** — look-ahead spawn placement (see above)
- **Regenerate** — re-roll the last generated tile (see above)
- Keyboard (arrows + WASD), touch/swipe, **R**-to-restart, **L**-lucky, **U**-regenerate
- Responsive 4×4 board that scales to the viewport
- Self-contained: a single HTML file plus `style.css` and `game.js`

## Run locally

Open `index.html` directly in any modern browser, or serve the folder:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Files

- `index.html` — markup and board structure
- `style.css` — board, tile, and overlay styling
- `game.js` — game logic, rendering, and input handling

## License

Released into the public domain under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
