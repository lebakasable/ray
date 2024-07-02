import './style.css';

const EPS = 1e-6;
const NEAR_CLIPPING_PLANE = 0.1;
const FAR_CLIPPING_PLANE = 10.0;
const FOV = Math.PI*0.5;
const SCREEN_FACTOR = 10;
const SCREEN_WIDTH = 16*SCREEN_FACTOR;
const SCREEN_HEIGHT = 9*SCREEN_FACTOR;
const PLAYER_SPEED = 2;
const PLAYER_SIZE = 0.5;

class Color {
  static RED = new Color(1, 0, 0, 1);
  static GREEN = new Color(0, 1, 0, 1);
  static BLUE = new Color(0, 0, 1, 1);
  static YELLOW = new Color(1, 1, 0, 1);
  static PURPLE = new Color(1, 0, 1, 1);
  static BLACK = new Color(0, 0, 0, 1);
  static WHITE = new Color(1, 1, 1, 1);

  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number,
  ) {}

  brightness(factor: number): Color {
    return new Color(
      this.r*factor,
      this.g*factor,
      this.b*factor,
      this.a*factor,
    );
  }

  toString(): string {
    return `rgba(${Math.floor(this.r*255)}, ${Math.floor(this.g*255)}, ${Math.floor(this.b*255)}, ${this.a})`;
  }
}

class Vector2 {
  constructor(
    public x: number,
    public y: number,
  ) {}

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static angle(angle: number): Vector2 {
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }

  static scalar(value: number): Vector2 {
    return new Vector2(value, value);
  }

  get array(): [number, number] {
    return [this.x, this.y];
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  mul(other: Vector2): Vector2 {
    return new Vector2(this.x*other.x, this.y*other.y);
  }

  div(other: Vector2): Vector2 {
    return new Vector2(this.x/other.x, this.y/other.y);
  }

  scale(value: number): Vector2 {
    return new Vector2(this.x*value, this.y*value);
  }

  dot(other: Vector2): number {
    return this.x*other.x + this.y*other.y;
  }

  lerp(other: Vector2, t: number): Vector2 {
    return other.sub(this).scale(t).add(this);
  }

  rot90(): Vector2 {
    return new Vector2(-this.y, this.x);
  }

  get length(): number {
    return Math.sqrt(this.x*this.x + this.y*this.y);
  }

  get sqrLength(): number {
    return this.x*this.x + this.y*this.y;
  }

  norm(): Vector2 {
    if (this.length === 0) return new Vector2(0, 0);
    return new Vector2(this.x/this.length, this.y/this.length);
  }

  distanceTo(other: Vector2): number {
    return other.sub(this).length;
  }

  sqrDistanceTo(other: Vector2): number {
    return other.sub(this).sqrLength;
  }

  map(f: (x: number) => number): Vector2 {
    return new Vector2(f(this.x), f(this.y));
  }
}

const fillCircle = (ctx: CanvasRenderingContext2D, center: Vector2, radius: number) => {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2*Math.PI);
  ctx.fill();
};
fillCircle;

const strokeLine = (ctx: CanvasRenderingContext2D, p1: Vector2, p2: Vector2) => {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
};

const snap = (x: number, dx: number): number => {
  if (dx > 0) return Math.ceil(x + Math.sign(dx)*EPS);
  if (dx < 0) return Math.floor(x + Math.sign(dx)*EPS);
  return x;
};

const hittingWall = (p1: Vector2, p2: Vector2): Vector2 => {
  const d = p2.sub(p1);
  return new Vector2(Math.floor(p2.x + Math.sign(d.x)*EPS),
                     Math.floor(p2.y + Math.sign(d.y)*EPS));
};

const rayStep = (p1: Vector2, p2: Vector2): Vector2 => {
  let p3 = p2;

  const d = p2.sub(p1);
  if (d.x !== 0) {
    const k = d.y/d.x;
    const c = p1.y - k*p1.x;

    const x3 = snap(p2.x, d.x);
    const y3 = x3*k + c;
    p3 = new Vector2(x3, y3);

    if (k !== 0) {
      const y3 = snap(p2.y, d.y);
      const x3 = (y3 - c)/k;
      const p3t = new Vector2(x3, y3);
      if (p2.sqrDistanceTo(p3t) < p2.sqrDistanceTo(p3)) {
        p3 = p3t;
      }
    }
  } else {
    const x3 = p2.x;
    const y3 = snap(p2.y, d.y);
    p3 = new Vector2(x3, y3);
  }

  return p3;
};

