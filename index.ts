const SCREEN_FACTOR = 30;
const SCREEN_WIDTH = Math.floor(16*SCREEN_FACTOR);
const SCREEN_HEIGHT = Math.floor(9*SCREEN_FACTOR);

const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const image = new Image();
  image.src = url;
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = reject;
  });
};

const loadImageData = async (url: string): Promise<ImageData> => {
  const image = await loadImage(url);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height);
};

(async () => {
  const gameCanvas = document.querySelector<HTMLCanvasElement>('#game')!;
  const factor = 80;
  gameCanvas.width = 16*factor;
  gameCanvas.height = 9*factor;
  const ctx = gameCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const [wall, key] = await Promise.all([
    loadImageData('assets/images/wall.png'),
    loadImageData('assets/images/key.png'),
  ]);

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

  const KEY_SCALE = 0.4;
  const KEY_Z = KEY_SCALE;
  const sprites = [
    {
      imageData: key,
      position: new game.Vector2(1.5, 1.5),
      z: KEY_Z,
      scale: KEY_SCALE,
    },
  ];

  const player = game.createPlayer(
    game.sceneSize(scene).scale(0.63),
    Math.PI*1.25,
  );

  const isDev = window.location.hostname === 'localhost';
  if (isDev) {
    const ws = new WebSocket('ws://localhost:6970');

    ws.addEventListener('message', async (event) => {
      if (event.data === 'hot') {
        console.log('Hot reloading module');
        game = await import('./game.js?date='+new Date().getTime());
      } else if (event.data === 'cold') {
        window.location.reload()
      }
    });
  }

  const backImageData = new ImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
  backImageData.data.fill(255);
  const backCanvas = new OffscreenCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
  const backCtx = backCanvas.getContext('2d')!;
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
        case 'ArrowUp':    case 'KeyW': player.movingForward  = true; break;
        case 'ArrowDown':  case 'KeyS': player.movingBackward = true; break;
        case 'ArrowLeft':  case 'KeyA': player.turningLeft    = true; break;
        case 'ArrowRight': case 'KeyD': player.turningRight   = true; break;
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    if (!e.repeat) {
      switch (e.code) {
        case 'ArrowUp':    case 'KeyW': player.movingForward  = false; break;
        case 'ArrowDown':  case 'KeyS': player.movingBackward = false; break;
        case 'ArrowLeft':  case 'KeyA': player.turningLeft    = false; break;
        case 'ArrowRight': case 'KeyD': player.turningRight   = false; break;
      }
    }
  });

  let prevTimestamp = 0;
  const frame = (timestamp: number) => {
    const deltaTime = (timestamp - prevTimestamp)/1000;
    prevTimestamp = timestamp;
    game.renderGame(display, deltaTime, player, scene, sprites);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame((timestamp) => {
    prevTimestamp = timestamp;
    window.requestAnimationFrame(frame);
  });
})();

