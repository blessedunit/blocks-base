import {
  ACCEL_AIR,
  ACCEL_GROUND,
  APEX_GRAVITY,
  APEX_VY_THRESHOLD,
  AXE_HIT_VALUE,
  BOWSER_FIRE_INTERVAL,
  BOWSER_FIRE_W,
  BOWSER_FIRE_H,
  BOWSER_FIRE_SPEED,
  BOWSER_H,
  BOWSER_HOP_INTERVAL,
  BOWSER_HOP_VY,
  BOWSER_HP,
  BOWSER_KILL_VALUE,
  ENEMY_KILL_VALUE,
  BOWSER_SPEED,
  BOWSER_W,
  BRICK_BREAK_VALUE,
  COIN_VALUE,
  COYOTE_FRAMES,
  EXTRA_LIFE_AT_COINS,
  FIREBALL_BOUNCE,
  FIREBALL_H,
  FIREBALL_LIFE,
  FIREBALL_MAX,
  FIREBALL_SPEED,
  FIREBALL_W,
  FIREBAR_ANG_SPEED,
  FIREBAR_LENGTH,
  FIREBAR_SEG_RADIUS,
  FRICTION_AIR,
  FRICTION_GROUND,
  GAME_COMPLETE_VALUE,
  GOOMBA_H,
  GOOMBA_SPEED,
  GOOMBA_W,
  GRAVITY,
  HURT_INVULN_FRAMES,
  ITEM_RISE_FRAMES,
  STAR_INVULN_FRAMES,
  JUMP_BUFFER_FRAMES,
  JUMP_HOLD_GRAVITY,
  JUMP_RUN_BONUS,
  JUMP_VEL,
  KOOPA_H,
  KOOPA_SPEED,
  KOOPA_W,
  LEVEL_FINISH_VALUE,
  NO_DAMAGE_BONUS,
  MAX_FALL_SPEED,
  MAX_WALK_SPEED,
  MUSHROOM_H,
  MUSHROOM_SPEED,
  MUSHROOM_W,
  PARATROOPA_BOUNCE_VY,
  PIRANHA_CYCLE_TIME,
  PIRANHA_H,
  PIRANHA_HOLD_TIME,
  PIRANHA_PLAYER_NEAR_TILES,
  PIRANHA_RISE_TIME,
  PIRANHA_W,
  PLAYER_SMALL_H,
  PLAYER_SMALL_W,
  PLAYER_SUPER_H,
  PLAYER_SUPER_W,
  SHELL_H,
  SHELL_SLIDE_SPEED,
  SHELL_W,
  START_LIVES,
  STOMP_BOUNCE,
  STOMP_BOUNCE_HOLD,
  TILE,
  VIEW_H,
  VIEW_W,
} from './constants';
import {
  isBumpable,
  isHazard,
  isInstantDeath,
  isSolid,
  parseLevel,
  setTile,
  tileAt,
  LEVELS,
  type ParsedLevel,
  type ItemKind,
} from './world';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PlayerSize = 'small' | 'super' | 'fire';

export interface Goomba {
  id: number;
  x: number; y: number; vx: number; vy: number;
  dir: -1 | 1;
  alive: boolean;
  squashedAt: number;
}

export type KoopaState = 'walking' | 'shell_idle' | 'shell_slide';

export interface Koopa {
  id: number;
  x: number; y: number; vx: number; vy: number;
  dir: -1 | 1;
  state: KoopaState;
  stateT: number;
  alive: boolean;
}

export interface Paratroopa {
  id: number;
  x: number; y: number; vx: number; vy: number;
  dir: -1 | 1;
  baseY: number;
  alive: boolean;
}

export type PiranhaState = 'hidden' | 'rising' | 'extended' | 'descending';

export interface Piranha {
  id: number;
  x: number; y: number;     // anchor (top of pipe; plant rises into this row)
  state: PiranhaState;
  stateT: number;
  visibleY: number;          // current top-of-plant Y position
  alive: boolean;
}

export interface FireBar {
  id: number;
  cx: number; cy: number;
  angle: number;
}

export interface Bowser {
  x: number; y: number; vx: number; vy: number;
  dir: -1 | 1;
  hp: number;
  hopT: number;
  fireT: number;
  hurtT: number;
  alive: boolean;
}

export interface Fireball {
  id: number;
  x: number; y: number; vx: number; vy: number;
  life: number;
}

export interface BowserFire {
  id: number;
  x: number; y: number; vx: number;
}

export interface ItemEntity {
  id: number;
  kind: ItemKind;
  x: number; y: number;
  vx: number; vy: number;
  riseT: number;            // 0..ITEM_RISE_FRAMES while emerging from block
  taken: boolean;
}

export interface BlockBump {
  tx: number; ty: number;
  frame: number;             // 0..10 animation
}

export interface BrickDebris {
  id: number;
  x: number; y: number; vx: number; vy: number;
  life: number; rot: number;
}

export interface CoinPop {
  id: number;
  x: number; y: number; vy: number; life: number;
  // If set, render this text instead of the coin icon (used for "+1000" item popups).
  text?: string;
  color?: string;
}

// Transient on-screen toast notifying which pickup was just collected,
// e.g. "MUSHROOM × 2" — lingers ~2s then fades.
export interface PickupToast {
  text: string;
  framesLeft: number;   // counts down at 60Hz, ~120 = 2s
}

export interface FreeCoin {
  id: number;
  x: number; y: number;
  taken: boolean;
}

export interface Particle {
  id: number;
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

export type GameStatus =
  | 'ready'
  | 'playing'
  | 'dying'
  | 'levelClear'
  | 'gameComplete'
  | 'gameOver'
  | 'bridgeDrop'
  | 'rescue';

export type SfxEvent =
  | 'jump'
  | 'stomp'
  | 'coin'
  | 'die'
  | 'win'
  | 'thud'
  | 'powerup'
  | 'powerdown'
  | 'fireball'
  | 'bowserHit'
  | 'bowserFire'
  | 'bump'
  | 'brickBreak'
  | 'shellKick'
  | 'gameComplete';

export interface GameState {
  status: GameStatus;
  levelIndex: number;
  level: ParsedLevel;

  // Player
  px: number; py: number;
  pvx: number; pvy: number;
  pFacing: -1 | 1;
  pOnGround: boolean;
  pSize: PlayerSize;
  pCoyote: number;
  pJumpBuffer: number;
  pJumpHeld: boolean;
  pInputL: boolean; pInputR: boolean;
  pRunHeld: boolean;
  pFirePressed: boolean;
  pCrouchHeld: boolean;
  pAnimT: number;
  pHurtT: number;        // i-frames after taking damage
  pStarT: number;        // remaining frames of Star invincibility
  pTransformT: number;   // transformation flash
  pStompGrace: number;   // brief grace after a stomp, prevents same-frame damage from adjacent enemies
  pCrouching: boolean;   // currently crouched (super/fire only — uses small hitbox)
  pFireCooldown: number;

  // Entities
  goombas: Goomba[];
  koopas: Koopa[];
  paratroopas: Paratroopa[];
  piranhas: Piranha[];
  firebars: FireBar[];
  bowser: Bowser | null;
  fireballs: Fireball[];
  bowserFires: BowserFire[];
  items: ItemEntity[];
  blockBumps: BlockBump[];
  brickDebris: BrickDebris[];
  coinPops: CoinPop[];
  freeCoins: FreeCoin[];
  particles: Particle[];
  nextId: number;

  // Bridge drop
  bridgeDropT: number;
  bridgeDropTiles: Array<{ tx: number; ty: number; removedAt: number }>;
  // After the axe is struck, the player gets a short free-walk window before
  // the bridge collapses (so the end doesn't yank the ground instantly).
  axeWalkT: number;
  bridgeArmed: boolean;
  // Rescue cutscene (final castle only): the Queen appears + hearts float.
  rescueT: number;
  queenX: number;
  queenY: number;
  // Castle clue text (non-final castle) surfaced to the level-clear screen.
  hintText: string | null;