type Tile = Color | ImageData | null;

class Scene {
  public walls: Tile[];
  public width: number;
  public height: number;

  constructor(
    walls: Tile[][],
    public floor: Tile,
  ) {
    this.height = walls.length;
    this.width = Number.MIN_VALUE;
    for (const row of walls) {
      this.width = Math.max(this.width, row.length);
    }
    this.walls = [];
    for (const row of walls) {
      this.walls = this.walls.concat(row);  
      for (let i = 0; i < this.width - row.length; ++i) {
        this.walls.push(null);
      }
    }
  }

  get size(): Vector2 {
    return new Vector2(this.width, this.height);
  }

  has(p: Vector2): boolean {
    return 0 <= p.x && p.x < this.width && 0 <= p.y && p.y < this.height;
  }

  getWall(p: Vector2): Tile | undefined {
    if (!this.has(p)) return undefined;
    const fp = p.map(Math.floor);
    return this.walls[fp.y*this.width + fp.x];
  }

  getFloor(p: Vector2): Tile | undefined {
    const fp = p.map(Math.floor);
    if ((fp.x + fp.y)%2 === 0) {
      return Color.BLACK;
    } else {
      return Color.BLACK.brightness(0.1);
    }
  }

  getCeiling(p: Vector2): Tile | undefined {
    const fp = p.map(Math.floor);
    if ((fp.x + fp.y)%2 === 0) {
      return Color.BLUE;
    } else {
      return Color.PURPLE;
    }
  }
}

const castRay = (scene: Scene, p1: Vector2, p2: Vector2): Vector2 => {
  let start = p1;
  while (start.sqrDistanceTo(p1) < FAR_CLIPPING_PLANE*FAR_CLIPPING_PLANE) {
    const c = hittingWall(p1, p2);
    if (scene.getWall(c)) break;
    const p3 = rayStep(p1, p2);
    p1 = p2;
    p2 = p3;
  }
  return p2;
};

class Player {
  constructor(
    public position: Vector2,
    public direction: number,
  ) {}

  fovRange(clippingPlane: number): [Vector2, Vector2] {
    const l = Math.tan(FOV*0.5)*clippingPlane;
    let p = this.position.add(Vector2.angle(this.direction).scale(clippingPlane));
    const p1 = p.sub(p.sub(this.position).rot90().norm().scale(l));
    const p2 = p.add(p.sub(this.position).rot90().norm().scale(l));
    return [p1, p2];
  }
}

const renderMinimap = (ctx: CanvasRenderingContext2D, player: Player, position: Vector2, size: Vector2, scene: Scene) => {
  ctx.save();

  ctx.translate(...position.array);
  ctx.scale(...size.div(scene.size).array);
  ctx.lineWidth = 0.05;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ...scene.size.array);

  for (let y = 0; y < scene.size.y; ++y) {
    for (let x = 0; x < scene.size.x; ++x) {
      const wall = scene.getWall(new Vector2(x, y));
      if (wall instanceof Color) {
        ctx.fillStyle = wall.toString();
        ctx.fillRect(x, y, 1, 1);
      } else if (wall instanceof ImageData) {
        const image = document.createElement('canvas');
        image.width = wall.width;
        image.height = wall.height;
        image.getContext('2d')!.putImageData(wall, 0, 0);
        ctx.drawImage(image, x, y, 1, 1);
      }
    }
  }

  ctx.strokeStyle = 'grey';
  for (let x = 0; x <= scene.size.x; ++x) {
    strokeLine(ctx, new Vector2(x, 0), new Vector2(x, scene.size.y));
  }
  for (let y = 0; y <= scene.size.y; ++y) {
    strokeLine(ctx, new Vector2(0, y), new Vector2(scene.size.x, y));
  }

  ctx.strokeStyle = 'purple';
  ctx.strokeRect(player.position.x - PLAYER_SIZE*0.5, player.position.y - PLAYER_SIZE*0.5, PLAYER_SIZE, PLAYER_SIZE);

  const [near1, near2] = player.fovRange(NEAR_CLIPPING_PLANE);
  ctx.strokeStyle = 'purple';
  strokeLine(ctx, near1, near2);
  strokeLine(ctx, player.position, near1);
  strokeLine(ctx, player.position, near2);

  ctx.restore();
};

