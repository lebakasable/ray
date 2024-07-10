import { Vector2, Vector3, RGBA } from './vector.js';

const EPS = 1e-6;
const NEAR_CLIPPING_PLANE = 0.1;
const FAR_CLIPPING_PLANE = 10.0;
const FOV = Math.PI*0.5;
const HALF_FOV_COS = Math.cos(FOV*0.5);
const PLAYER_SPEED = 2;
const PLAYER_RADIUS = 0.5;

const SCENE_FLOOR1 = new RGBA(0.094, 0.094 + 0.05, 0.094 + 0.05, 1.0);
const SCENE_FLOOR2 = new RGBA(0.188, 0.188 + 0.05, 0.188 + 0.05, 1.0);
const SCENE_CEILING1 = new RGBA(0.094 + 0.05, 0.094, 0.094, 1.0);
const SCENE_CEILING2 = new RGBA(0.188 + 0.05, 0.188, 0.188, 1.0);

const ITEM_FREQ = 0.7;
const ITEM_AMP = 0.07;

const BOMB_LIFETIME = 2;
const BOMB_THROW_VELOCITY = 5;
const BOMB_GRAVITY = 10;
const BOMB_DAMP = 0.8;
const BOMB_SCALE = 0.25;
const BOMB_PARTICLE_COUNT = 50;

const PARTICLE_LIFETIME = 1.0;
const PARTICLE_GRAVITY = 10;
const PARTICLE_DAMP = 0.8;
const PARTICLE_SCALE = 0.1;
const PARTICLE_MAX_SPEED = 8;
const PARTICLE_COLOR = new RGBA(1, 0.5, 0.15, 1);

const MINIMAP = true;
const MINIMAP_SPRITES = true;
const MINIMAP_PLAYER_SIZE = 0.5;
const MINIMAP_SPRITE_SIZE = 0.2;
const MINIMAP_SCALE = 0.03;

interface SpritePool {
  items: Sprite[];
  length: number;
}

const createSpritePool = (): SpritePool =>
  ({
    items: [],
    length: 0,
  });

const spritePoolReset = (spritePool: SpritePool) => spritePool.length = 0;

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
  return new Vector2(
    Math.floor(p2.x + Math.sign(dx)*EPS),
    Math.floor(p2.y + Math.sign(dy)*EPS),
  );
};

const rayStep = (p1: Vector2, p2: Vector2): Vector2 => {
  let p3 = p2.clone();
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (dx !== 0) {
    const k = dy/dx;
    const c = p1.y - k*p1.x;

    {
      const x3 = snap(p2.x, dx);
      const y3 = x3*k + c;
      p3.set(x3, y3);
    }

    if (k !== 0) {
      const y3 = snap(p2.y, dy);
      const x3 = (y3 - c)/k;
      const p3t = new Vector2(x3, y3);
      if (p2.sqrDistanceTo(p3t) < p2.sqrDistanceTo(p3)) {
        p3.copy(p3t);
      }
    }
  } else {
    const y3 = snap(p2.y, dy);
    const x3 = p2.x;
    p3.set(x3, y3);
  }

  return p3;
};

type Tile = RGBA | ImageData | null;

interface Scene {
  walls: Tile[];
  width: number;
  height: number;
}