  // HUD
  lives: number;
  coins: number;
  score: number;
  // Per-level pickup counters — drive the pickupToast "TYPE × N" text.
  pickedMushroom: number;
  pickedFireFlower: number;
  pickedStar: number;
  // Current toast (null when nothing recent).
  pickupToast: PickupToast | null;
  // Combo chain — number of enemies killed in one airborne sequence (resets
  // when player lands). Multiplies the base +100 reward: 2nd = +200, 3rd = +400...
  comboChain: number;
  // Flips to true the first time the player takes damage in the current level.
  // Used to award a no-damage bonus on level clear.
  damagedThisLevel: boolean;

  // Camera
  camX: number; camY: number;

  // Time
  runTimeMs: number;
  startedAt: number;
  finishedAt: number | null;
  diedAt: number | null;

  // Snapshot for respawn
  livesAtLevelStart: number;
  scoreAtLevelStart: number;
  coinsAtLevelStart: number;
  sizeAtLevelStart: PlayerSize;

  sfxEvents: SfxEvent[];
}

// ─────────────────────────────────────────────────────────────────────────────
// State construction
// ─────────────────────────────────────────────────────────────────────────────

export function createState(now: number, opts?: { size?: PlayerSize; score?: number; lives?: number; coins?: number; runTimeMs?: number }): GameState {
  return loadLevel({
    idx: 0,
    score: opts?.score ?? 0,
    lives: opts?.lives ?? START_LIVES,
    coins: opts?.coins ?? 0,
    size: opts?.size ?? 'small',
    runTimeMs: opts?.runTimeMs ?? 0,
    now,
  });
}

interface LoadOpts {
  idx: number;
  score: number;
  lives: number;
  coins: number;
  size: PlayerSize;
  runTimeMs: number;
  now: number;
}

let _eid = 100000;

function loadLevel(opts: LoadOpts): GameState {
  const data = LEVELS[opts.idx];
  const level = parseLevel(data);

  const pw = opts.size === 'small' ? PLAYER_SMALL_W : PLAYER_SUPER_W;
  const ph = opts.size === 'small' ? PLAYER_SMALL_H : PLAYER_SUPER_H;

  const spawnX = level.spawnPoint.x - pw / 2 + 4;
  const spawnY = level.spawnPoint.y + (PLAYER_SUPER_H - ph);

  const goombas: Goomba[] = level.goombaSpawns.map((s) => ({
    id: ++_eid,
    x: s.x + (TILE - GOOMBA_W) / 2,
    y: s.y + TILE - GOOMBA_H,
    vx: -GOOMBA_SPEED, vy: 0,
    dir: -1,
    alive: true,
    squashedAt: 0,
  }));
  const koopas: Koopa[] = level.koopaSpawns.map((s) => ({
    id: ++_eid,
    x: s.x + (TILE - KOOPA_W) / 2,
    y: s.y + TILE - KOOPA_H,
    vx: -KOOPA_SPEED, vy: 0,
    dir: -1,
    state: 'walking',
    stateT: 0,
    alive: true,
  }));
  const paratroopas: Paratroopa[] = level.paratroopaSpawns.map((s) => ({
    id: ++_eid,
    x: s.x + (TILE - KOOPA_W) / 2,
    y: s.y,
    vx: 0, vy: 0,
    dir: -1,
    baseY: s.y,
    alive: true,
  }));
  const piranhas: Piranha[] = level.piranhaSpawns.map((s) => ({
    id: ++_eid,
    x: s.x,
    y: s.y,
    state: 'hidden',
    stateT: 0,
    visibleY: s.y + TILE,        // start hidden inside the pipe (below anchor row)
    alive: true,
  }));
  const firebars: FireBar[] = level.firebarSpawns.map((s, i) => ({
    id: ++_eid,
    cx: s.x, cy: s.y,
    angle: i * 0.7,
  }));
  // Final-level boss is harder: doubled HP + faster fire/hops.
  const isFinalLevel = opts.idx === LEVELS.length - 1;
  const bowser: Bowser | null = level.bowserSpawn
    ? {
        x: level.bowserSpawn.x + (TILE - BOWSER_W) / 2,
        y: level.bowserSpawn.y + TILE - BOWSER_H,
        vx: -BOWSER_SPEED * (isFinalLevel ? 1.4 : 1), vy: 0,
        dir: -1,
        hp: isFinalLevel ? BOWSER_HP * 2 : BOWSER_HP,
        hopT: isFinalLevel ? 40 : 60,
        fireT: isFinalLevel ? 50 : 80,
        hurtT: 0,
        alive: true,
      }
    : null;

  const freeCoins: FreeCoin[] = level.freeCoins.map((c) => ({
    id: c.id,
    x: c.x,
    y: c.y,
    taken: false,
  }));

  return {
    status: 'ready',
    levelIndex: opts.idx,
    level,

    px: spawnX,
    py: spawnY,
    pvx: 0, pvy: 0,
    pFacing: 1,
    pOnGround: false,
    pSize: opts.size,
    pCoyote: 0, pJumpBuffer: 0, pJumpHeld: false,
    pInputL: false, pInputR: false,
    pRunHeld: false, pFirePressed: false, pCrouchHeld: false,
    pAnimT: 0,
    pHurtT: 0,
    pStarT: 0,
    pTransformT: 0,
    pStompGrace: 0,
    pCrouching: false,
    pFireCooldown: 0,

    goombas, koopas, paratroopas, piranhas, firebars, bowser,
    fireballs: [], bowserFires: [], items: [],
    blockBumps: [], brickDebris: [], coinPops: [],
    freeCoins, particles: [],
    nextId: 200000,

    bridgeDropT: 0,
    bridgeDropTiles: [],
    axeWalkT: 0,
    bridgeArmed: false,
    rescueT: 0,
    queenX: 0,
    queenY: 0,
    hintText: null,

    lives: opts.lives,
    coins: opts.coins,
    score: opts.score,
    pickedMushroom: 0,
    pickedFireFlower: 0,
    pickedStar: 0,
    pickupToast: null,
    comboChain: 0,
    damagedThisLevel: false,

    camX: 0, camY: 0,

    runTimeMs: opts.runTimeMs,
    startedAt: opts.now,
    finishedAt: null,
    diedAt: null,

    livesAtLevelStart: opts.lives,
    scoreAtLevelStart: opts.score,
    coinsAtLevelStart: opts.coins,
    sizeAtLevelStart: opts.size,

    sfxEvents: [],
  };
}

export function advanceLevel(s: GameState, now: number): GameState {
  const next = s.levelIndex + 1;
  if (next >= LEVELS.length) {
    return { ...s, status: 'gameComplete', finishedAt: now };
  }
  return loadLevel({
    idx: next,
    score: s.score,
    lives: s.lives,
    coins: s.coins,
    size: s.pSize,
    runTimeMs: s.runTimeMs,
    now,
  });
}

export function respawn(s: GameState, now: number): GameState {
  if (s.lives <= 1) {
    return { ...s, lives: 0, status: 'gameOver', diedAt: now };
  }
  return loadLevel({
    idx: s.levelIndex,
    score: s.scoreAtLevelStart,
    lives: s.lives - 1,
    coins: s.coinsAtLevelStart,
    size: 'small',
    runTimeMs: s.runTimeMs,
    now,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────────

export interface Input {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  runHeld: boolean;
  firePressed: boolean;
  crouchHeld: boolean;
}

export function setInput(s: GameState, inp: Input) {
  s.pInputL = inp.left;
  s.pInputR = inp.right;
  s.pJumpHeld = inp.jumpHeld;
  s.pRunHeld = inp.runHeld;
  s.pCrouchHeld = inp.crouchHeld;
  if (inp.jumpPressed) s.pJumpBuffer = JUMP_BUFFER_FRAMES;
  if (inp.firePressed) s.pFirePressed = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function playerW(s: GameState) {
  if (s.pCrouching) return PLAYER_SMALL_W;
  return s.pSize === 'small' ? PLAYER_SMALL_W : PLAYER_SUPER_W;
}
function playerH(s: GameState) {
  if (s.pCrouching) return PLAYER_SMALL_H;
  return s.pSize === 'small' ? PLAYER_SMALL_H : PLAYER_SUPER_H;
}

function aabbVsTilemap(s: GameState, x: number, y: number, w: number, h: number): boolean {
  const tx0 = Math.floor(x / TILE);
  const ty0 = Math.floor(y / TILE);
  const tx1 = Math.floor((x + w - 1) / TILE);
  const ty1 = Math.floor((y + h - 1) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (isSolid(tileAt(s.level, tx, ty))) return true;
    }
  }
  return false;
}

function moveAxis(
  s: GameState,
  axis: 'x' | 'y',
  delta: number,
  x: number, y: number, w: number, h: number,
): { x: number; y: number; collided: boolean } {
  if (delta === 0) return { x, y, collided: false };
  const step = delta > 0 ? 1 : -1;
  let nx = x, ny = y;
  let remaining = Math.abs(delta);
  let collided = false;
  while (remaining > 0) {
    const move = Math.min(1, remaining);
    if (axis === 'x') {
      const tryX = nx + step * move;
      if (aabbVsTilemap(s, tryX, ny, w, h)) {
        collided = true; break;
      }
      nx = tryX;
    } else {
      const tryY = ny + step * move;
      if (aabbVsTilemap(s, nx, tryY, w, h)) {
        collided = true; break;
      }
      ny = tryY;
    }
    remaining -= move;
  }
  return { x: nx, y: ny, collided };
}

function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

function pushParticles(s: GameState, x: number, y: number, color: string, n = 6, spread = 1.5) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + (Math.random() * 0.4 - 0.2);
    s.particles.push({
      id: s.nextId++,
      x, y,
      vx: Math.cos(a) * spread * (0.6 + Math.random() * 0.6),
      vy: Math.sin(a) * spread * (0.6 + Math.random() * 0.6) - 0.5,
      life: 24 + Math.floor(Math.random() * 14),
      maxLife: 38,
      color, size: 1 + Math.random() * 1.4,
    });
  }
}

function awardCoin(s: GameState, opts: { silent?: boolean } = {}) {
  s.coins += 1;
  s.score += COIN_VALUE;
  s.sfxEvents.push('coin');
  s.pickupToast = { text: 'COIN × ' + s.coins, framesLeft: 120 };
  if (!opts.silent) {
    // Floating "+100" near the player (same feel as enemy-kill popups).
    s.coinPops.push({
      id: s.nextId++,
      x: s.px + 6, y: s.py - 2,
      vy: -2.6,
      life: 50,
      text: '+' + COIN_VALUE,
      color: '#FFD23F',
    });
  }
  if (s.coins > 0 && s.coins % EXTRA_LIFE_AT_COINS === 0) {
    s.lives += 1;
  }
}

function takeDamage(s: GameState): boolean {
  // Returns true if player was killed (caller should bail).
  if (s.pHurtT > 0) return false;
  if (s.pStarT > 0) return false;        // Star = full invincibility
  if (s.pStompGrace > 0) return false;   // protects against same-frame damage from adjacent enemies
  s.damagedThisLevel = true;
  if (s.pSize === 'fire' || s.pSize === 'super') {
    s.pSize = 'small';
    s.py = s.py + (PLAYER_SUPER_H - PLAYER_SMALL_H);
    s.pHurtT = HURT_INVULN_FRAMES;
    s.pTransformT = 30;
    s.sfxEvents.push('powerdown');
    return false;
  }
  s.status = 'dying';
  s.diedAt = performance.now();
  s.pvy = -6;
  s.sfxEvents.push('die');
  return true;
}

function canGrowAt(s: GameState, newY: number): boolean {
  // Check if a super-sized player at (s.px, newY) would clip a solid tile.
  return !aabbVsTilemap(s, s.px, newY, PLAYER_SUPER_W, PLAYER_SUPER_H);
}

// Unified pickup value — mushroom / fire-flower / star all award the same
// flashy round number. Per-item value constants are kept for compat with
// scoring docs but overridden here.
const ITEM_PICKUP_VALUE = 1000;
// Coins collected this level → bonus score at level clear (per coin).
const COIN_END_BONUS = 50;

function pushScorePop(s: GameState, value: number, color: string) {
  s.coinPops.push({
    id: s.nextId++,
    x: s.px + 6,
    y: s.py - 2,
    vy: -3.2,
    life: 60,
    text: '+' + value,
    color,
  });
}

// Award an enemy kill (player-attributed) and emit a "+N" popup at the
// enemy's position. If the player is airborne and chains kills without
// touching ground, each kill doubles the base reward — caps at 8x.
function awardKill(s: GameState, x: number, y: number, value: number = ENEMY_KILL_VALUE) {
  // Only chain when player is airborne and base value is the standard kill
  // (boss kills shouldn't combo-stack).
  let payout = value;
  if (value === ENEMY_KILL_VALUE && !s.pOnGround) {
    s.comboChain = Math.min(8, s.comboChain + 1);
    payout = value * Math.max(1, s.comboChain);
  }
  s.score += payout;
  const labelExtra = s.comboChain >= 2 && value === ENEMY_KILL_VALUE
    ? ' ×' + s.comboChain
    : '';
  s.coinPops.push({
    id: s.nextId++,
    x, y,
    vy: -2.8,
    life: 55,
    text: '+' + payout + labelExtra,
    color: s.comboChain >= 2 && value === ENEMY_KILL_VALUE ? '#FF7A00' : '#FFD23F',
  });
}

function setPickupToast(s: GameState, text: string) {
  s.pickupToast = { text, framesLeft: 120 };  // ~2s at 60Hz
}

function applyPowerUp(s: GameState, kind: ItemKind) {
  if (kind === 'coin') {
    awardCoin(s);
    return;
  }
  if (kind === 'mushroom') {
    s.score += ITEM_PICKUP_VALUE;
    s.pickedMushroom += 1;
    pushScorePop(s, ITEM_PICKUP_VALUE, '#FF4D6D');
    setPickupToast(s, 'MUSHROOM × ' + s.pickedMushroom);
    if (s.pSize === 'small') {
      const newY = s.py - (PLAYER_SUPER_H - PLAYER_SMALL_H);
      if (canGrowAt(s, newY)) {
        s.pSize = 'super';
        s.py = newY;
        s.pTransformT = 30;
      }
    }
    s.sfxEvents.push('powerup');
    return;
  }
  if (kind === 'fire_flower') {
    s.score += ITEM_PICKUP_VALUE;
    s.pickedFireFlower += 1;
    pushScorePop(s, ITEM_PICKUP_VALUE, '#00D4FF');
    setPickupToast(s, 'FIRE FLOWER × ' + s.pickedFireFlower);
    if (s.pSize === 'small') {
      const newY = s.py - (PLAYER_SUPER_H - PLAYER_SMALL_H);
      if (canGrowAt(s, newY)) {
        s.pSize = 'fire';
        s.py = newY;
      }
    } else {
      s.pSize = 'fire';
    }
    s.pTransformT = 30;
    s.sfxEvents.push('powerup');
    return;
  }
  if (kind === 'star') {
    s.score += ITEM_PICKUP_VALUE;
    s.pickedStar += 1;
    pushScorePop(s, ITEM_PICKUP_VALUE, '#FFD23F');
    setPickupToast(s, 'STAR × ' + s.pickedStar);
    s.pStarT = STAR_INVULN_FRAMES;
    s.sfxEvents.push('powerup');
  }
}

function emitItemFromBlock(s: GameState, tx: number, ty: number, kind: ItemKind) {
  if (kind === 'coin') {
    // Coin from block — no "+100" popup (only score tick).
    awardCoin(s, { silent: true });
    return;
  }
  // Mushroom / fire-flower — for mushroom, force is on small player; if super/fire, give fire-flower instead.
  let actualKind: ItemKind = kind;
  if (kind === 'mushroom' && s.pSize !== 'small') {
    actualKind = 'fire_flower';
  }
  s.items.push({
    id: s.nextId++,
    kind: actualKind,
    x: tx * TILE + (TILE - MUSHROOM_W) / 2,
    y: ty * TILE,
    vx: actualKind === 'mushroom' ? MUSHROOM_SPEED : 0,
    vy: 0,
    riseT: 0,
    taken: false,
  });
  s.sfxEvents.push('powerup');
}

function bumpBlock(s: GameState, tx: number, ty: number) {
  const t = tileAt(s.level, tx, ty);
  if (!isBumpable(t)) return;

  const key = `${tx},${ty}`;
  const item = s.level.blockItems.get(key);

  s.blockBumps.push({ tx, ty, frame: 0 });
  s.sfxEvents.push('bump');

  // Any free coin sitting directly above the block gets popped up into the
  // player's account (Mario-style: head-bump knocks the coin loose).
  const aboveY = (ty - 1) * TILE;
  const blockX = tx * TILE;
  for (const c of s.freeCoins) {
    if (c.taken) continue;
    // Coin centre inside the tile above (with a little vertical tolerance).
    if (c.x >= blockX && c.x < blockX + TILE && Math.abs(c.y - aboveY - TILE / 2) <= TILE) {
      c.taken = true;
      awardCoin(s);
    }
  }

  if (t === 'brick' && !item) {
    // Empty brick
    if (s.pSize === 'small') return;
    // Break: small/super/fire (only super/fire here — small bumps)
    setTile(s.level, tx, ty, 'empty');
    s.score += BRICK_BREAK_VALUE;
    s.sfxEvents.push('brickBreak');
    // Brick debris
    for (let i = 0; i < 4; i++) {
      s.brickDebris.push({
        id: s.nextId++,
        x: tx * TILE + (i % 2) * 8,
        y: ty * TILE + Math.floor(i / 2) * 8,
        vx: (i % 2 === 0 ? -1.2 : 1.2) + (Math.random() - 0.5) * 0.4,
        vy: -3 - Math.random() * 0.7,
        life: 40,
        rot: 0,
      });
    }
    return;
  }

  if (item) {
    emitItemFromBlock(s, tx, ty, item);
    s.level.blockItems.delete(key);
    setTile(s.level, tx, ty, 'question_used');
  }
}

// Collapse the bridge between the bowser spawn and the axe → bowser falls.
function startBridgeDrop(s: GameState) {
  const axe = s.level.axe;
  if (!axe) return;
  s.status = 'bridgeDrop';
  s.bridgeDropT = 0;
  const bridgeRow = axe.y / TILE + 1;
  const axeTX = Math.floor(axe.x / TILE);
  let leftBound = axeTX - 1;
  const bowserSpawnTX = s.level.bowserSpawn ? Math.floor(s.level.bowserSpawn.x / TILE) : 0;
  for (let tx = axeTX - 1; tx >= bowserSpawnTX - 4; tx--) {
    if (tileAt(s.level, tx, bridgeRow) === 'ground') leftBound = tx;
    else break;
  }
  for (let tx = leftBound; tx < axeTX; tx++) {
    if (tileAt(s.level, tx, bridgeRow) === 'ground') {
      s.bridgeDropTiles.push({ tx, ty: bridgeRow, removedAt: (axeTX - tx) * 4 });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main step
// ─────────────────────────────────────────────────────────────────────────────

export function step(s: GameState, dtMs: number, viewW: number = VIEW_W) {
  s.sfxEvents = [];
  if (s.status === 'gameOver' || s.status === 'gameComplete' || s.status === 'levelClear') return;

  // Rescue cutscene (final castle) — Queen + hearts, then game complete.
  if (s.status === 'rescue') {
    s.rescueT += 1;
    if (s.rescueT > 200) {
      s.score += GAME_COMPLETE_VALUE;
      s.status = 'gameComplete';
      s.finishedAt = performance.now();
      s.sfxEvents.push('gameComplete');
    }
    return;
  }

  // Ready → playing on first input
  if (s.status === 'ready') {
    if (s.pInputL || s.pInputR || s.pJumpBuffer > 0) {
      s.status = 'playing';
      s.startedAt = performance.now();
    }
  }

  // Speedrun timer
  if (s.status === 'playing' || s.status === 'bridgeDrop') {
    s.runTimeMs += dtMs;
  }

  if (s.status === 'dying') {
    s.pvy = Math.min(MAX_FALL_SPEED + 2, s.pvy + GRAVITY);
    s.py += s.pvy;
    s.pAnimT += 1;
    return;
  }

  // During bridge drop: freeze player, only animate bridge + bowser fall.
  if (s.status === 'bridgeDrop') {
    s.bridgeDropT += 1;
    for (const bd of s.bridgeDropTiles) {
      if (s.bridgeDropT === bd.removedAt) {
        setTile(s.level, bd.tx, bd.ty, 'empty');
      }
    }
    if (s.bridgeDropT > 80) {
      if (s.bowser && s.bowser.alive) {
        // Only fall when his floor is gone (avoids falling through still-intact bridge).
        const footTx = Math.floor((s.bowser.x + BOWSER_W / 2) / TILE);
        const footTy = Math.floor((s.bowser.y + BOWSER_H + 1) / TILE);
        const floorBelow = tileAt(s.level, footTx, footTy);
        if (!isSolid(floorBelow)) {
          s.bowser.vy = Math.min(MAX_FALL_SPEED, s.bowser.vy + GRAVITY);
          s.bowser.y += s.bowser.vy;
          if (s.bowser.y > s.level.height * TILE) {
            s.bowser.alive = false;
            awardKill(s, s.bowser.x, s.bowser.y, BOWSER_KILL_VALUE);
          }
        }
      }
    }
    if (s.bridgeDropT > 140) {
      // Coin bonus + no-damage bonus on castle clear (same as flag levels).
      s.score += s.coins * COIN_END_BONUS;
      if (!s.damagedThisLevel) s.score += NO_DAMAGE_BONUS;
      if (s.levelIndex < LEVELS.length - 1) {
        // Non-final castle → surface the clue, then clear.
        s.hintText = s.level.hint;
        s.status = 'levelClear';
        s.finishedAt = performance.now();
      } else {
        // Final castle → rescue cutscene: the Queen appears beside the player
        // (placed to the left so both stay on-screen against the right wall).
        s.status = 'rescue';
        s.rescueT = 0;
        s.queenX = s.px - TILE * 2.5;
        s.queenY = s.py;
        s.sfxEvents.push('win');
      }
    }
    // Still animate particles for visual continuity.
    for (const p of s.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      p.vx *= 0.96;
      p.life -= 1;
    }
    s.particles = s.particles.filter((p) => p.life > 0);
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Player physics
  // ─────────────────────────────────────────────────────────────────────────
  // Crouch state transition — super/fire on ground can crouch into small hitbox.
  if (s.pSize !== 'small' && s.pCrouchHeld && s.pOnGround && !s.pCrouching) {
    // Start crouch: top of hitbox drops to where small player's top would be.
    s.pCrouching = true;
    s.py = s.py + (PLAYER_SUPER_H - PLAYER_SMALL_H);
  } else if (s.pCrouching && (!s.pCrouchHeld || !s.pOnGround || s.pSize === 'small')) {
    // Try to stand up — only if there's room above.
    const standY = s.py - (PLAYER_SUPER_H - PLAYER_SMALL_H);
    if (!aabbVsTilemap(s, s.px, standY, PLAYER_SUPER_W, PLAYER_SUPER_H)) {
      s.pCrouching = false;
      s.py = standY;
    }
  }

  const pw = playerW(s);
  const ph = playerH(s);
  const dir = (s.pInputR ? 1 : 0) - (s.pInputL ? 1 : 0);
  // No sprint — max speed is constant. Crouch slows movement.
  const baseSpd = MAX_WALK_SPEED * (s.pCrouching ? 0.55 : 1);
  if (dir !== 0) {
    s.pFacing = dir as -1 | 1;
    const accel = s.pOnGround ? ACCEL_GROUND : ACCEL_AIR;
    s.pvx += dir * accel;
    s.pvx = Math.max(-baseSpd, Math.min(baseSpd, s.pvx));
  } else {
    s.pvx *= s.pOnGround ? FRICTION_GROUND : FRICTION_AIR;
    if (Math.abs(s.pvx) < 0.05) s.pvx = 0;
  }

  if (s.pOnGround) s.pCoyote = COYOTE_FRAMES;
  else if (s.pCoyote > 0) s.pCoyote -= 1;
  if (s.pJumpBuffer > 0) s.pJumpBuffer -= 1;

  if (s.pJumpBuffer > 0 && s.pCoyote > 0) {
    const speedBoost = Math.abs(s.pvx) > MAX_WALK_SPEED ? JUMP_RUN_BONUS : 0;
    s.pvy = JUMP_VEL + speedBoost;
    s.pOnGround = false;
    s.pCoyote = 0;
    s.pJumpBuffer = 0;
    s.sfxEvents.push('jump');
  }

  let gravity: number;
  if (s.pJumpHeld && s.pvy < 0) gravity = JUMP_HOLD_GRAVITY;
  else if (Math.abs(s.pvy) < APEX_VY_THRESHOLD && !s.pOnGround) gravity = APEX_GRAVITY;
  else gravity = GRAVITY;
  s.pvy = Math.min(MAX_FALL_SPEED, s.pvy + gravity);

  // Move X
  let mv = moveAxis(s, 'x', s.pvx, s.px, s.py, pw, ph);
  s.px = mv.x;
  if (mv.collided) s.pvx = 0;

  // Clamp to level bounds — prevents falling off left/right edges into nothing.
  const levelMaxX = s.level.width * TILE - pw;
  if (s.px < 0) { s.px = 0; s.pvx = 0; }
  if (s.px > levelMaxX) { s.px = levelMaxX; s.pvx = 0; }

  // Move Y
  mv = moveAxis(s, 'y', s.pvy, s.px, s.py, pw, ph);
  if (mv.collided) {
    if (s.pvy > 0) {
      // Just landed — reset combo chain.
      if (!s.pOnGround) s.comboChain = 0;
      s.pOnGround = true;
      if (s.pvy > 4) s.sfxEvents.push('thud');
    } else if (s.pvy < 0) {
      // Head bonk: find which tile(s) we hit and bump them
      const headY = s.py + s.pvy; // top edge attempted
      const ty = Math.floor((headY - 1) / TILE);
      const txL = Math.floor(s.px / TILE);
      const txR = Math.floor((s.px + pw - 1) / TILE);
      for (let tx = txL; tx <= txR; tx++) {
        if (isBumpable(tileAt(s.level, tx, ty))) {
          bumpBlock(s, tx, ty);
        }
      }
    }
    s.pvy = 0;
  } else {
    s.pOnGround = false;
  }
  s.py = mv.y;

  s.pAnimT += 1;
  if (s.pHurtT > 0) s.pHurtT -= 1;
  if (s.pStarT > 0) s.pStarT -= 1;
  if (s.pTransformT > 0) s.pTransformT -= 1;
  if (s.pFireCooldown > 0) s.pFireCooldown -= 1;
  if (s.pStompGrace > 0) s.pStompGrace -= 1;

  // Fall off the world
  if (s.py > s.level.height * TILE + 60) {
    s.status = 'dying';
    s.diedAt = performance.now();
    s.sfxEvents.push('die');
    return;
  }

  // Hazard tiles
  const ftx0 = Math.floor(s.px / TILE);
  const ftx1 = Math.floor((s.px + pw - 1) / TILE);
  const fty0 = Math.floor(s.py / TILE);
  const fty1 = Math.floor((s.py + ph - 1) / TILE);
  for (let ty = fty0; ty <= fty1; ty++) {
    for (let tx = ftx0; tx <= ftx1; tx++) {
      const t = tileAt(s.level, tx, ty);
      if (isHazard(t)) {
        if (isInstantDeath(t)) {
          s.status = 'dying';
          s.diedAt = performance.now();
          s.sfxEvents.push('die');
          return;
        }
        // Spike: top half deadly
        const hx = tx * TILE;
        const hy = ty * TILE + TILE / 2;
        if (
          s.px + pw > hx &&
          s.px < hx + TILE &&
          s.py + ph > hy &&
          s.py < hy + TILE / 2
        ) {
          if (takeDamage(s)) return;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fireball spawn (RUN/FIRE button)
  // ─────────────────────────────────────────────────────────────────────────
  if (s.pFirePressed) {
    s.pFirePressed = false;
    if (s.pSize === 'fire' && s.pFireCooldown <= 0 && s.fireballs.length < FIREBALL_MAX) {
      s.fireballs.push({
        id: s.nextId++,
        x: s.px + (s.pFacing > 0 ? pw : -FIREBALL_W),
        y: s.py + ph / 3,
        vx: s.pFacing * FIREBALL_SPEED,
        vy: 0,
        life: FIREBALL_LIFE,
      });
      s.pFireCooldown = 18;
      s.sfxEvents.push('fireball');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Goombas
  // ─────────────────────────────────────────────────────────────────────────
  for (const g of s.goombas) {
    if (!g.alive) {
      if (performance.now() - g.squashedAt > 400) {
        // marked dead-gone
      }
      continue;
    }
    g.vy = Math.min(MAX_FALL_SPEED, g.vy + GRAVITY);
    const tryX = g.x + g.vx;
    if (aabbVsTilemap(s, tryX, g.y, GOOMBA_W, GOOMBA_H)) {
      g.dir = -g.dir as -1 | 1;
      g.vx = g.dir * GOOMBA_SPEED;
    } else {
      // Edge detection: ledge ahead = turn (skipped if airborne)
      if (g.vy === 0) {
        const footX = g.dir > 0 ? tryX + GOOMBA_W : tryX - 1;
        const footY = g.y + GOOMBA_H + 1;
        if (!isSolid(tileAt(s.level, Math.floor(footX / TILE), Math.floor(footY / TILE)))) {
          g.dir = -g.dir as -1 | 1;
          g.vx = g.dir * GOOMBA_SPEED;
        }
      }
    }
    g.x += g.vx;
    const ty = g.y + g.vy;
    if (aabbVsTilemap(s, g.x, ty, GOOMBA_W, GOOMBA_H)) {
      g.vy = 0;
    } else {
      g.y = ty;
    }

    if (s.status === 'playing' && rectOverlap(s.px, s.py, pw, ph, g.x, g.y, GOOMBA_W, GOOMBA_H)) {
      if (s.pStarT > 0) {
        g.alive = false;
        g.squashedAt = performance.now();
        awardKill(s, g.x + GOOMBA_W / 2 - 4, g.y);
        s.sfxEvents.push('stomp');
        pushParticles(s, g.x + GOOMBA_W / 2, g.y + GOOMBA_H / 2, '#FFD23F', 10, 2.5);
        continue;
      }
      const playerFootY = s.py + ph;
      if (s.pvy > 0 && playerFootY - g.y < 10) {
        g.alive = false;
        g.squashedAt = performance.now();
        s.pvy = s.pJumpHeld ? STOMP_BOUNCE_HOLD : STOMP_BOUNCE;
        s.pStompGrace = 5;
        awardKill(s, g.x + GOOMBA_W / 2 - 4, g.y);
        s.sfxEvents.push('stomp');
        pushParticles(s, g.x + GOOMBA_W / 2, g.y + GOOMBA_H / 2, '#FF4D6D', 6, 1.5);
      } else if (s.pHurtT <= 0) {
        if (takeDamage(s)) return;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Koopas (walking + shell)
  // ─────────────────────────────────────────────────────────────────────────
  for (const k of s.koopas) {
    if (!k.alive) continue;
    const ew = k.state === 'walking' ? KOOPA_W : SHELL_W;
    const eh = k.state === 'walking' ? KOOPA_H : SHELL_H;

    k.vy = Math.min(MAX_FALL_SPEED, k.vy + GRAVITY);

    if (k.state === 'walking') {
      const tryX = k.x + k.vx;
      if (aabbVsTilemap(s, tryX, k.y, ew, eh)) {
        k.dir = -k.dir as -1 | 1;
        k.vx = k.dir * KOOPA_SPEED;
      } else if (k.vy === 0) {
        const footX = k.dir > 0 ? tryX + ew : tryX - 1;
        const footY = k.y + eh + 1;
        if (!isSolid(tileAt(s.level, Math.floor(footX / TILE), Math.floor(footY / TILE)))) {
          k.dir = -k.dir as -1 | 1;
          k.vx = k.dir * KOOPA_SPEED;
        }
      }
      k.x += k.vx;
    } else if (k.state === 'shell_slide') {
      const tryX = k.x + k.vx;
      if (aabbVsTilemap(s, tryX, k.y, ew, eh)) {
        k.dir = -k.dir as -1 | 1;
        k.vx = k.dir * SHELL_SLIDE_SPEED;
      } else {
        k.x = tryX;
      }
      // Kill other enemies on path
      for (const g of s.goombas) {
        if (!g.alive) continue;
        if (rectOverlap(k.x, k.y, ew, eh, g.x, g.y, GOOMBA_W, GOOMBA_H)) {
          g.alive = false;
          g.squashedAt = performance.now();
          awardKill(s, g.x, g.y);
          pushParticles(s, g.x, g.y, '#FF4D6D', 8, 2);
        }
      }
      for (const ok of s.koopas) {
        if (ok === k || !ok.alive) continue;
        const okW = ok.state === 'walking' ? KOOPA_W : SHELL_W;
        const okH = ok.state === 'walking' ? KOOPA_H : SHELL_H;
        if (rectOverlap(k.x, k.y, ew, eh, ok.x, ok.y, okW, okH)) {
          ok.alive = false;
          awardKill(s, ok.x, ok.y);
          pushParticles(s, ok.x, ok.y, '#00B040', 8, 2);
        }
      }
    } else {
      // shell_idle — no horizontal motion
      k.vx = 0;
      k.stateT += 1;
    }

    const ty = k.y + k.vy;
    if (aabbVsTilemap(s, k.x, ty, ew, eh)) {
      k.vy = 0;
    } else {
      k.y = ty;
    }

    if (s.status === 'playing' && rectOverlap(s.px, s.py, pw, ph, k.x, k.y, ew, eh)) {
      if (s.pStarT > 0) {
        k.alive = false;
        awardKill(s, k.x, k.y);
        s.sfxEvents.push('stomp');
        pushParticles(s, k.x + ew / 2, k.y + eh / 2, '#FFD23F', 10, 2.5);
        continue;
      }
      const playerFootY = s.py + ph;
      if (s.pvy > 0 && playerFootY - k.y < 12) {
        // Stomp
        if (k.state === 'walking') {
          k.state = 'shell_idle';
          k.vx = 0;
          k.stateT = 0;
          k.y = k.y + (KOOPA_H - SHELL_H);
          awardKill(s, k.x, k.y);
        } else if (k.state === 'shell_slide') {
          k.state = 'shell_idle';
          k.vx = 0;
          k.stateT = 0;
        } else {
          // Stomp idle shell — kick it
          k.state = 'shell_slide';
          k.dir = (s.px + pw / 2 < k.x + ew / 2 ? 1 : -1) as -1 | 1;
          k.vx = k.dir * SHELL_SLIDE_SPEED;
          s.sfxEvents.push('shellKick');
        }
        s.pvy = s.pJumpHeld ? STOMP_BOUNCE_HOLD : STOMP_BOUNCE;
        s.pStompGrace = 5;
        s.sfxEvents.push('stomp');
      } else if (k.state === 'shell_idle') {
        // Touch idle shell from side → kick it
        k.state = 'shell_slide';
        k.dir = (s.px + pw / 2 < k.x + ew / 2 ? 1 : -1) as -1 | 1;
        k.vx = k.dir * SHELL_SLIDE_SPEED;
        s.sfxEvents.push('shellKick');
      } else if (s.pHurtT <= 0) {
        if (takeDamage(s)) return;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Paratroopas — bounce on their platform
  // ─────────────────────────────────────────────────────────────────────────
  for (const p of s.paratroopas) {
    if (!p.alive) continue;
    p.vy += GRAVITY * 0.9;
    p.vy = Math.min(MAX_FALL_SPEED, p.vy);
    const ty = p.y + p.vy;
    if (aabbVsTilemap(s, p.x, ty, KOOPA_W, KOOPA_H)) {
      // bounce
      p.vy = PARATROOPA_BOUNCE_VY;
    } else {
      p.y = ty;
    }
    // Clamp to baseY (don't fly too high)
    if (p.y < p.baseY - 80) {
      p.vy = 0.5;
    }

    if (s.status === 'playing' && rectOverlap(s.px, s.py, pw, ph, p.x, p.y, KOOPA_W, KOOPA_H)) {
      if (s.pStarT > 0) {
        p.alive = false;
        awardKill(s, p.x, p.y);
        s.sfxEvents.push('stomp');
        pushParticles(s, p.x, p.y, '#FFD23F', 10, 2.5);
        continue;
      }
      const playerFootY = s.py + ph;
      if (s.pvy > 0 && playerFootY - p.y < 12) {
        p.alive = false;
        s.pvy = s.pJumpHeld ? STOMP_BOUNCE_HOLD : STOMP_BOUNCE;
        s.pStompGrace = 5;
        awardKill(s, p.x, p.y);
        s.sfxEvents.push('stomp');
        pushParticles(s, p.x, p.y, '#00B040', 8, 2);
      } else if (s.pHurtT <= 0) {
        if (takeDamage(s)) return;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Piranha plants
  // ─────────────────────────────────────────────────────────────────────────
  for (const pl of s.piranhas) {
    if (!pl.alive) continue;
    pl.stateT += 1;
    const playerNear =
      Math.abs((s.px + pw / 2) - (pl.x + TILE / 2)) < PIRANHA_PLAYER_NEAR_TILES * TILE;

    if (pl.state === 'hidden') {
      pl.visibleY = pl.y + TILE; // fully hidden
      if (pl.stateT >= PIRANHA_CYCLE_TIME) {
        if (!playerNear) {
          pl.state = 'rising';
          pl.stateT = 0;
        }
      }
    } else if (pl.state === 'rising') {
      const t = Math.min(1, pl.stateT / PIRANHA_RISE_TIME);
      pl.visibleY = pl.y + TILE - PIRANHA_H * t;
      if (pl.stateT >= PIRANHA_RISE_TIME) {
        pl.state = 'extended';
        pl.stateT = 0;
      }
    } else if (pl.state === 'extended') {
      pl.visibleY = pl.y + TILE - PIRANHA_H;
      if (pl.stateT >= PIRANHA_HOLD_TIME) {
        pl.state = 'descending';
        pl.stateT = 0;
      }
    } else if (pl.state === 'descending') {
      const t = Math.min(1, pl.stateT / PIRANHA_RISE_TIME);
      pl.visibleY = pl.y + TILE - PIRANHA_H * (1 - t);
      if (pl.stateT >= PIRANHA_RISE_TIME) {
        pl.state = 'hidden';
        pl.stateT = 0;
      }
    }

    // Damage check — only when plant body is above pipe
    if (pl.state !== 'hidden') {
      const px2 = pl.x + TILE - PIRANHA_W / 2;          // centered on 2-tile-wide pipe
      const py2 = pl.visibleY;
      const ph2 = (pl.y + TILE) - pl.visibleY;
      if (s.status === 'playing' && rectOverlap(s.px, s.py, pw, ph, px2, py2, PIRANHA_W, ph2)) {
        if (s.pStarT > 0) {
          pl.alive = false;
          awardKill(s, px2, py2);
          s.sfxEvents.push('stomp');
          pushParticles(s, px2 + PIRANHA_W / 2, py2 + PIRANHA_H / 2, '#FFD23F', 10, 2.5);
          continue;
        }
        if (s.pHurtT <= 0) {
          if (takeDamage(s)) return;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fire bars
  // ─────────────────────────────────────────────────────────────────────────
  for (const fb of s.firebars) {
    fb.angle += FIREBAR_ANG_SPEED;
    for (let i = 1; i <= FIREBAR_LENGTH; i++) {
      const ex = fb.cx + Math.cos(fb.angle) * (FIREBAR_SEG_RADIUS * 2) * i;
      const ey = fb.cy + Math.sin(fb.angle) * (FIREBAR_SEG_RADIUS * 2) * i;
      // Hit-test versus player
      if (s.status === 'playing' && s.pHurtT <= 0) {
        const cx = s.px + pw / 2;
        const cy = s.py + ph / 2;
        if (distSq(cx, cy, ex, ey) < (FIREBAR_SEG_RADIUS + pw / 3) ** 2) {
          if (takeDamage(s)) return;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bowser
  // ─────────────────────────────────────────────────────────────────────────
  if (s.bowser && s.bowser.alive) {
    const b = s.bowser;
    if (b.hurtT > 0) b.hurtT -= 1;
    b.vy = Math.min(MAX_FALL_SPEED, b.vy + GRAVITY);

    // Walk
    const tryX = b.x + b.vx;
    if (aabbVsTilemap(s, tryX, b.y, BOWSER_W, BOWSER_H)) {
      b.dir = -b.dir as -1 | 1;
      b.vx = b.dir * BOWSER_SPEED;
    } else {
      // ledge → turn
      const footX = b.dir > 0 ? tryX + BOWSER_W : tryX - 1;
      const footY = b.y + BOWSER_H + 1;
      if (!isSolid(tileAt(s.level, Math.floor(footX / TILE), Math.floor(footY / TILE)))) {
        b.dir = -b.dir as -1 | 1;
        b.vx = b.dir * BOWSER_SPEED;
      } else {
        b.x = tryX;
      }
    }

    const ty = b.y + b.vy;
    if (aabbVsTilemap(s, b.x, ty, BOWSER_W, BOWSER_H)) {
      b.vy = 0;
    } else {
      b.y = ty;
    }

    // Hop
    b.hopT -= 1;
    if (b.hopT <= 0) {
      b.hopT = BOWSER_HOP_INTERVAL;
      if (aabbVsTilemap(s, b.x, b.y + 1, BOWSER_W, BOWSER_H)) {
        b.vy = BOWSER_HOP_VY;
      }
    }
    // Fire breath
    b.fireT -= 1;
    if (b.fireT <= 0) {
      b.fireT = BOWSER_FIRE_INTERVAL;
      s.bowserFires.push({
        id: s.nextId++,
        x: b.x + (b.dir > 0 ? BOWSER_W : -BOWSER_FIRE_W),
        y: b.y + BOWSER_H / 3,
        vx: b.dir * BOWSER_FIRE_SPEED,
      });
      s.sfxEvents.push('bowserFire');
    }

    // Touch damage (or star-kill)
    if (s.status === 'playing' && rectOverlap(s.px, s.py, pw, ph, b.x, b.y, BOWSER_W, BOWSER_H)) {
      if (s.pStarT > 0 && b.hurtT <= 0) {
        b.hp -= 2;                   // star = double damage to boss
        b.hurtT = 30;
        s.sfxEvents.push('bowserHit');
        pushParticles(s, b.x + BOWSER_W / 2, b.y + BOWSER_H / 2, '#FFD23F', 14, 3);
        if (b.hp <= 0) {
          b.alive = false;
          awardKill(s, b.x, b.y, BOWSER_KILL_VALUE);
        }
      } else if (s.pHurtT <= 0 && s.pStarT <= 0) {
        if (takeDamage(s)) return;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fireballs
  // ─────────────────────────────────────────────────────────────────────────
  for (const f of s.fireballs) {
    if (f.life <= 0) continue;
    f.vy = Math.min(MAX_FALL_SPEED, f.vy + GRAVITY * 0.8);
    const tx = f.x + f.vx;
    if (aabbVsTilemap(s, tx, f.y, FIREBALL_W, FIREBALL_H)) {
      f.life = 0;
      pushParticles(s, f.x, f.y, '#FFD23F', 5, 1.5);
      continue;
    } else {
      f.x = tx;
    }
    const ny = f.y + f.vy;
    if (aabbVsTilemap(s, f.x, ny, FIREBALL_W, FIREBALL_H)) {
      f.vy = FIREBALL_BOUNCE;
    } else {
      f.y = ny;
    }
    f.life -= 1;

    // Hit enemies
    for (const g of s.goombas) {
      if (!g.alive) continue;
      if (rectOverlap(f.x, f.y, FIREBALL_W, FIREBALL_H, g.x, g.y, GOOMBA_W, GOOMBA_H)) {
        g.alive = false;
        g.squashedAt = performance.now();
        awardKill(s, g.x, g.y);
        f.life = 0;
        pushParticles(s, g.x, g.y, '#FFD23F', 8, 2);
        break;
      }
    }
    for (const k of s.koopas) {
      if (!k.alive) continue;
      const kw = k.state === 'walking' ? KOOPA_W : SHELL_W;
      const kh = k.state === 'walking' ? KOOPA_H : SHELL_H;
      if (rectOverlap(f.x, f.y, FIREBALL_W, FIREBALL_H, k.x, k.y, kw, kh)) {
        k.alive = false;
        awardKill(s, k.x, k.y);
        f.life = 0;
        pushParticles(s, k.x, k.y, '#FFD23F', 8, 2);
        break;
      }
    }
    for (const p of s.paratroopas) {
      if (!p.alive) continue;
      if (rectOverlap(f.x, f.y, FIREBALL_W, FIREBALL_H, p.x, p.y, KOOPA_W, KOOPA_H)) {
        p.alive = false;
        awardKill(s, p.x, p.y);
        f.life = 0;
        pushParticles(s, p.x, p.y, '#FFD23F', 8, 2);
        break;
      }
    }
    for (const pl of s.piranhas) {
      if (!pl.alive || pl.state === 'hidden') continue;
      const py2 = pl.visibleY;
      const ph2 = (pl.y + TILE) - pl.visibleY;
      const px2 = pl.x + TILE - PIRANHA_W / 2;          // centered on 2-tile-wide pipe
      if (rectOverlap(f.x, f.y, FIREBALL_W, FIREBALL_H, px2, py2, PIRANHA_W, ph2)) {
        pl.alive = false;
        awardKill(s, px2, py2);
        f.life = 0;
        pushParticles(s, px2, py2, '#FFD23F', 8, 2);
        break;
      }
    }
    if (s.bowser && s.bowser.alive && s.bowser.hurtT <= 0) {
      const b = s.bowser;
      if (rectOverlap(f.x, f.y, FIREBALL_W, FIREBALL_H, b.x, b.y, BOWSER_W, BOWSER_H)) {
        b.hp -= 1;
        b.hurtT = 30;
        f.life = 0;
        s.sfxEvents.push('bowserHit');
        pushParticles(s, b.x + BOWSER_W / 2, b.y + BOWSER_H / 2, '#FFD23F', 10, 2);
        if (b.hp <= 0) {
          b.alive = false;
          awardKill(s, b.x, b.y, BOWSER_KILL_VALUE);
        }
      }
    }
  }
  s.fireballs = s.fireballs.filter((f) => f.life > 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Bowser fires (projectiles toward player)
  // ─────────────────────────────────────────────────────────────────────────
  for (const bf of s.bowserFires) {
    bf.x += bf.vx;
    if (s.status === 'playing' && rectOverlap(s.px, s.py, pw, ph, bf.x, bf.y, BOWSER_FIRE_W, BOWSER_FIRE_H)) {
      if (s.pHurtT <= 0) {
        if (takeDamage(s)) return;
      }
    }
  }
  s.bowserFires = s.bowserFires.filter((bf) => bf.x > s.camX - 64 && bf.x < s.camX + viewW + 64);

  // ─────────────────────────────────────────────────────────────────────────
  // Items (mushroom, fire-flower)
  // ─────────────────────────────────────────────────────────────────────────
  for (const it of s.items) {
    if (it.taken) continue;
    if (it.riseT < ITEM_RISE_FRAMES) {
      it.riseT += 1;
      it.y -= MUSHROOM_H / ITEM_RISE_FRAMES;
      continue;
    }
    if (it.kind === 'mushroom') {
      it.vy = Math.min(MAX_FALL_SPEED, it.vy + GRAVITY);
      const tryX = it.x + it.vx;
      if (aabbVsTilemap(s, tryX, it.y, MUSHROOM_W, MUSHROOM_H)) {
        it.vx = -it.vx;
      } else {
        it.x = tryX;
      }
      const ty = it.y + it.vy;
      if (aabbVsTilemap(s, it.x, ty, MUSHROOM_W, MUSHROOM_H)) {
        it.vy = 0;
      } else {
        it.y = ty;
      }
    } else if (it.kind === 'star') {
      // Star bounces both horizontally and vertically — slower, easier to catch.
      if (it.vx === 0) it.vx = MUSHROOM_SPEED * 0.7;
      it.vy = Math.min(MAX_FALL_SPEED, it.vy + GRAVITY * 0.85);
      const tryX = it.x + it.vx;
      if (aabbVsTilemap(s, tryX, it.y, MUSHROOM_W, MUSHROOM_H)) {
        it.vx = -it.vx;
      } else {
        it.x = tryX;
      }
      const ty = it.y + it.vy;
      if (aabbVsTilemap(s, it.x, ty, MUSHROOM_W, MUSHROOM_H)) {
        if (it.vy > 0) it.vy = -1.8;   // gentler bounce on ground hit
        else it.vy = 0;
      } else {
        it.y = ty;
      }
    } else if (it.kind === 'fire_flower') {
      // Fire-flower falls onto the surface below the block instead of floating
      // in mid-air. Once it lands it stays put (vx stays 0).
      it.vy = Math.min(MAX_FALL_SPEED, it.vy + GRAVITY);
      const ty = it.y + it.vy;
      if (aabbVsTilemap(s, it.x, ty, MUSHROOM_W, MUSHROOM_H)) {
        it.vy = 0;
      } else {
        it.y = ty;
      }
    }

    if (s.status === 'playing' && rectOverlap(s.px, s.py, pw, ph, it.x, it.y, MUSHROOM_W, MUSHROOM_H)) {
      it.taken = true;
      applyPowerUp(s, it.kind);
    }
  }
  s.items = s.items.filter((i) => !i.taken && i.y < s.level.height * TILE + 40);

  // ─────────────────────────────────────────────────────────────────────────
  // Free coins
  // ─────────────────────────────────────────────────────────────────────────
  for (const c of s.freeCoins) {
    if (c.taken) continue;
    if (
      s.px + pw > c.x - 6 && s.px < c.x + 6 &&
      s.py + ph > c.y - 8 && s.py < c.y + 8
    ) {
      c.taken = true;
      awardCoin(s);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Block bumps + brick debris + coin pops
  // ─────────────────────────────────────────────────────────────────────────
  for (const bp of s.blockBumps) bp.frame += 1;
  s.blockBumps = s.blockBumps.filter((bp) => bp.frame < 10);

  for (const d of s.brickDebris) {
    d.vy = Math.min(MAX_FALL_SPEED, d.vy + GRAVITY * 0.9);
    d.x += d.vx;
    d.y += d.vy;
    d.life -= 1;
    d.rot += 0.3;
  }
  s.brickDebris = s.brickDebris.filter((d) => d.life > 0);

  for (const cp of s.coinPops) {
    cp.y += cp.vy;
    if (cp.text) {
      // Score-pop text — floats straight up, gentle deceleration, no fall back.
      cp.vy *= 0.94;
    } else {
      cp.vy += GRAVITY * 0.8;
    }
    cp.life -= 1;
  }
  s.coinPops = s.coinPops.filter((cp) => cp.life > 0);

  // Tick the pickup toast (clears after ~2s of game time)
  if (s.pickupToast) {
    s.pickupToast.framesLeft -= 1;
    if (s.pickupToast.framesLeft <= 0) s.pickupToast = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Flag / Axe
  // ─────────────────────────────────────────────────────────────────────────
  if (s.status === 'playing') {
    if (s.level.flag) {
      // Pole extends UP from baseY (top of ground tile) for 8 tiles.
      const fx = s.level.flag.x;
      const fy = s.level.flag.y;
      const baseY = fy + TILE;
      const topY = baseY - 8 * TILE;
      if (
        s.px + pw > fx - 4 && s.px < fx + TILE + 4 &&
        s.py + ph > topY && s.py < baseY + 4
      ) {
        s.score += LEVEL_FINISH_VALUE;
        // Coins collected this level convert to score at clear time.
        s.score += s.coins * COIN_END_BONUS;
        // No-damage bonus — flawless run gets a fat +1000 reward.
        if (!s.damagedThisLevel) s.score += NO_DAMAGE_BONUS;
        s.status = 'levelClear';
        s.finishedAt = performance.now();
        s.sfxEvents.push('win');
      }
    }
    if (s.level.axe && !s.bridgeArmed) {
      const ax = s.level.axe.x;
      const ay = s.level.axe.y;
      if (
        s.px + pw > ax - 2 && s.px < ax + TILE + 2 &&
        s.py + ph > ay && s.py < ay + TILE * 2
      ) {
        // Axe struck — arm the collapse but let the player keep walking a beat
        // before the ground actually gives way (no instant yank).
        s.bridgeArmed = true;
        s.axeWalkT = 70;
        s.score += AXE_HIT_VALUE;
        s.sfxEvents.push('bowserHit');
      }
    }
    // Grace walk after the axe — count down, then collapse the bridge.
    if (s.bridgeArmed && s.axeWalkT > 0) {
      s.axeWalkT -= 1;
      if (s.axeWalkT === 0) startBridgeDrop(s);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Particles
  // ─────────────────────────────────────────────────────────────────────────
  for (const p of s.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;
    p.vx *= 0.96;
    p.life -= 1;
  }
  s.particles = s.particles.filter((p) => p.life > 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Camera
  // ─────────────────────────────────────────────────────────────────────────
  const targetX = s.px + pw / 2 - viewW / 2;
  s.camX += (targetX - s.camX) * 0.14;
  const maxCamX = Math.max(0, s.level.width * TILE - viewW);
  s.camX = Math.max(0, Math.min(maxCamX, s.camX));
  s.camY = Math.max(0, s.level.height * TILE - VIEW_H);
}