const renderWalls = (imageData: ImageData, player: Player, scene: Scene) => {
  const [r1, r2] = player.fovRange(NEAR_CLIPPING_PLANE);
  for (let x = 0; x < SCREEN_WIDTH; ++x) {
    const p = castRay(scene, player.position, r1.lerp(r2, x/SCREEN_WIDTH));
    const c = hittingWall(player.position, p);
    const v = p.sub(player.position);
    const d = Vector2.angle(player.direction);
    const stripHeight = SCREEN_HEIGHT/v.dot(d);
    const wall = scene.getWall(c);
    if (wall instanceof Color) {
      const color = wall.brightness(1/v.dot(d));
      for (let dy = 0; dy < Math.ceil(stripHeight); ++dy) {
        const y = Math.floor((SCREEN_HEIGHT - stripHeight)*0.5) + dy;
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 0] = color.r*255;
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 1] = color.g*255;
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 2] = color.b*255;
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 3] = color.a*255;
      }
    } else if (wall instanceof ImageData) {
      const t = p.sub(c);
      const u = (Math.abs(t.x) < EPS || Math.abs(t.x - 1) < EPS) && t.y > 0
        ? t.y
        : t.x;
      for (let dy = 0; dy < Math.ceil(stripHeight); ++dy) {
        const tx = Math.floor(u*wall.width);
        const ty = Math.floor(dy/Math.ceil(stripHeight)*wall.height);
        const y = Math.floor((SCREEN_HEIGHT - stripHeight)*0.5) + dy;
        const v = p.sub(player.position);
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 0] = wall.data[(ty*wall.width + tx)*4 + 0]/v.dot(d);
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 1] = wall.data[(ty*wall.width + tx)*4 + 1]/v.dot(d);
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 2] = wall.data[(ty*wall.width + tx)*4 + 2]/v.dot(d);
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 3] = wall.data[(ty*wall.width + tx)*4 + 3];
      }
    }
  }
};

const renderFloor = (imageData: ImageData, player: Player, scene: Scene) => {
  const pz = SCREEN_HEIGHT/2;
  const [p1, p2] = player.fovRange(NEAR_CLIPPING_PLANE);
  const bp = p1.sub(player.position).length;
  for (let y = SCREEN_HEIGHT/2; y < SCREEN_HEIGHT; ++y) {
    const sz = SCREEN_HEIGHT - y - 1;
    const ap = pz - sz;
    const b = bp/ap*pz/NEAR_CLIPPING_PLANE;
    const t1 = player.position.add(p1.sub(player.position).norm().scale(b));
    const t2 = player.position.add(p2.sub(player.position).norm().scale(b));
    for (let x = 0; x < SCREEN_WIDTH; ++x) {
      const t = t1.lerp(t2, x/SCREEN_WIDTH);
      const floor = scene.getFloor(t);
      if (floor instanceof Color) {
        const color = floor.brightness(1/player.position.distanceTo(t));
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 0] = color.r*255;
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 1] = color.g*255;
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 2] = color.b*255;
        imageData.data[(y*SCREEN_WIDTH + x)*4 + 3] = color.a*255;
      }
    }
  }
};

const renderCeiling = (imageData: ImageData, player: Player, scene: Scene) => {
  const pz = SCREEN_HEIGHT/2;
  const [p1, p2] = player.fovRange(NEAR_CLIPPING_PLANE);
  const bp = p1.sub(player.position).length;
  for (let y = SCREEN_HEIGHT/2; y < SCREEN_HEIGHT; ++y) {
    const sz = SCREEN_HEIGHT - y - 1;
    const ap = pz - sz;
    const b = bp/ap*pz/NEAR_CLIPPING_PLANE;
    const t1 = player.position.add(p1.sub(player.position).norm().scale(b));
    const t2 = player.position.add(p2.sub(player.position).norm().scale(b));
    for (let x = 0; x < SCREEN_WIDTH; ++x) {
      const t = t1.lerp(t2, x/SCREEN_WIDTH);
      const ceiling = scene.getCeiling(t);
      if (ceiling instanceof Color) {
        const color = ceiling.brightness(1/player.position.distanceTo(t));
        imageData.data[(sz*SCREEN_WIDTH + x)*4 + 0] = color.r*255;
        imageData.data[(sz*SCREEN_WIDTH + x)*4 + 1] = color.g*255;
        imageData.data[(sz*SCREEN_WIDTH + x)*4 + 2] = color.b*255;
        imageData.data[(sz*SCREEN_WIDTH + x)*4 + 3] = color.a*255;
      }
    }
  }
};

