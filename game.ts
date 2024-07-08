const EPS = 1e-6;
const NEAR_CLIPPING_PLANE = 0.1;
const FAR_CLIPPING_PLANE = 10.0;
const FOV = Math.PI*0.5;
const HALF_FOV_COS = Math.cos(FOV*0.5);
const PLAYER_SPEED = 2;
const PLAYER_RADIUS = 0.5;

const ITEM_FREQ = 1.0;
const ITEM_AMP = 0.03;

const BOMB_LIFETIME = 2;
const BOMB_THROW_VELOCITY = 5;
const BOMB_GRAVITY = 10;
const BOMB_DAMP = 0.8;
const BOMB_SCALE = 0.25;
const BOMB_PARTICLE_COUNT = 30;

const PARTICLE_LIFETIME = 1.0;
const PARTICLE_GRAVITY = 10;
const PARTICLE_DAMP = 0.8;
const PARTICLE_SCALE = 0.1;
const PARTICLE_MAX_SPEED = 8;

const MINIMAP = false;
const MINIMAP_SPRITES = false;
const MINIMAP_PLAYER_SIZE = 0.5;
const MINIMAP_SPRITE_SIZE = 0.3;
const MINIMAP_SCALE = 0.03;

interface Pool<T> {
  items: T[];
  init: T,
  length: number;
}

const createPool = <T>(init: Partial<T> = {}): Pool<T> =>
  ({
    items: [],
    init: init as T,
    length: 0,
  });

const poolAlloc = <T>(pool: Pool<T>): T => {
  if (pool.length >= pool.items.length) {
    pool.items.push(Object.assign(Object.create(Object.getPrototypeOf(pool.init)), pool.init));
  }
  return pool.items[pool.length++];
};

const poolReset = <T>(pool: Pool<T>) => pool.length = 0;

export class RGBA {
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number,
  ) {}

  static red():    RGBA { return new RGBA(1, 0, 0, 1); }
  static green():  RGBA { return new RGBA(0, 1, 0, 1); }
  static blue():   RGBA { return new RGBA(0, 0, 1, 1); }
  static yellow(): RGBA { return new RGBA(1, 1, 0, 1); }
  static purple(): RGBA { return new RGBA(1, 0, 1, 1); }
  static cyan():   RGBA { return new RGBA(0, 1, 1, 1); }

  toString(): string {
    return `rgba(`
      +`${Math.floor(this.r*255)}, `
      +`${Math.floor(this.g*255)}, `
      +`${Math.floor(this.b*255)}, `
      +`${this.a})`;
  }
}

export class Vector2 {
  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {}

  setAngle(angle: number, len: number = 1): this {
    this.x = Math.cos(angle)*len;
    this.y = Math.sin(angle)*len;
    return this;
  }

