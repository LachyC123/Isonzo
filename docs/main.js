import { Game } from './src/game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game();
game.init(canvas);

let lastTime = performance.now();

function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    game.update(dt);
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
