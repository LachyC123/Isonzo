# BrawlCrown – Arena Fighter

A 3D arena brawler running entirely in the browser. Built with Three.js, no server required.

## Play Online

Deploy to GitHub Pages with the `/docs` folder as the source, then visit your Pages URL.

## Run Locally

Any static file server works. For example:

```bash
# Python
python3 -m http.server 8000

# Node (npx)
npx serve .

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

> **Note:** The game uses ES module imports and `importmap`, so it must be served over HTTP — opening `index.html` directly as a file will not work.

## Deploy to GitHub Pages

1. Go to **Settings → Pages** in your repository.
2. Set the source to **Deploy from a branch**.
3. Select the branch and set the folder to `/ (root)`.
4. Save — your game will be live at `https://<user>.github.io/<repo>/`.

## Game Overview

- **Genre**: 3D arena brawler (free-for-all)
- **Players**: 1 human + 3 AI bots
- **Win condition**: KO opponents (health → 0) or ring them out (knock off the arena)
- **Match format**: Best-of-3 rounds
- **Controls**: Keyboard + mouse (desktop) or touch controls (mobile)

## Project Structure

```
index.html             Entry point (GitHub Pages root)
styles.css             All UI styling
main.js                Game bootstrap
src/
  game.js              Game state machine & loop
  scene.js             Three.js scene, arena, camera
  input.js             Keyboard & touch input
  ui.js                HUD, menus, damage numbers
  audio.js             WebAudio procedural SFX
  physics.js           Gravity, collisions, bounds
  character.js         Fighter model & animation
  combat.js            Attack resolution & state machine
  ai.js                Bot decision-making
  items.js             Pickup spawning & buffs
  utils.js             Math helpers & object pool
assets/                (procedurally generated — no external files)
meta/
  design.md            Game design document
  controls.md          Controls reference
```

## Tech Stack

- **Three.js** r160 (via CDN import map)
- **WebAudio API** for procedural sound effects
- **Vanilla JS** ES modules — no build step, no bundler
- **CSS** for all UI (no framework)

## License

Original work — all game design, code, and assets are original.