  clonePool(pool: Pool<Vector2>): Vector2 {
    return poolAlloc(pool).copy(this);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  copy(that: Vector2): this {
    this.x = that.x;
    this.y = that.y;
    return this;
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  setScalar(scalar: number): this {
    this.x = scalar;
    this.y = scalar;
    return this;
  }

  add(that: Vector2): this {
    this.x += that.x;
    this.y += that.y;
    return this;
  }

  sub(that: Vector2): this {
    this.x -= that.x;
    this.y -= that.y;
    return this;
  }

  div(that: Vector2): this {
    this.x /= that.x;
    this.y /= that.y;
    return this;
  }

  mul(that: Vector2): this {
    this.x *= that.x;
    this.y *= that.y;
    return this;
  }

  sqrLength(): number {
    return this.x*this.x + this.y*this.y;
  }

  length(): number {
    return Math.sqrt(this.sqrLength());
  }

  scale(value: number): this {
    this.x *= value;
    this.y *= value;
    return this;
  }

  norm(): this {
    const l = this.length();
    return l === 0 ? this : this.scale(1/l);
  }

  rot90(): this {
    const oldX = this.x;
    this.x = -this.y;
    this.y = oldX;
    return this;
  }

  sqrDistanceTo(that: Vector2): number {
    const dx = that.x - this.x;
    const dy = that.y - this.y;
    return dx*dx + dy*dy;
  }

  distanceTo(that: Vector2): number {
    return Math.sqrt(this.sqrDistanceTo(that));
  }

  lerp(that: Vector2, t: number): this {
    this.x += (that.x - this.x)*t;
    this.y += (that.y - this.y)*t;
    return this;
  }

  dot(that: Vector2): number {
    return this.x*that.x + this.y*that.y;
  }

  map(f: (x: number) => number): this {
    this.x = f(this.x);
    this.y = f(this.y);
    return this;
  }
}

export class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
  ) {}

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  clone2(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  copy(that: Vector3): this {
    this.x = that.x;
    this.y = that.y;
    this.z = that.z;
    return this;
  }

  copy2(that: Vector2, z: number): this {
    this.x = that.x;
    this.y = that.y;
    this.z = z;
    return this;
  }

  setScalar(scalar: number): this {
    this.x = scalar;
    this.y = scalar;
    this.z = scalar;
    return this;
  }

  add(that: Vector3): this {
    this.x += that.x;
    this.y += that.y;
    this.z += that.z;
    return this;
  }

  sub(that: Vector3): this {
    this.x -= that.x;
    this.y -= that.y;
    this.z -= that.z;
    return this;
  }

  div(that: Vector3): this {
    this.x /= that.x;
    this.y /= that.y;
    this.z /= that.z;
    return this;
  }

  mul(that: Vector3): this {
    this.x *= that.x;
    this.y *= that.y;
    this.z *= that.z;
    return this;
  }

  sqrLength(): number {
    return this.x*this.x + this.y*this.y + this.z*this.z;
  }

  length(): number {
    return Math.sqrt(this.sqrLength());
  }

  scale(value: number): this {
    this.x *= value;
    this.y *= value;
    this.z *= value;
    return this;
  }

  norm(): this {
    const l = this.length();
    return l === 0 ? this : this.scale(1/l);
  }

  sqrDistanceTo(that: Vector3): number {
    const dx = that.x - this.x;
    const dy = that.y - this.y;
    const dz = that.z - this.z;
    return dx*dx + dy*dy + dz*dz;
  }

  distanceTo(that: Vector3): number {
    return Math.sqrt(this.sqrDistanceTo(that));
  }

  lerp(that: Vector3, t: number): this {
    this.x += (that.x - this.x)*t;
    this.y += (that.y - this.y)*t;
    this.z += (that.z - this.z)*t;
    return this;
  }

  dot(that: Vector3): number {
    return this.x*that.x + this.y*that.y + this.z*that.z;
  }

  map(f: (x: number) => number): this {
    this.x = f(this.x);
    this.y = f(this.y);
    this.z = f(this.z);
    return this;
  }
}

const v2Pool: Pool<Vector2> = createPool(new Vector2());
const v3Pool: Pool<Vector3> = createPool(new Vector3());

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

const hittingCell = (p1: Vector2, p2: Vector2): Vector2 => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return poolAlloc(v2Pool).set(
    Math.floor(p2.x + Math.sign(dx)*EPS),
    Math.floor(p2.y + Math.sign(dy)*EPS),
  );
};

const rayStep = (p1: Vector2, p2: Vector2): Vector2 => {
  let p3 = p2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (dx !== 0) {
    const k = dy/dx;
    const c = p1.y - k*p1.x;

    {
      const x3 = snap(p2.x, dx);
      const y3 = x3*k + c;
      p3 = poolAlloc(v2Pool).set(x3, y3);
    }

    if (k !== 0) {
      const y3 = snap(p2.y, dy);
      const x3 = (y3 - c)/k;
      const p3t = poolAlloc(v2Pool).set(x3, y3);
      if (p2.sqrDistanceTo(p3t) < p2.sqrDistanceTo(p3)) {
        p3 = p3t;
      }
    }
  } else {
    const y3 = snap(p2.y, dy);
    const x3 = p2.x;
    p3 = poolAlloc(v2Pool).set(x3, y3);
  }

  return p3;
};

type Tile = RGBA | ImageData | null;

