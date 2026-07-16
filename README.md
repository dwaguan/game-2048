# 2048

A browser-based clone of the classic [2048](https://play2048.co/) puzzle game. No build step, no dependencies — just open `index.html`.

**▶ Play online:** <https://dwaguan.github.io/game-2048/>

## How to play

1. Use the **arrow keys** (or **WASD**) to move all tiles in a direction.
2. Tiles with the same number merge into one, doubling the value.
3. Reach **2048** to win — then keep going for a higher score.
4. **Swipe** on touch devices. Press **R** to restart at any time.

## Features

- Smooth slide and merge animations
- Score plus best-score, saved to `localStorage` between sessions
- Win and game-over overlays with "keep going" / "try again"
- Keyboard (arrows + WASD), touch/swipe, and **R**-to-restart support
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
