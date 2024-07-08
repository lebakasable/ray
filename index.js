"use strict";
const SCREEN_FACTOR = 30;
const SCREEN_WIDTH = Math.floor(16 * SCREEN_FACTOR);
const SCREEN_HEIGHT = Math.floor(9 * SCREEN_FACTOR);
const loadImage = async (url) => {
    const image = new Image();
    image.src = url;
    return new Promise((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = reject;
    });
};
const loadImageData = async (url) => {
    const image = await loadImage(url);
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
};
(async () => {
    const gameCanvas = document.querySelector('#game');
    const factor = 80;
    gameCanvas.width = 16 * factor;
    gameCanvas.height = 9 * factor;
    const ctx = gameCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const [wall, key, bombImageData, particleImageData] = await Promise.all([
        loadImageData('assets/images/wall.png'),
        loadImageData('assets/images/key.png'),
        loadImageData('assets/images/bomb.png'),
        loadImageData('assets/images/particle.png'),
    ]);
    const itemPickupSound = new Audio('assets/sounds/pickup.ogg');
    const bombRicochetSound = new Audio('assets/sounds/ricochet.wav');
    const bombBlastSound = new Audio('assets/sounds/blast.ogg');
    const assets = {
        bombImageData,
        particleImageData,
        bombRicochetSound,
        itemPickupSound,
        bombBlastSound,
    };
    let game = await import('./game.js');
    const scene = game.createScene([
        [null, null, wall, wall, wall, null, null],
        [null, null, null, null, null, null, null],
        [wall, null, null, null, null, null, null],
        [wall, null, null, null, null, null, null],
        [wall, null, null, null, null, null, null],
        [null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null],
    ]);
    const player = game.createPlayer(new game.Vector2(scene.width, scene.height).scale(0.63), Math.PI * 1.25);
    const items = [
        {
            alive: true,
            imageData: bombImageData,
            position: new game.Vector2(1.5, 2.5),
        },
        {
            alive: true,
            imageData: key,
            position: new game.Vector2(2.5, 1.5),
        },
        {
            alive: true,
            imageData: key,
            position: new game.Vector2(3, 1.5),
        },
        {
            alive: true,
            imageData: key,
            position: new game.Vector2(3.5, 1.5),
        },
        {
            alive: true,
            imageData: key,
            position: new game.Vector2(4, 1.5),
        },
        {
            alive: true,
            imageData: key,
            position: new game.Vector2(4.5, 1.5),
        },
    ];
    const bombs = game.allocateBombs(10);
    const particles = game.allocateParticles(1000);
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
    const backImageData = new ImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    backImageData.data.fill(255);
    const backCanvas = new OffscreenCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    const backCtx = backCanvas.getContext('2d');
    backCtx.imageSmoothingEnabled = false;
    const display = {
        ctx,
        backCtx,
        backImageData,
        zBuffer: Array(SCREEN_WIDTH).fill(0),
    };
    window.addEventListener('keydown', (e) => {
        if (!e.repeat) {
            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    player.movingForward = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    player.movingBackward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    player.turningLeft = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    player.turningRight = true;
                    break;
                case 'Space':
                    {
                        game.throwBomb(player, bombs);
                        console.log(bombs);
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
                    player.movingForward = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    player.movingBackward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    player.turningLeft = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    player.turningRight = false;
                    break;
            }
        }
    });
    let prevTimestamp = 0;
    const frame = (timestamp) => {
        const deltaTime = (timestamp - prevTimestamp) / 1000;
        const time = timestamp / 1000;
        prevTimestamp = timestamp;
        game.renderGame(display, deltaTime, time, player, scene, items, bombs, particles, assets);
        window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame((timestamp) => {
        prevTimestamp = timestamp;
        window.requestAnimationFrame(frame);
    });
})();
//# sourceMappingURL=index.js.map