const SCENE_FLOOR1 = new RGBA(0.094, 0.094 + 0.05, 0.094 + 0.05, 1.0);
const SCENE_FLOOR2 = new RGBA(0.188, 0.188 + 0.05, 0.188 + 0.05, 1.0);
const SCENE_CEILING1 = new RGBA(0.094 + 0.05, 0.094, 0.094, 1.0);
const SCENE_CEILING2 = new RGBA(0.188 + 0.05, 0.188, 0.188, 1.0);

export interface Scene {
  walls: Tile[];
  width: number;
  height: number;
}

export const createScene = (walls: Array<Array<Tile>>): Scene => {
  const scene: Scene = {
    height: walls.length,
    width: Number.MIN_VALUE,
    walls: [],
  };
  for (const row of walls) {
    scene.width = Math.max(scene.width, row.length);
  }
  for (const row of walls) {
    scene.walls = scene.walls.concat(row);
    for (let i = 0; i < scene.width - row.length; ++i) {
      scene.walls.push(null);
    }
  }
  return scene;
};

const sceneSize = (scene: Scene): Vector2 => {
  return poolAlloc(v2Pool).set(scene.width, scene.height);
};

const sceneContains = (scene: Scene, p: Vector2): boolean =>
  0 <= p.x && p.x < scene.width && 0 <= p.y && p.y < scene.height;

const sceneGetTile = (scene: Scene, p: Vector2): Tile | undefined => {
  if (!sceneContains(scene, p)) return undefined;
  return scene.walls[Math.floor(p.y)*scene.width + Math.floor(p.x)];
}

const sceneGetFloor = (p: Vector2): Tile | undefined => {
  if ((Math.floor(p.x) + Math.floor(p.y))%2 == 0) {
    return SCENE_FLOOR1;
  } else {
    return SCENE_FLOOR2;
  }
};

const sceneGetCeiling = (p: Vector2): Tile | undefined => {
  if ((Math.floor(p.x) + Math.floor(p.y))%2 == 0) {
    return SCENE_CEILING1;
  } else {
    return SCENE_CEILING2;
  }
};

const sceneIsWall = (scene: Scene, p: Vector2): boolean => {
  const c = sceneGetTile(scene, p);
  return c !== null && c !== undefined;
};

const sceneCanRectangleFitHere = (scene: Scene, px: number, py: number, sx: number, sy: number): boolean => {
  const x1 = Math.floor(px - sx*0.5);
  const x2 = Math.floor(px + sx*0.5);
  const y1 = Math.floor(py - sy*0.5);
  const y2 = Math.floor(py + sy*0.5);
  for (let x = x1; x <= x2; ++x) {
    for (let y = y1; y <= y2; ++y) {
      if (sceneIsWall(scene, poolAlloc(v2Pool).set(x, y))) {
        return false;
      }
    }
  }
  return true;
};

const castRay = (scene: Scene, p1: Vector2, p2: Vector2): Vector2 => {
  let start = p1;
  while (start.sqrDistanceTo(p1) < FAR_CLIPPING_PLANE*FAR_CLIPPING_PLANE) {
    const c = hittingCell(p1, p2);
    if (sceneIsWall(scene, c)) break;
    const p3 = rayStep(p1, p2);
    p1 = p2;
    p2 = p3;
  }
  return p2;
};

export interface Player {
  position: Vector2;
  velocity: Vector2;
  direction: number;
  movingForward: boolean;
  movingBackward: boolean;
  turningLeft: boolean;
  turningRight: boolean;
}

export const createPlayer = (position: Vector2, direction: number): Player =>
  ({
    position: position,
    velocity: new Vector2(),
    direction: direction,
    movingForward: false,
    movingBackward: false,
    turningLeft: false,
    turningRight: false,
  });

const playerFovRange = (player: Player): [Vector2, Vector2] => {
  const l = Math.tan(FOV*0.5)*NEAR_CLIPPING_PLANE;
  const p = poolAlloc(v2Pool).setAngle(player.direction, NEAR_CLIPPING_PLANE).add(player.position);
  const wing = p.clonePool(v2Pool).sub(player.position).rot90().norm().scale(l);
  const p1 = p.clonePool(v2Pool).sub(wing);
  const p2 = p.add(wing);
  return [p1, p2];
};