const renderGame = (ctx: CanvasRenderingContext2D, backCtx: OffscreenCanvasRenderingContext2D, backImageData: ImageData, player: Player, scene: Scene) => {
  const minimapPosition = new Vector2(ctx.canvas.width, ctx.canvas.height).scale(0.03);
  const wallSize = ctx.canvas.width*0.03;
  const minimapSize = scene.size.scale(wallSize);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  renderFloor(backImageData, player, scene);
  renderCeiling(backImageData, player, scene);
  renderWalls(backImageData, player, scene);
  backCtx.putImageData(backImageData, 0, 0);
  ctx.drawImage(backCtx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);

  renderMinimap(ctx, player, minimapPosition, minimapSize, scene);
};

const loadImageData = (url: string): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = url;
    image.onload = () => {
      const canvas = new OffscreenCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      resolve(ctx.getImageData(0, 0, image.width, image.height));
    };
    image.onerror = reject;
  });
};

const playerCanGoThere = (scene: Scene, p: Vector2): boolean => {
  const corner = p.sub(Vector2.scalar(PLAYER_SIZE*0.5));
  for (let dx = 0; dx < 2; ++dx) {
    for (let dy = 0; dy < 2; ++dy) {
      if (scene.getWall(corner.add(new Vector2(dx, dy).scale(PLAYER_SIZE)))) {
        return false;
      }
    }
  }
  return true;
};

(async () => {
  const game = document.querySelector<HTMLCanvasElement>('#game')!;
  const factor = 60;
  game.width = 16*factor;
  game.height = 9*factor;
  const ctx = game.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const backImageData = new ImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
  const backCanvas = new OffscreenCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
  const backCtx = backCanvas.getContext('2d')!;
  backCtx.imageSmoothingEnabled = false;

  const wall = await loadImageData('/bricks/dungeonbricks.png');
  const floor = await loadImageData('/wood/darkwood.png');

  const scene = new Scene([
    [null, null, wall, wall, null, null, null, null, null],
    [null, null, null, wall, null, null, null, null, null],
    [null, wall, wall, wall, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
  ], floor);

  const player = new Player(
    scene.size.mul(new Vector2(0.63, 0.63)),
    Math.PI*1.25);
  let movingForward = false;
  let movingBackward = false;
  let turningLeft = false;
  let turningRight = false;

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': movingForward = true; break;
      case 'KeyS': movingBackward = true; break;
      case 'KeyA': turningLeft = true; break;
      case 'KeyD': turningRight = true; break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': movingForward = false; break;
      case 'KeyS': movingBackward = false; break;
      case 'KeyA': turningLeft = false; break;
      case 'KeyD': turningRight = false; break;
    }
  });

  let prevTimestamp: number | null = null;
  const frame = (timestamp: number) => {
    const deltaTime = (timestamp - prevTimestamp!)/1000;
    prevTimestamp = timestamp;
    let velocity = Vector2.zero();
    let angularVelocity = 0.0;
    if (movingForward) {
      velocity = velocity.add(Vector2.angle(player.direction).scale(PLAYER_SPEED));
    }
    if (movingBackward) {
      velocity = velocity.sub(Vector2.angle(player.direction).scale(PLAYER_SPEED));
    }
    if (turningLeft) {
      angularVelocity -= Math.PI*0.5;
    }
    if (turningRight) {
      angularVelocity += Math.PI*0.5;
    }
    player.direction = player.direction + angularVelocity*deltaTime;
    const nx = player.position.x + velocity.x*deltaTime;
    if (playerCanGoThere(scene, new Vector2(nx, player.position.y))) {
      player.position.x = nx;
    }
    const ny = player.position.y + velocity.y*deltaTime;
    if (playerCanGoThere(scene, new Vector2(player.position.x, ny))) {
      player.position.y = ny;
    }
    renderGame(ctx, backCtx, backImageData, player, scene);
    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame((timestamp) => {
    prevTimestamp = timestamp;
    window.requestAnimationFrame(frame);
  });
})();
