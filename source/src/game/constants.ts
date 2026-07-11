// World units (pixels in game-space; renderer upscales)
export const TILE = 16;

// ─────────────────────────────────────────────────────────────────────────────
// Player physics — single-speed walk, no sprint
// Tuned for snappy jumps (quick rise + quick land) and brisk walk pace.
// ─────────────────────────────────────────────────────────────────────────────
export const GRAVITY = 0.24;              // stronger gravity → faster landings
export const MAX_FALL_SPEED = 4.6;        // higher cap so falls feel decisive
export const JUMP_VEL = -4.4;             // bigger initial pop to clear obstacles
export const JUMP_RUN_BONUS = 0;          // sprint disabled — no jump bonus
export const JUMP_HOLD_GRAVITY = 0.10;    // less floaty when holding jump
export const APEX_GRAVITY = 0.08;         // shorter hang time at apex
export const APEX_VY_THRESHOLD = 1.2;
export const COYOTE_FRAMES = 9;
// Jump-buffer — number of frames a "just-pressed" jump stays queued waiting
// to fire. Bumped up so taps near the start of a run aren't dropped on phone.
export const JUMP_BUFFER_FRAMES = 18;
export const STOMP_BOUNCE = -3.2;
export const STOMP_BOUNCE_HOLD = -3.9;

// Movement — single walk speed (no run mode)
export const ACCEL_GROUND = 0.10;
export const ACCEL_AIR = 0.07;
export const FRICTION_GROUND = 0.84;
export const FRICTION_AIR = 0.95;
export const MAX_WALK_SPEED = 1.20;       // brisker base pace
export const MAX_RUN_SPEED = 1.20;        // same as walk → sprint has no effect
export const CROUCH_SPEED_MULT = 0.55;    // crouch slows you down

// Player sizes (small / super / fire share super hitbox)
export const PLAYER_SMALL_W = 12;
export const PLAYER_SMALL_H = 14;
export const PLAYER_SUPER_W = 14;
export const PLAYER_SUPER_H = 22;
export const PLAYER_SPAWN_X = 24;
export const PLAYER_SPAWN_Y = 0;
export const HURT_INVULN_FRAMES = 180;   // 3 sec grace after taking damage
export const STAR_INVULN_FRAMES = 600;   // 10 sec invincibility from a Star pickup

// ─────────────────────────────────────────────────────────────────────────────
// Enemies
// ─────────────────────────────────────────────────────────────────────────────
// Goomba (bug)
export const GOOMBA_W = 12;
export const GOOMBA_H = 12;
export const GOOMBA_SPEED = 0.16;

// Koopa Troopa
export const KOOPA_W = 13;
export const KOOPA_H = 18;
export const KOOPA_SPEED = 0.20;
export const SHELL_W = 14;
export const SHELL_H = 12;
export const SHELL_SLIDE_SPEED = 1.5;

// Paratroopa (jumping koopa for sky level) — slower, lazier bounces
export const PARATROOPA_BOUNCE_VY = -2.0;

// Piranha Plant
export const PIRANHA_W = 14;
export const PIRANHA_H = 22;
export const PIRANHA_RISE_TIME = 30;     // frames to rise/descend
export const PIRANHA_HOLD_TIME = 90;     // frames to stay extended
export const PIRANHA_CYCLE_TIME = 240;   // frames between cycles
export const PIRANHA_PLAYER_NEAR_TILES = 3; // pause if player within N tiles

// Bowser-like boss
export const BOWSER_W = 24;
export const BOWSER_H = 24;
export const BOWSER_SPEED = 0.14;
export const BOWSER_HP = 5;
export const BOWSER_HOP_INTERVAL = 240;
export const BOWSER_HOP_VY = -3.0;
export const BOWSER_FIRE_INTERVAL = 200;

// Projectiles
export const FIREBALL_W = 6;
export const FIREBALL_H = 6;
export const FIREBALL_SPEED = 2.8;
export const FIREBALL_BOUNCE = -2.9;
export const FIREBALL_MAX = 2;
export const FIREBALL_LIFE = 150;
export const BOWSER_FIRE_W = 8;
export const BOWSER_FIRE_H = 6;
export const BOWSER_FIRE_SPEED = 1.2;

// Items
export const MUSHROOM_W = 14;
export const MUSHROOM_H = 14;
export const MUSHROOM_SPEED = 0.85;
export const ITEM_RISE_FRAMES = 22;      // frames to emerge from block

// Fire bar — short + slow so it threatens upper paths only, not ground walks
export const FIREBAR_LENGTH = 4;         // segments
export const FIREBAR_SEG_RADIUS = 5;     // px radius of each segment
export const FIREBAR_ANG_SPEED = 0.020;  // rad/frame (≈300 frames for full rotation)