const renderMinimap = (ctx: CanvasRenderingContext2D, player: Player, scene: Scene) => {
  ctx.save();

  const cellSize = ctx.canvas.width*MINIMAP_SCALE;
  const gridSize = sceneSize(scene);

  ctx.translate(ctx.canvas.width*0.03, ctx.canvas.height*0.03);
  ctx.scale(cellSize, cellSize);

  ctx.fillStyle = '#181818';
  ctx.fillRect(0, 0, gridSize.x, gridSize.y);

  ctx.lineWidth = 0.1;
  for (let y = 0; y < gridSize.y; ++y) {
    for (let x = 0; x < gridSize.x; ++x) {
      const cell = sceneGetTile(scene, poolAlloc(v2Pool).set(x, y));
      if (cell instanceof RGBA) {
        ctx.fillStyle = cell.toString();
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  ctx.strokeStyle = '#303030';
  for (let x = 0; x <= gridSize.x; ++x) {
    strokeLine(ctx, poolAlloc(v2Pool).set(x, 0), poolAlloc(v2Pool).set(x, gridSize.y));
  }
  for (let y = 0; y <= gridSize.y; ++y) {
    strokeLine(ctx, poolAlloc(v2Pool).set(0, y), poolAlloc(v2Pool).set(gridSize.x, y));
  }

  ctx.fillStyle = 'magenta';
  ctx.fillRect(
    player.position.x - MINIMAP_PLAYER_SIZE*0.5,
    player.position.y - MINIMAP_PLAYER_SIZE*0.5,
    MINIMAP_PLAYER_SIZE, MINIMAP_PLAYER_SIZE,
  );

  const [p1, p2] = playerFovRange(player);
  ctx.strokeStyle = 'magenta';
  strokeLine(ctx, p1, p2);
  strokeLine(ctx, player.position, p1);
  strokeLine(ctx, player.position, p2);

  if (MINIMAP_SPRITES) {
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'yellow';
    const sp = poolAlloc(v2Pool);
    const dir = poolAlloc(v2Pool).setAngle(player.direction);
    strokeLine(ctx, player.position, player.position.clonePool(v2Pool).add(dir));
    ctx.fillStyle = 'white';
    for (let i = 0; i < spritePool.length; ++i) {
      const sprite = spritePool.items[i];

      ctx.fillRect(
        sprite.position.x - MINIMAP_SPRITE_SIZE*0.5,
        sprite.position.y - MINIMAP_SPRITE_SIZE*0.5,
        MINIMAP_SPRITE_SIZE, MINIMAP_SPRITE_SIZE,
      );

      sp.copy(sprite.position).sub(player.position);
      strokeLine(ctx, player.position, player.position.clonePool(v2Pool).add(sp));
      const spl = sp.length();
      if (spl <= NEAR_CLIPPING_PLANE) continue;
      if (spl >= FAR_CLIPPING_PLANE) continue;
      const dot = sp.dot(dir)/spl;
      if (!(HALF_FOV_COS <= dot)) continue;
      const dist = NEAR_CLIPPING_PLANE/dot;
      sp.norm().scale(dist).add(player.position);

      ctx.fillRect(
        sp.x - MINIMAP_SPRITE_SIZE*0.5,
        sp.y - MINIMAP_SPRITE_SIZE*0.5,
        MINIMAP_SPRITE_SIZE, MINIMAP_SPRITE_SIZE,
      );
    }
  }

  ctx.restore();
};

const dts: number[] = [];
const renderFPS = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
  ctx.font = '48px bold';
  ctx.fillStyle = 'white';

  dts.push(deltaTime);
  if (dts.length > 60) {
    dts.shift();
  }

  const dtAvg = dts.reduce((a, b) => a + b, 0)/dts.length;
  ctx.fillText(`${Math.floor(1/dtAvg)}`, 100, 100);
};

const renderWalls = (display: Display, player: Player, scene: Scene) => {
  const [r1, r2] = playerFovRange(player);
  const d = poolAlloc(v2Pool).setAngle(player.direction);
  for (let x = 0; x < display.backImageData.width; ++x) {
    const p = castRay(scene, player.position, r1.clonePool(v2Pool).lerp(r2, x/display.backImageData.width));
    const c = hittingCell(player.position, p);
    const cell = sceneGetTile(scene, c);
    const v = p.clonePool(v2Pool).sub(player.position);
    display.zBuffer[x] = v.dot(d);
    if (cell instanceof RGBA) {
      const stripHeight = display.backImageData.height/display.zBuffer[x];
      const shadow = 1/display.zBuffer[x]*2;
      for (let dy = 0; dy < Math.ceil(stripHeight); ++dy) {
        const y = Math.floor((display.backImageData.height - stripHeight)*0.5) + dy;
        const destP = (y*display.backImageData.width + x)*4;
        display.backImageData.data[destP + 0] = cell.r*shadow*255;
        display.backImageData.data[destP + 1] = cell.g*shadow*255;
        display.backImageData.data[destP + 2] = cell.b*shadow*255;
      }
    } else if (cell instanceof ImageData) {
      const stripHeight = display.backImageData.height/display.zBuffer[x];

      let u = 0;
      const t = p.clonePool(v2Pool).sub(c);
      if (Math.abs(t.x) < EPS && t.y > 0) {
        u = t.y;
      } else if (Math.abs(t.x - 1) < EPS && t.y > 0) {
        u = 1 - t.y;
      } else if (Math.abs(t.y) < EPS && t.x > 0) {
        u = 1 - t.x;
      } else {
        u = t.x;
      }

      const y1 = Math.floor((display.backImageData.height - stripHeight)*0.5);
      const y2 = Math.floor(y1 + stripHeight);
      const by1 = Math.max(0, y1);
      const by2 = Math.min(display.backImageData.height-1, y2);
      const tx = Math.floor(u*cell.width);
      const sh = (1/Math.ceil(stripHeight))*cell.height;
      const shadow = Math.min(1/display.zBuffer[x]*2, 1);
      for (let y = by1; y <= by2; ++y) {
        const ty = Math.floor((y - y1)*sh);
        const destP = (y*display.backImageData.width + x)*4;
        const srcP = (ty*cell.width + tx)*4;
        display.backImageData.data[destP + 0] = cell.data[srcP + 0]*shadow;
        display.backImageData.data[destP + 1] = cell.data[srcP + 1]*shadow;
        display.backImageData.data[destP + 2] = cell.data[srcP + 2]*shadow;
      }
    }
  }
};

const renderFloorAndCeiling = (imageData: ImageData, player: Player) => {
  const pz = imageData.height/2;
  const [p1, p2] = playerFovRange(player);
  const t = poolAlloc(v2Pool);
  const t1 = poolAlloc(v2Pool);
  const t2 = poolAlloc(v2Pool);
  const bp = t1.copy(p1).sub(player.position).length();
  for (let y = Math.floor(imageData.height/2); y < imageData.height; ++y) {
    const sz = imageData.height - y - 1;

    const ap = pz - sz;
    const b = (bp/ap)*pz/NEAR_CLIPPING_PLANE;
    t1.copy(p1).sub(player.position).norm().scale(b).add(player.position);
    t2.copy(p2).sub(player.position).norm().scale(b).add(player.position);

    for (let x = 0; x < imageData.width; ++x) {
      t.copy(t1).lerp(t2, x/imageData.width);
      const floorTile = sceneGetFloor(t);
      if (floorTile instanceof RGBA) {
        const destP = (y*imageData.width + x)*4;
        const shadow = player.position.distanceTo(t)*255;
        imageData.data[destP + 0] = floorTile.r*shadow;
        imageData.data[destP + 1] = floorTile.g*shadow;
        imageData.data[destP + 2] = floorTile.b*shadow;
      }
      const ceilingTile = sceneGetCeiling(t);
      if (ceilingTile instanceof RGBA) {
        const destP = (sz*imageData.width + x)*4;
        const shadow = player.position.distanceTo(t)*255;
        imageData.data[destP + 0] = ceilingTile.r*shadow;
        imageData.data[destP + 1] = ceilingTile.g*shadow;
        imageData.data[destP + 2] = ceilingTile.b*shadow;
      }
    }
  }
};

interface Display {
  ctx: CanvasRenderingContext2D;
  backCtx: OffscreenCanvasRenderingContext2D;
  backImageData: ImageData;
  zBuffer: number[];
}

const displaySwapBackImageData = (display: Display) => {
  display.backCtx.putImageData(display.backImageData, 0, 0);
  display.ctx.drawImage(display.backCtx.canvas, 0, 0, display.ctx.canvas.width, display.ctx.canvas.height);
};

export interface Sprite {
  imageData: ImageData;
  position: Vector2;
  z: number;
  scale: number;

  pdist: number;
  t: number;
}

const spritePool: Pool<Sprite> = createPool();

const visibleSprites: Sprite[] = [];
const renderSprites = (display: Display, player: Player) => {
  const sp = poolAlloc(v2Pool);
  const dir = poolAlloc(v2Pool).setAngle(player.direction);
  const [p1, p2] = playerFovRange(player);

  visibleSprites.length = 0;
  for (let i = 0; i < spritePool.length; ++i) {
    const sprite = spritePool.items[i];

    sp.copy(sprite.position).sub(player.position);
    const spl = sp.length();
    if (spl <= NEAR_CLIPPING_PLANE) continue;
    if (spl >= FAR_CLIPPING_PLANE) continue;

    const dot = sp.dot(dir)/spl;
    if (!(HALF_FOV_COS <= dot)) continue;
    const dist = NEAR_CLIPPING_PLANE/dot;
    sp.norm().scale(dist).add(player.position);
    sprite.t = p1.distanceTo(sp)/p1.distanceTo(p2);
    sprite.pdist = sprite.position.clonePool(v2Pool).sub(player.position).dot(dir);

    if (sprite.pdist < NEAR_CLIPPING_PLANE) continue;
    if (sprite.pdist >= FAR_CLIPPING_PLANE) continue;

    visibleSprites.push(sprite);
  }

  visibleSprites.sort((a, b) => b.pdist - a.pdist);

  for (const sprite of visibleSprites) {
    const cx = display.backImageData.width*sprite.t;
    const cy = display.backImageData.height*0.5;
    const maxSpriteSize = display.backImageData.height/sprite.pdist;
    const spriteSize = maxSpriteSize*sprite.scale;
    const x1 = Math.floor(cx - spriteSize*0.5);
    const x2 = Math.floor(x1 + spriteSize - 1);
    const bx1 = Math.max(0, x1);
    const bx2 = Math.min(display.backImageData.width - 1, x2);
    const y1 = Math.floor(cy + maxSpriteSize*0.5 - maxSpriteSize*sprite.z);
    const y2 = Math.floor(y1 + spriteSize - 1);
    const by1 = Math.max(0, y1);
    const by2 = Math.min(display.backImageData.height - 1, y2);

    const src = sprite.imageData.data;
    const dest = display.backImageData.data;
    for (let x = bx1; x <= bx2; ++x) {
      if (sprite.pdist < display.zBuffer[x]) {
        for (let y = by1; y <= by2; ++y) {
          const tx = Math.floor((x - x1)/spriteSize*sprite.imageData.width);
          const ty = Math.floor((y - y1)/spriteSize*sprite.imageData.height);
          const srcP = (ty*sprite.imageData.width + tx)*4;
          const destP = (y*display.backImageData.width + x)*4;

          const alpha = src[srcP + 3]/255;
          dest[destP + 0] = dest[destP + 0]*(1 - alpha) + src[srcP + 0]*alpha;
          dest[destP + 1] = dest[destP + 1]*(1 - alpha) + src[srcP + 1]*alpha;
          dest[destP + 2] = dest[destP + 2]*(1 - alpha) + src[srcP + 2]*alpha;
        }
      }
    }
  }
};

const pushSprite = (imageData: ImageData, position: Vector2, z: number, scale: number) => {
  const sprite = poolAlloc(spritePool);
  sprite.imageData = imageData;
  sprite.position = position;
  sprite.z = z;
  sprite.scale = scale;
  sprite.pdist = 0;
  sprite.t = 0;
};

interface Item {
  alive: boolean;
  imageData: ImageData;
  position: Vector2;
}

interface Bomb {
  position: Vector3;
  velocity: Vector3;
  lifetime: number;
}

export const allocateBombs = (capacity: number): Bomb[] => {
  const bombs: Bomb[] = [];
  for (let i = 0; i < capacity; ++i) {
    bombs.push({
      position: new Vector3(),
      velocity: new Vector3(),
      lifetime: 0,
    });
  }
  return bombs;
};

export const throwBomb = (player: Player, bombs: Bomb[]) => {
  for (let bomb of bombs) {
    if (bomb.lifetime <= 0) {
      bomb.lifetime = BOMB_LIFETIME;
      bomb.position.copy2(player.position, 0.6);
      bomb.velocity.x = Math.cos(player.direction);
      bomb.velocity.y = Math.sin(player.direction);
      bomb.velocity.z = 0.5;
      bomb.velocity.scale(BOMB_THROW_VELOCITY);
      break;
    }
  }
};

const updatePlayer = (player: Player, scene: Scene, deltaTime: number) => {
  player.velocity.setScalar(0);
  let angularVelocity = 0.0;
  if (player.movingForward) {
    player.velocity.add(poolAlloc(v2Pool).setAngle(player.direction, PLAYER_SPEED));
  }
  if (player.movingBackward) {
    player.velocity.sub(poolAlloc(v2Pool).setAngle(player.direction, PLAYER_SPEED));
  }
  if (player.turningLeft) {
    angularVelocity -= Math.PI*0.75;
  }
  if (player.turningRight) {
    angularVelocity += Math.PI*0.75;
  }
  player.direction = player.direction + angularVelocity*deltaTime;
  const nx = player.position.x + player.velocity.x*deltaTime;
  if (sceneCanRectangleFitHere(scene, nx, player.position.y, MINIMAP_PLAYER_SIZE, MINIMAP_PLAYER_SIZE)) {
    player.position.x = nx;
  }
  const ny = player.position.y + player.velocity.y*deltaTime;
  if (sceneCanRectangleFitHere(scene, player.position.x, ny, MINIMAP_PLAYER_SIZE, MINIMAP_PLAYER_SIZE)) {
    player.position.y = ny;
  }
};

const updateItems = (time: number, player: Player, items: Item[], assets: Assets) => {
  for (const item of items) {
    if (item.alive) {
      if (player.position.sqrDistanceTo(item.position) < PLAYER_RADIUS*PLAYER_RADIUS) {
        assets.itemPickupSound.currentTime = 0;
        assets.itemPickupSound.play();
        item.alive = false;
      }
    }

    if (item.alive) {
      pushSprite(item.imageData, item.position, 0.25 + ITEM_AMP - ITEM_AMP*Math.sin(ITEM_FREQ*Math.PI*time + item.position.x + item.position.y),  0.25);
    }
  }
};

interface Particle {
  position: Vector3;
  velocity: Vector3;
  lifetime: number;
}

export const allocateParticles = (capacity: number): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < capacity; ++i) {
    particles.push({
      position: new Vector3(),
      velocity: new Vector3(),
      lifetime: 0,
    });
  }
  return particles;
};