const createScene = (walls: Array<Array<Tile>>): Scene => {
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
      if (sceneIsWall(scene, new Vector2(x, y))) {
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

interface Player {
  position: Vector2;
  fovLeft: Vector2;
  fovRight: Vector2;
  controlVelocity: Vector2;
  direction: number;
  movingForward: boolean;
  movingBackward: boolean;
  turningLeft: boolean;
  turningRight: boolean;
}

const createPlayer = (position: Vector2, direction: number): Player =>
  ({
    position: position,
    controlVelocity: new Vector2(),
    fovLeft: new Vector2(),
    fovRight: new Vector2(),
    direction: direction,
    movingForward: false,
    movingBackward: false,
    turningLeft: false,
    turningRight: false,
  });

const renderMinimap = (ctx: CanvasRenderingContext2D, player: Player, scene: Scene, spritePool: SpritePool, visibleSprites: Sprite[]) => {
  ctx.save();

  const p1 = new Vector2();
  const p2 = new Vector2();

  const cellSize = ctx.canvas.width*MINIMAP_SCALE;

  ctx.translate(ctx.canvas.width*0.03, ctx.canvas.height*0.03);
  ctx.scale(cellSize, cellSize);

  ctx.fillStyle = '#181818';
  ctx.fillRect(0, 0, scene.width, scene.height);

  ctx.lineWidth = 0.1;
  for (let y = 0; y < scene.height; ++y) {
    for (let x = 0; x < scene.width; ++x) {
      const cell = sceneGetTile(scene, p1.set(x, y));
      if (cell instanceof RGBA) {
        ctx.fillStyle = cell.toString();
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  ctx.strokeStyle = '#303030';
  for (let x = 0; x <= scene.width; ++x) {
    strokeLine(ctx, p1.set(x, 0), p2.set(x, scene.height));
  }
  for (let y = 0; y <= scene.height; ++y) {
    strokeLine(ctx, p1.set(0, y), p2.set(scene.width, y));
  }

  ctx.fillStyle = 'magenta';
  ctx.fillRect(
    player.position.x - MINIMAP_PLAYER_SIZE*0.5,
    player.position.y - MINIMAP_PLAYER_SIZE*0.5,
    MINIMAP_PLAYER_SIZE, MINIMAP_PLAYER_SIZE,
  );

  ctx.strokeStyle = 'magenta';
  strokeLine(ctx, player.fovLeft, player.fovRight);
  strokeLine(ctx, player.position, player.fovLeft);
  strokeLine(ctx, player.position, player.fovRight);

  if (MINIMAP_SPRITES) {
    ctx.strokeStyle = 'yellow';
    ctx.fillStyle = 'white';
    for (let i = 0; i < spritePool.length; ++i) {
      const sprite = spritePool.items[i];
      ctx.fillRect(
        sprite.position.x - MINIMAP_SPRITE_SIZE*0.5,
        sprite.position.y - MINIMAP_SPRITE_SIZE*0.5,
        MINIMAP_SPRITE_SIZE, MINIMAP_SPRITE_SIZE,
      );
    }

    const sp = new Vector2();
    for (let sprite of visibleSprites) {
      strokeLine(ctx, player.position, sprite.position);
      sp.copy(sprite.position).sub(player.position).norm().scale(sprite.dist).add(player.position);
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
  const d = new Vector2().setPolar(player.direction);
  for (let x = 0; x < display.backImageData.width; ++x) {
    const p = castRay(scene, player.position, player.fovLeft.clone().lerp(player.fovRight, x/display.backImageData.width));
    const c = hittingCell(player.position, p);
    const cell = sceneGetTile(scene, c);
    const v = p.clone().sub(player.position);
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
      const t = p.clone().sub(c);
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
  const t = new Vector2();
  const t1 = new Vector2();
  const t2 = new Vector2();
  const bp = t1.copy(player.fovLeft).sub(player.position).length();
  for (let y = Math.floor(imageData.height/2); y < imageData.height; ++y) {
    const sz = imageData.height - y - 1;

    const ap = pz - sz;
    const b = (bp/ap)*pz/NEAR_CLIPPING_PLANE;
    t1.copy(player.fovLeft).sub(player.position).norm().scale(b).add(player.position);
    t2.copy(player.fovRight).sub(player.position).norm().scale(b).add(player.position);

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

export const createDisplay = (ctx: CanvasRenderingContext2D, width: number, height: number): Display => {
  const backImageData = new ImageData(width, height);
  backImageData.data.fill(255);
  const backCanvas = new OffscreenCanvas(width, height);
  const backCtx = backCanvas.getContext('2d')!;
  backCtx.imageSmoothingEnabled = false;
  return {
    ctx,
    backCtx,
    backImageData,
    zBuffer: Array(width).fill(0),
  };
};

const displaySwapBackImageData = (display: Display) => {
  display.backCtx.putImageData(display.backImageData, 0, 0);
  display.ctx.drawImage(display.backCtx.canvas, 0, 0, display.ctx.canvas.width, display.ctx.canvas.height);
};

interface Sprite {
  image: ImageData | RGBA;
  position: Vector2;
  z: number;
  scale: number;

  dist: number;
  pdist: number;
  t: number;
}

const cullSprites = (player: Player, spritePool: SpritePool, visibleSprites: Sprite[]) => {
  const sp = new Vector2();
  const dir = new Vector2().setPolar(player.direction);

  visibleSprites.length = 0;
  for (let i = 0; i < spritePool.length; ++i) {
    const sprite = spritePool.items[i];

    sp.copy(sprite.position).sub(player.position);
    const spl = sp.length();
    if (spl <= NEAR_CLIPPING_PLANE) continue;
    if (spl >= FAR_CLIPPING_PLANE) continue;

    const dot = sp.dot(dir)/spl;
    if (!(HALF_FOV_COS <= dot)) continue;
    sprite.dist = NEAR_CLIPPING_PLANE/dot;
    sp.norm().scale(sprite.dist).add(player.position);
    sprite.t = player.fovLeft.distanceTo(sp)/player.fovLeft.distanceTo(player.fovRight);
    sprite.pdist = sprite.position.clone().sub(player.position).dot(dir);

    if (sprite.pdist < NEAR_CLIPPING_PLANE) continue;
    if (sprite.pdist >= FAR_CLIPPING_PLANE) continue;

    visibleSprites.push(sprite);
  }

  visibleSprites.sort((a, b) => b.pdist - a.pdist);
}

const renderSprites = (display: Display, sprites: Sprite[]) => {
  for (const sprite of sprites) {
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

    if (sprite.image instanceof ImageData) {
      const src = sprite.image.data;
      const dest = display.backImageData.data;
      for (let x = bx1; x <= bx2; ++x) {
        if (sprite.pdist < display.zBuffer[x]) {
          for (let y = by1; y <= by2; ++y) {
            const tx = Math.floor((x - x1)/spriteSize*sprite.image.width);
            const ty = Math.floor((y - y1)/spriteSize*sprite.image.height);
            const srcP = (ty*sprite.image.width + tx)*4;
            const destP = (y*display.backImageData.width + x)*4;

            const alpha = src[srcP + 3]/255;
            dest[destP + 0] = dest[destP + 0]*(1 - alpha) + src[srcP + 0]*alpha;
            dest[destP + 1] = dest[destP + 1]*(1 - alpha) + src[srcP + 1]*alpha;
            dest[destP + 2] = dest[destP + 2]*(1 - alpha) + src[srcP + 2]*alpha;
          }
        }
      }
    } else if (sprite.image instanceof RGBA) {
      const dest = display.backImageData.data;
      for (let x = bx1; x <= bx2; ++x) {
        if (sprite.pdist < display.zBuffer[x]) {
          for (let y = by1; y <= by2; ++y) {
            const destP = (y*display.backImageData.width + x)*4;
            const alpha = sprite.image.a;
            dest[destP + 0] = dest[destP + 0]*(1 - alpha) + sprite.image.r*255*alpha;
            dest[destP + 1] = dest[destP + 1]*(1 - alpha) + sprite.image.g*255*alpha;
            dest[destP + 2] = dest[destP + 2]*(1 - alpha) + sprite.image.b*255*alpha;
          }
        }
      }
    }
  }
};

const pushSprite = (spritePool: SpritePool, image: ImageData | RGBA, position: Vector2, z: number, scale: number) => {
  if (spritePool.length >= spritePool.items.length) {
    spritePool.items.push({
      image,
      position: position.clone(),
      z,
      scale,
      dist: 0,
      pdist: 0,
      t: 0,
    });
  } else {
    spritePool.items[spritePool.length].image = image;
    spritePool.items[spritePool.length].position.copy(position);
    spritePool.items[spritePool.length].z = z;
    spritePool.items[spritePool.length].scale = scale;
    spritePool.items[spritePool.length].dist = 0;
    spritePool.items[spritePool.length].pdist = 0;
    spritePool.items[spritePool.length].t = 0;
  }
  spritePool.length += 1;
};

type ItemKind = 'key' | 'bomb';

interface Item {
  kind: ItemKind;
  alive: boolean;
  position: Vector2;
}

interface Bomb {
  position: Vector3;
  velocity: Vector3;
  lifetime: number;
}

const allocateBombs = (capacity: number): Bomb[] => {
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
  player.controlVelocity.setScalar(0);
  let angularVelocity = 0.0;
  if (player.movingForward) {
    player.controlVelocity.add(new Vector2().setPolar(player.direction, PLAYER_SPEED));
  }
  if (player.movingBackward) {
    player.controlVelocity.sub(new Vector2().setPolar(player.direction, PLAYER_SPEED));
  }
  if (player.turningLeft) {
    angularVelocity -= Math.PI*0.75;
  }
  if (player.turningRight) {
    angularVelocity += Math.PI*0.75;
  }
  player.direction = player.direction + angularVelocity*deltaTime;
  const nx = player.position.x + player.controlVelocity.x*deltaTime;
  if (sceneCanRectangleFitHere(scene, nx, player.position.y, MINIMAP_PLAYER_SIZE, MINIMAP_PLAYER_SIZE)) {
    player.position.x = nx;
  }
  const ny = player.position.y + player.controlVelocity.y*deltaTime;
  if (sceneCanRectangleFitHere(scene, player.position.x, ny, MINIMAP_PLAYER_SIZE, MINIMAP_PLAYER_SIZE)) {
    player.position.y = ny;
  }

  const halfFov = FOV*0.5;
  const fovLen = NEAR_CLIPPING_PLANE/Math.cos(halfFov);
  player.fovLeft.setPolar(player.direction - halfFov, fovLen).add(player.position);
  player.fovRight.setPolar(player.direction + halfFov, fovLen).add(player.position);
};

const spriteOfItemKind = (itemKind: ItemKind, assets: Assets): ImageData => {
  switch (itemKind) {
    case 'key': return assets.keyImageData;
    case 'bomb': return assets.bombImageData;
  }
};

const updateItems = (spritePool: SpritePool, time: number, player: Player, items: Item[], assets: Assets) => {
  for (const item of items) {
    if (item.alive) {
      if (player.position.sqrDistanceTo(item.position) < PLAYER_RADIUS*PLAYER_RADIUS) {
        playSound(assets.itemPickupSound, player.position, item.position);
        item.alive = false;
      }
    }

    if (item.alive) {
      pushSprite(spritePool, spriteOfItemKind(item.kind, assets), item.position, 0.25 + ITEM_AMP - ITEM_AMP*Math.sin(ITEM_FREQ*Math.PI*time + item.position.x + item.position.y),  0.25);
    }
  }
};

interface Particle {
  position: Vector3;
  velocity: Vector3;
  lifetime: number;
}

const allocateParticles = (capacity: number): Particle[] => {
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

const updateParticles = (spritePool: SpritePool, deltaTime: number, scene: Scene, particles: Particle[]) => {
  for (const particle of particles) {
    if (particle.lifetime > 0) {
      particle.lifetime -= deltaTime;
      particle.velocity.z -= PARTICLE_GRAVITY*deltaTime;

      const nx = particle.position.x + particle.velocity.x*deltaTime;
      const ny = particle.position.y + particle.velocity.y*deltaTime;
      if (sceneIsWall(scene, new Vector2(nx, ny))) {
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
        pushSprite(spritePool, PARTICLE_COLOR, new Vector2(particle.position.x, particle.position.y), particle.position.z, PARTICLE_SCALE);
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
      particle.velocity.z = Math.random()*0.5 + 0.5;
      particle.velocity.scale(PARTICLE_MAX_SPEED*Math.random());
      break;
    }
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const playSound = (sound: HTMLAudioElement, playerPosition: Vector2, objectPosition: Vector2) => {
  const maxVolume = 1;
  const distanceToPlayer = objectPosition.distanceTo(playerPosition);
  sound.volume = clamp(maxVolume/distanceToPlayer, 0.0, 1.0);
  sound.currentTime = 0;
  sound.play();
};

const updateBombs = (spritePool: SpritePool, player: Player, bombs: Bomb[], particles: Particle[], scene: Scene, deltaTime: number, assets: Assets) => {
  for (const bomb of bombs) {
    if (bomb.lifetime > 0) {
      bomb.lifetime -= deltaTime;
      bomb.velocity.z -= BOMB_GRAVITY*deltaTime;

      const nx = bomb.position.x + bomb.velocity.x*deltaTime;
      const ny = bomb.position.y + bomb.velocity.y*deltaTime;
      if (sceneIsWall(scene, new Vector2(nx, ny))) {
        const dx = Math.abs(Math.floor(bomb.position.x) - Math.floor(nx));
        const dy = Math.abs(Math.floor(bomb.position.y) - Math.floor(ny));

        if (dx > 0) bomb.velocity.x *= -1;
        if (dy > 0) bomb.velocity.y *= -1;
        bomb.velocity.scale(BOMB_DAMP);
        if (bomb.velocity.length() > 1) {
          playSound(assets.bombRicochetSound, player.position, bomb.position.clone2());
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
          playSound(assets.bombRicochetSound, player.position, bomb.position.clone2());
        }
      } else {
        bomb.position.z = nz;
      }

      if (bomb.lifetime <= 0) {
        playSound(assets.bombBlastSound, player.position, bomb.position.clone2());
        for (let i = 0; i < BOMB_PARTICLE_COUNT; ++i) {
          emitParticle(bomb.position, particles);
        }
      } else {
        pushSprite(spritePool, assets.bombImageData, new Vector2(bomb.position.x, bomb.position.y), bomb.position.z, BOMB_SCALE);
      }
    }
  }
};

interface Assets {
  keyImageData: ImageData;
  bombImageData: ImageData;
  bombRicochetSound: HTMLAudioElement;
  itemPickupSound: HTMLAudioElement;
  bombBlastSound: HTMLAudioElement;
}

interface Game {
  player: Player,
  scene: Scene,
  items: Item[],
  bombs: Bomb[],
  visibleSprites: Sprite[],
  spritePool: SpritePool,
  particles: Particle[],
  assets: Assets,
}

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

export const createGame = async (): Promise<Game> => {
  const [wall, keyImageData, bombImageData] = await Promise.all([
    loadImageData('assets/images/wall.png'),
    loadImageData('assets/images/key.png'),
    loadImageData('assets/images/bomb.png'),
  ]);
  const itemPickupSound = new Audio('assets/sounds/pickup.ogg');
  const bombRicochetSound = new Audio('assets/sounds/ricochet.wav');
  const bombBlastSound = new Audio('assets/sounds/blast.ogg');
  const assets = {
    keyImageData,
    bombImageData,
    bombRicochetSound,
    itemPickupSound,
    bombBlastSound,
  };

  const scene = createScene([
    [null, null, wall, wall, wall, null, null],
    [null, null, null, null, null, wall, null],
    [wall, null, null, null, null, wall, null],
    [wall, null, null, null, null, wall, null],
    [wall, null, null, null, null, null, null],
    [null, wall, wall, wall, null, null, null],
    [null, null, null, null, null, null, null],
  ]);

  const player = createPlayer(
    new Vector2(scene.width, scene.height).scale(1.2),
    Math.PI*1.25,
  );

  const items: Item[] = [
    {
      kind: 'bomb',
      alive: true,
      position: new Vector2(1.5, 2.5),
    },
    {
      kind: 'key',
      alive: true,
      position: new Vector2(2.5, 1.5),
    },
    {
      kind: 'key',
      alive: true,
      position: new Vector2(3, 1.5),
    },
    {
      kind: 'key',
      alive: true,
      position: new Vector2(3.5, 1.5),
    },
    {
      kind: 'key',
      alive: true,
      position: new Vector2(4, 1.5),
    },
    {
      kind: 'key',
      alive: true,
      position: new Vector2(4.5, 1.5),
    },
  ];

  const bombs = allocateBombs(10);
  const particles = allocateParticles(1000);
  const visibleSprites: Sprite[] = [];
  const spritePool = createSpritePool();

  return { player, scene, items, bombs, particles, assets, spritePool, visibleSprites };
};

export const renderGame = (display: Display, deltaTime: number, time: number, game: Game) => {
  spritePoolReset(game.spritePool);

  updatePlayer(game.player, game.scene, deltaTime);
  updateItems(game.spritePool, time, game.player, game.items, game.assets);
  updateBombs(game.spritePool, game.player, game.bombs, game.particles, game.scene, deltaTime, game.assets);
  updateParticles(game.spritePool, deltaTime, game.scene, game.particles);

  renderFloorAndCeiling(display.backImageData, game.player);
  renderWalls(display, game.player, game.scene);
  cullSprites(game.player, game.spritePool, game.visibleSprites);
  renderSprites(display, game.visibleSprites);
  displaySwapBackImageData(display);

  if (MINIMAP) renderMinimap(display.ctx, game.player, game.scene, game.spritePool, game.visibleSprites);
  renderFPS(display.ctx, deltaTime);
};
