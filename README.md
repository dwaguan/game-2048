# 2048

A browser-based clone of the classic [2048](https://play2048.co/) puzzle game. No build step, no dependencies — just open `index.html`.

## Play

1. Open `index.html` in any modern browser (or serve the folder with `python -m http.server`).
2. Use **arrow keys** (or **WASD**) to move all tiles.
3. Tiles with the same number merge into one. Reach **2048** to win — then keep going for a higher score.
4. **Swipe** on touch devices. Press **R** to restart.

## Files

- `index.html` — markup
- `style.css` — board and tile styling
- `game.js` — game logic, rendering, and input

## Features

- Smooth slide/merge animations
- Score + best-score (saved to `localStorage`)
- Win and game-over overlays
- Keyboard, mouse, and touch input