const updateParticles = (particles: Particle[], scene: Scene, deltaTime: number, assets: Assets) => {
  for (const particle of particles) {
    if (particle.lifetime > 0) {
      particle.lifetime -= deltaTime;
      particle.velocity.z -= PARTICLE_GRAVITY*deltaTime;

      const nx = particle.position.x + particle.velocity.x*deltaTime;
      const ny = particle.position.y + particle.velocity.y*deltaTime;
      if (sceneIsWall(scene, poolAlloc(v2Pool).set(nx, ny))) {
        const dx = Math.abs(Math.floor(particle.position.x) - Math.floor(nx));
        const dy = Math.abs(Math.floor(particle.position.y) - Math.floor(ny));

        if (dx > 0) particle.velocity.x *= -1;
        if (dy > 0) particle.velocity.y *= -1;
        particle.velocity.scale(PARTICLE_DAMP);
      } else {
        particle.position.x = nx;
        particle.position.y = ny;
      }

      const nz = particle.position.z + particle.velocity.z*deltaTime;
      if (nz < PARTICLE_SCALE || nz > 1.0) {
        particle.velocity.z *= -1;
        particle.velocity.scale(PARTICLE_DAMP);
      } else {
        particle.position.z = nz;
      }

      if (particle.lifetime > 0) {
        pushSprite(assets.particleImageData, poolAlloc(v2Pool).set(particle.position.x, particle.position.y), particle.position.z, PARTICLE_SCALE);
      }
    }
  }
};