// ─────────────────────────────────────────────────────────────────────────────
// Score — flat +100 per enemy you personally kill (stomp / shell-kick / fireball).
// Coins also +100 each so popups feel consistent.
// ─────────────────────────────────────────────────────────────────────────────
export const COIN_VALUE = 100;
export const BRICK_BREAK_VALUE = 25;
export const ENEMY_KILL_VALUE = 100;
// Legacy names — kept for any docs/scoring screens; engine uses ENEMY_KILL_VALUE everywhere now.
export const STOMP_VALUE = ENEMY_KILL_VALUE;
export const KOOPA_STOMP_VALUE = ENEMY_KILL_VALUE;
export const SHELL_KILL_VALUE = ENEMY_KILL_VALUE;
export const FIREBALL_KILL_VALUE = ENEMY_KILL_VALUE;
export const PIRANHA_KILL_VALUE = ENEMY_KILL_VALUE;
export const MUSHROOM_VALUE = 1000;
export const FIRE_FLOWER_VALUE = 1000;
export const STAR_VALUE = 1000;
export const ONE_UP_VALUE = 0;
export const BOWSER_KILL_VALUE = 5000;
export const AXE_HIT_VALUE = 2000;
export const LEVEL_FINISH_VALUE = 500;
export const NO_DAMAGE_BONUS = 1000;
export const GAME_COMPLETE_VALUE = 5000;
export const EXTRA_LIFE_AT_COINS = 100;  // every 100 coins = +1 life

// ─────────────────────────────────────────────────────────────────────────────
// Lives + camera + view
// ─────────────────────────────────────────────────────────────────────────────
export const START_LIVES = 3;
export const CAM_LERP = 0.14;

// Render — wider view for SMB-style scrolling
export const VIEW_W = 320;
export const VIEW_H = 224;
export const LEVEL_HEIGHT_TILES = 14;    // 14 × 16 = 224

// ─────────────────────────────────────────────────────────────────────────────
// Palette — Base brand + SMB-inspired tones
// ─────────────────────────────────────────────────────────────────────────────
export const COLORS = {
  // Sky / atmosphere
  skyOver: '#5C94FC',          // overworld sky (Base-blue tinted)
  skyOverDeep: '#3D7BFF',
  skyUnder: '#050a16',         // underground void
  skyUnderDeep: '#020610',
  skyHigh: '#0a1428',          // sky world (above-clouds dark)
  skyHighDeep: '#050a16',
  skyCastle: '#16080a',        // castle deep red-black
  skyCastleDeep: '#0a0306',

  // Base brand
  baseBlue: '#0052FF',
  baseBlueDark: '#0040C0',
  baseBlueLight: '#3D7BFF',
  baseCyan: '#00D4FF',
  baseIvory: '#EEF4FF',
  baseMute: '#4F5A75',

  // Tiles — overworld
  ground: '#C84C0C',           // SMB-orange ground
  groundDark: '#7A2F08',
  groundEdge: '#FFB066',
  brick: '#C84C0C',
  brickDark: '#7A2F08',
  brickEdge: '#FFB066',
  question: '#FFB300',
  questionDark: '#B47800',
  questionEdge: '#FFE680',
  questionUsed: '#7A5A2A',
  pipe: '#00B040',             // SMB-green pipe
  pipeDark: '#005020',
  pipeEdge: '#7FE0A0',

  // Tiles — underground / castle
  groundUnder: '#1E5BD0',      // blue underground
  groundUnderDark: '#0A2A70',
  brickCastle: '#888888',      // grey stone
  brickCastleDark: '#3F3F3F',
  brickCastleEdge: '#C8C8C8',
  lava: '#FF4500',
  lavaDark: '#A11D00',
  lavaGlow: '#FFE680',

  // Sky world — cloud platforms
  cloudWhite: '#EEF4FF',
  cloudShadow: '#A8B8E0',
  cloudEdge: '#0040C0',

  // Player
  playerSkin: '#0052FF',
  playerDark: '#0040C0',
  playerLight: '#3D7BFF',
  playerEye: '#EEF4FF',
  fireOverlay: '#FFD23F',

  // Coins / shards
  coin: '#FFD23F',
  coinCore: '#FFE680',
  coinEdge: '#7A4D00',

  // Enemies
  goombaBody: '#FF4D6D',
  goombaDark: '#A11D3A',
  goombaEye: '#220a14',
  koopaShell: '#00B040',
  koopaShellDark: '#005020',
  koopaShellEdge: '#7FE0A0',
  koopaSkin: '#FFD23F',
  koopaSkinDark: '#7A5A00',
  piranhaBody: '#FF4D6D',
  piranhaDark: '#A11D3A',
  piranhaStem: '#00B040',
  piranhaStemDark: '#005020',
  bowserBody: '#00B040',
  bowserBack: '#FFB300',
  bowserDark: '#005020',
  bowserCrown: '#FFD23F',
  bowserEye: '#FF4D6D',

  // Projectiles / hazards
  fireball: '#FFD23F',
  fireballHot: '#FF4500',
  fireballCore: '#FFE680',
  bowserFire: '#FF4500',
  bowserFireHot: '#FFD23F',
  firebar: '#FFD23F',
  firebarHot: '#FF4500',

  // Items
  mushroomCap: '#FF4D6D',
  mushroomSpot: '#FFF5C0',
  mushroomStem: '#FFE680',
  fireFlowerPet: '#00D4FF',
  fireFlowerCore: '#FFD23F',

  // Misc
  bg: '#0a1428',
  bgDeep: '#050a16',
  shard: '#00D4FF',
  shardCore: '#EEF4FF',
  warn: '#FF4D6D',
  warnDark: '#A11D3A',
  gold: '#FFD23F',
  goldGlow: '#FFE680',
  portal: '#FFD23F',
  portalGlow: '#FFE680',
  spike: '#7B8AA8',
  spikeEdge: '#3F4D6E',
  axe: '#C8C8C8',
  axeBlade: '#EEF4FF',
  axeHandle: '#7A2F08',
  flagPole: '#A8B8E0',
  flagCloth: '#00D4FF',
} as const;
