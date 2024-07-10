"use strict";
const SCREEN_FACTOR = 30;
const SCREEN_WIDTH = Math.floor(16 * SCREEN_FACTOR);
const SCREEN_HEIGHT = Math.floor(9 * SCREEN_FACTOR);
(async () => {
    const gameCanvas = document.querySelector('#game');
    const factor = 80;
    gameCanvas.width = 16 * factor;
    gameCanvas.height = 9 * factor;
    const ctx = gameCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let game = await import('./game.js');
    const isDev = window.location.hostname === 'localhost';
    if (isDev) {
        const ws = new WebSocket('ws://localhost:6970');
        ws.addEventListener('message', async (event) => {
            if (event.data === 'hot') {
                console.log('Hot reloading module');
                game = await import('./game.js?date=' + new Date().getTime());
            }
            else if (event.data === 'cold') {
                window.location.reload();
            }
        });
    }
    const display = game.createDisplay(ctx, SCREEN_WIDTH, SCREEN_HEIGHT);
    const gameState = await game.createGame();
    window.addEventListener('keydown', (e) => {
        if (!e.repeat) {
            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    gameState.player.movingForward = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    gameState.player.movingBackward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    gameState.player.turningLeft = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    gameState.player.turningRight = true;
                    break;
                case 'Space':
                    {
                        game.throwBomb(gameState.player, gameState.bombs);
                    }
                    break;
            }
        }
    });
    window.addEventListener('keyup', (e) => {
        if (!e.repeat) {
            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    gameState.player.movingForward = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    gameState.player.movingBackward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    gameState.player.turningLeft = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    gameState.player.turningRight = false;
                    break;
            }
        }
    });
    let prevTimestamp = 0;
    const frame = (timestamp) => {
        const deltaTime = (timestamp - prevTimestamp) / 1000;
        const time = timestamp / 1000;
        prevTimestamp = timestamp;
        game.renderGame(display, deltaTime, time, gameState);
        window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame((timestamp) => {
        prevTimestamp = timestamp;
        window.requestAnimationFrame(frame);
    });
})();
//# sourceMappingURL=index.js.map