export const emitParticle = (source: Vector3, particles: Particle[]) => {
  for (let particle of particles) {
    if (particle.lifetime <= 0) {
      particle.lifetime = PARTICLE_LIFETIME;
      particle.position.copy(source);
      const angle = Math.random()*2*Math.PI;
      particle.velocity.x = Math.cos(angle);
      particle.velocity.y = Math.sin(angle);
      particle.velocity.z = Math.random();
      particle.velocity.scale(PARTICLE_MAX_SPEED*Math.random());
      break;
    }
  }
};

const updateBombs = (bombs: Bomb[], particles: Particle[], scene: Scene, deltaTime: number, assets: Assets) => {
  for (const bomb of bombs) {
    if (bomb.lifetime > 0) {
      bomb.lifetime -= deltaTime;
      bomb.velocity.z -= BOMB_GRAVITY*deltaTime;

      const nx = bomb.position.x + bomb.velocity.x*deltaTime;
      const ny = bomb.position.y + bomb.velocity.y*deltaTime;
      if (sceneIsWall(scene, poolAlloc(v2Pool).set(nx, ny))) {
        const dx = Math.abs(Math.floor(bomb.position.x) - Math.floor(nx));
        const dy = Math.abs(Math.floor(bomb.position.y) - Math.floor(ny));

        if (dx > 0) bomb.velocity.x *= -1;
        if (dy > 0) bomb.velocity.y *= -1;
        bomb.velocity.scale(BOMB_DAMP);
        if (bomb.velocity.length() > 1) {
          assets.bombRicochetSound.currentTime = 0;
          assets.bombRicochetSound.play();
        }
      } else {
        bomb.position.x = nx;
        bomb.position.y = ny;
      }

      const nz = bomb.position.z + bomb.velocity.z*deltaTime;
      if (nz < BOMB_SCALE || nz > 1.0) {
        bomb.velocity.z *= -1;
        bomb.velocity.scale(BOMB_DAMP);
        if (bomb.velocity.length() > 1) {
          assets.bombRicochetSound.currentTime = 0;
          assets.bombRicochetSound.play();
        }
      } else {
        bomb.position.z = nz;
      }

      if (bomb.lifetime <= 0) {
        assets.bombBlastSound.currentTime = 0;
        assets.bombBlastSound.play();
        for (let i = 0; i < BOMB_PARTICLE_COUNT; ++i) {
          emitParticle(bomb.position, particles);
        }
      } else {
        pushSprite(assets.bombImageData, poolAlloc(v2Pool).set(bomb.position.x, bomb.position.y), bomb.position.z, BOMB_SCALE);
      }
    }
  }
};

export interface Assets {
  bombImageData: ImageData;
  particleImageData: ImageData;
  bombRicochetSound: HTMLAudioElement;
  itemPickupSound: HTMLAudioElement;
  bombBlastSound: HTMLAudioElement;
};

export const renderGame = (display: Display, deltaTime: number, time: number, player: Player, scene: Scene, items: Item[], bombs: Bomb[], particles: Particle[], assets: Assets) => {
  poolReset(spritePool);
  poolReset(v2Pool);
  poolReset(v3Pool);

  updatePlayer(player, scene, deltaTime);
  updateItems(time, player, items, assets);
  updateBombs(bombs, particles, scene, deltaTime, assets);
  updateParticles(particles, scene, deltaTime, assets);

  renderFloorAndCeiling(display.backImageData, player);
  renderWalls(display, player, scene);
  renderSprites(display, player);
  displaySwapBackImageData(display);

  if (MINIMAP) renderMinimap(display.ctx, player, scene);
  renderFPS(display.ctx, deltaTime);
};
