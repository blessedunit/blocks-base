import {
  COLORS,
  FIREBAR_LENGTH,
  FIREBAR_SEG_RADIUS,
  KOOPA_W,
  PIRANHA_W,
  SHELL_W,
  TILE,
  VIEW_H,
  VIEW_W,
} from './constants';
import {
  AXE,
  BOWSER_A,
  BOWSER_B,
  BOWSER_FIRE,
  COIN_A,
  COIN_B,
  drawSprite,
  FIRE_FLOWER_A,
  FIRE_FLOWER_B,
  FIREBALL,
  FLAG_CLOTH,
  GOOMBA_A,
  GOOMBA_B,
  GOOMBA_DEAD,
  KOOPA_A,
  KOOPA_B,
  MUSHROOM,
  PIRANHA_A,
  PIRANHA_B,
  PLAYER_L_CROUCH,
  PLAYER_L_IDLE,
  PLAYER_L_JUMP,
  PLAYER_L_RUN_A,
  PLAYER_L_RUN_B,
  PLAYER_S_IDLE,
  PLAYER_S_JUMP,
  PLAYER_S_RUN_A,
  PLAYER_S_RUN_B,
  QUEEN,
  SHELL,
  SPIKE,
  STAR_A,
  STAR_B,
  PALETTE,
  type PaletteOverride,
} from './sprites';
import type { GameState } from './engine';
import type { LevelTheme, TileType } from './world';
import { getEquippedPalette } from './skins';

export interface RenderResult {
  scale: number;
  offsetX: number;
  offsetY: number;
  internalCanvas: HTMLCanvasElement;
}

// Internal logical canvas — game renders here, then blits scaled to target.
// Width is dynamic to match canvas aspect (fills screen); height is fixed.
let _internal: HTMLCanvasElement | null = null;
let _ictx: CanvasRenderingContext2D | null = null;
let _curW = VIEW_W;
function getInternal(w: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!_internal) {
    _internal = document.createElement('canvas');
    _internal.width = w;
    _internal.height = VIEW_H;
    _ictx = _internal.getContext('2d', { alpha: false });
    if (_ictx) _ictx.imageSmoothingEnabled = false;
    _curW = w;
  } else if (_internal.width !== w) {
    _internal.width = w;
    if (_ictx) _ictx.imageSmoothingEnabled = false;  // resetting size resets state
    _curW = w;
  }
  return { c: _internal, ctx: _ictx! };
}

// Currently-active internal width (read by engine for camera; updated by render()).
export function getViewW(): number { return _curW; }

// Background star field — cached per session
const stars: Array<{ x: number; y: number; r: number; tone: number }> = [];
function ensureStars() {
  if (stars.length) return;
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * (VIEW_H - 30),
      r: Math.random() < 0.18 ? 2 : 1,
      tone: Math.random() < 0.3 ? 1 : 0,
    });
  }
}

// Cloud silhouettes for overworld
const clouds: Array<{ x: number; y: number; w: number; h: number }> = [];
function ensureClouds() {
  if (clouds.length) return;
  for (let i = 0; i < 14; i++) {
    clouds.push({
      x: i * 120 + Math.random() * 40,
      y: 18 + Math.random() * 60,
      w: 28 + Math.random() * 16,
      h: 9 + Math.random() * 4,
    });
  }
}

// Cloud rendered as a cluster of Base-logo style rounded squares.
// Each cell: cyan outline + ivory body — reads as "Base brand" but in cloud shape.
function drawBaseCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const drawCell = (cx: number, cy: number, size: number) => {
    // Cyan outer ring
    ctx.fillStyle = COLORS.baseCyan;
    ctx.fillRect(cx, cy, size, size);
    // Ivory body
    ctx.fillStyle = COLORS.baseIvory;
    ctx.fillRect(cx + 1, cy + 1, size - 2, size - 2);
    // Inner Base-blue dot — logo accent
    ctx.fillStyle = COLORS.baseBlue;
    const dotSize = Math.max(2, Math.floor(size / 3));
    const dotX = cx + Math.floor((size - dotSize) / 2);
    const dotY = cy + Math.floor((size - dotSize) / 2);
    ctx.fillRect(dotX, dotY, dotSize, dotSize);
  };
  // 5 cells in cloud cluster pattern
  drawCell(x + 0,  y + 4, 6);
  drawCell(x + 5,  y + 0, 8);
  drawCell(x + 13, y - 1, 7);
  drawCell(x + 20, y + 1, 7);
  drawCell(x + 27, y + 5, 6);
}

// Sky gradient cache — pinned to (theme, ctx) since CanvasGradients are
// context-specific. The viewW doesn't matter (gradient is vertical only).
const gradCache = new WeakMap<CanvasRenderingContext2D, Map<LevelTheme, CanvasGradient>>();
function bgGradient(ctx: CanvasRenderingContext2D, theme: LevelTheme, _viewW: number): CanvasGradient {
  let perCtx = gradCache.get(ctx);
  if (!perCtx) { perCtx = new Map(); gradCache.set(ctx, perCtx); }
  const existing = perCtx.get(theme);
  if (existing) return existing;
  let topCol: string, botCol: string;
  if (theme === 'overworld') { topCol = COLORS.skyOverDeep; botCol = COLORS.skyOver; }
  else if (theme === 'underground') { topCol = COLORS.skyUnderDeep; botCol = COLORS.skyUnder; }
  else if (theme === 'sky') { topCol = COLORS.skyHighDeep; botCol = COLORS.skyHigh; }
  else { topCol = COLORS.skyCastleDeep; botCol = COLORS.skyCastle; }
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, topCol);
  grad.addColorStop(1, botCol);
  perCtx.set(theme, grad);
  return grad;
}

function drawBackground(ctx: CanvasRenderingContext2D, theme: LevelTheme, camX: number, now: number, viewW: number) {
  // Sky gradient — cached per (theme, viewW) so we don't allocate a new
  // CanvasGradient + addColorStop calls every frame on mobile.
  const grad = bgGradient(ctx, theme, viewW);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, VIEW_H);

  // Decoration per theme
  if (theme === 'overworld') {
    ensureClouds();
    ctx.globalAlpha = 0.9;
    for (const c of clouds) {
      const cx = (c.x - camX * 0.3) % (viewW + 80);
      const cxAdj = cx < -80 ? cx + viewW + 80 : cx;
      drawBaseCloud(ctx, cxAdj, c.y);
    }
    ctx.globalAlpha = 1;
    // Mountains parallax
    ctx.fillStyle = '#0A2A70';
    for (let i = 0; i < 8; i++) {
      const mx = (i * 110 - camX * 0.5) % (viewW + 110);
      const mxAdj = mx < -110 ? mx + viewW + 110 : mx;
      const my = VIEW_H - 60;
      ctx.beginPath();
      ctx.moveTo(mxAdj, my);
      ctx.lineTo(mxAdj + 40, my - 38);
      ctx.lineTo(mxAdj + 80, my);
      ctx.closePath();
      ctx.fill();
    }
  } else if (theme === 'underground') {
    // Just deep grad + faint cyan haze line
    ctx.fillStyle = COLORS.baseCyan;
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 14; i++) {
      const lx = (i * 90 - camX * 0.4) % (viewW + 60);
      const lxAdj = lx < -60 ? lx + viewW + 60 : lx;
      ctx.fillRect(lxAdj, 40 + i * 8, 60, 1);
    }
    ctx.globalAlpha = 1;
  } else if (theme === 'sky') {
    ensureStars();
    for (const s of stars) {
      const sx = (s.x - camX * 0.18) % (viewW + 16);
      const sxAdj = sx < 0 ? sx + viewW + 16 : sx;
      ctx.fillStyle = s.tone === 1 ? COLORS.baseCyan : COLORS.baseIvory;
      ctx.globalAlpha = s.tone === 1 ? 0.55 : 0.32;
      ctx.fillRect(sxAdj, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    // Cloud parallax (lighter, more numerous than overworld)
    ensureClouds();
    ctx.fillStyle = COLORS.cloudShadow;
    ctx.globalAlpha = 0.4;
    for (const c of clouds) {
      const cx = (c.x - camX * 0.2) % (viewW + 80);
      const cxAdj = cx < -80 ? cx + viewW + 80 : cx;
      ctx.fillRect(cxAdj, c.y + 100, c.w * 1.2, c.h * 0.8);
    }
    ctx.globalAlpha = 1;
  } else {
    // Castle — dark, with flickering torch glows
    const torch = 0.5 + 0.5 * Math.sin(now * 0.008);
    ctx.fillStyle = COLORS.fireballHot;
    ctx.globalAlpha = 0.05 + torch * 0.04;
    for (let i = 0; i < 6; i++) {
      const tx = (i * 80 - camX * 0.3) % (viewW + 80);
      const txAdj = tx < -80 ? tx + viewW + 80 : tx;
      ctx.fillRect(txAdj, 30 + i * 4, 30, 30);
    }
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile drawing — procedural, with one-shot bake cache. Each (type, theme[, var])
// is rendered once to an offscreen canvas of size TILE×TILE; subsequent draws
// just blit it via drawImage. Converts ~10 fillRects/tile into 1 drawImage.
// Animated tiles (question flash, lava, pipes per-side) still draw procedurally.
// ─────────────────────────────────────────────────────────────────────────────

const tileCache = new Map<string, HTMLCanvasElement>();

function makeTileCanvas(): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function bakedTile(key: string, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cached = tileCache.get(key);
  if (cached) return cached;
  const { c, ctx } = makeTileCanvas();
  paint(ctx);
  tileCache.set(key, c);
  return c;
}

function drawGroundTile(ctx: CanvasRenderingContext2D, x: number, y: number, theme: LevelTheme) {
  const baked = bakedTile('g:' + theme, (b) => {
    let body: string, dark: string, edge: string;
    if (theme === 'overworld' || theme === 'sky') {
      body = COLORS.ground; dark = COLORS.groundDark; edge = COLORS.groundEdge;
    } else if (theme === 'underground') {
      body = COLORS.groundUnder; dark = COLORS.groundUnderDark; edge = COLORS.baseCyan;
    } else {
      body = COLORS.brickCastle; dark = COLORS.brickCastleDark; edge = COLORS.brickCastleEdge;
    }
    b.fillStyle = body;
    b.fillRect(0, 0, TILE, TILE);
    b.fillStyle = dark;
    b.fillRect(0, TILE - 2, TILE, 2);
    b.fillRect(TILE - 2, 0, 2, TILE);
    b.fillStyle = edge;
    b.fillRect(0, 0, TILE, 2);
    b.fillRect(0, 0, 2, TILE);
    b.fillStyle = dark;
    b.fillRect(4, 4, 2, 2);
    b.fillRect(10, 8, 2, 2);
    b.fillRect(6, 10, 2, 2);
  });
  ctx.drawImage(baked, x, y);
}

function drawBrickTile(ctx: CanvasRenderingContext2D, x: number, y: number, theme: LevelTheme, used = false) {
  const baked = bakedTile('b:' + theme + (used ? ':u' : ''), (b) => {
    let body: string, dark: string, edge: string;
    if (theme === 'overworld') {
      body = COLORS.brick; dark = COLORS.brickDark; edge = COLORS.brickEdge;
    } else if (theme === 'underground') {
      body = COLORS.baseBlueLight; dark = COLORS.baseBlueDark; edge = COLORS.baseCyan;
    } else if (theme === 'sky') {
      body = COLORS.cloudWhite; dark = COLORS.cloudShadow; edge = COLORS.cloudEdge;
    } else {
      body = COLORS.brickCastle; dark = COLORS.brickCastleDark; edge = COLORS.brickCastleEdge;
    }
    if (used) {
      body = COLORS.questionUsed;
      dark = '#3F2A0F';
      edge = '#5C3F1A';
    }
    b.fillStyle = body;
    b.fillRect(0, 0, TILE, TILE);
    b.fillStyle = dark;
    b.fillRect(0, TILE - 2, TILE, 2);
    b.fillRect(TILE - 2, 0, 2, TILE);
    b.fillStyle = edge;
    b.fillRect(0, 0, TILE, 2);
    b.fillRect(0, 0, 2, TILE);
    b.fillStyle = dark;
    b.fillRect(0, 8, TILE, 1);
    b.fillRect(4, 0, 1, 8);
    b.fillRect(12, 8, 1, 8);
  });
  ctx.drawImage(baked, x, y);
}

function drawQuestionTile(ctx: CanvasRenderingContext2D, x: number, y: number, now: number) {
  const flash = (Math.floor(now / 200) % 4 === 0) ? 1 : 0;
  const baked = bakedTile('q:' + flash, (b) => {
    b.fillStyle = flash ? COLORS.questionEdge : COLORS.question;
    b.fillRect(0, 0, TILE, TILE);
    b.fillStyle = COLORS.questionDark;
    b.fillRect(0, TILE - 2, TILE, 2);
    b.fillRect(TILE - 2, 0, 2, TILE);
    b.fillStyle = COLORS.questionEdge;
    b.fillRect(0, 0, TILE, 2);
    b.fillRect(0, 0, 2, TILE);
    b.fillStyle = '#050a16';
    b.fillRect(5, 3, 6, 2);
    b.fillRect(11, 3, 2, 4);
    b.fillRect(7, 7, 6, 2);
    b.fillRect(7, 9, 2, 2);
    b.fillRect(7, 12, 2, 2);
  });
  ctx.drawImage(baked, x, y);
}

function drawPipeTile(ctx: CanvasRenderingContext2D, x: number, y: number, kind: TileType, warp = false) {
  const baked = bakedTile('p:' + kind + (warp ? ':w' : ''), (b) => {
    const body = warp ? '#3D7BFF' : COLORS.pipe;
    const dark = warp ? '#0040C0' : COLORS.pipeDark;
    const edge = warp ? COLORS.baseCyan : COLORS.pipeEdge;
    b.fillStyle = body;
    b.fillRect(0, 0, TILE, TILE);
    b.fillStyle = dark;
    if (kind === 'pipe_tl' || kind === 'pipe_bl' || kind === 'pipe_warp_tl') {
      b.fillRect(TILE - 2, 0, 2, TILE);
    }
    if (kind === 'pipe_tr' || kind === 'pipe_br' || kind === 'pipe_warp_tr') {
      b.fillRect(0, 0, 2, TILE);
    }
    b.fillStyle = edge;
    if (kind === 'pipe_tl' || kind === 'pipe_tr' || kind === 'pipe_warp_tl' || kind === 'pipe_warp_tr') {
      b.fillRect(0, 0, TILE, 4);
      b.fillStyle = dark;
      b.fillRect(0, 3, TILE, 1);
    }
    if (kind === 'pipe_tl' || kind === 'pipe_warp_tl') {
      b.fillStyle = edge;
      b.fillRect(0, 0, 3, TILE);
    }
    if (kind === 'pipe_tr' || kind === 'pipe_warp_tr') {
      b.fillStyle = edge;
      b.fillRect(TILE - 3, 0, 3, TILE);
    }
    if (kind === 'pipe_bl') {
      b.fillStyle = edge;
      b.fillRect(0, 0, 3, TILE);
    }
    if (kind === 'pipe_br') {
      b.fillStyle = edge;
      b.fillRect(TILE - 3, 0, 3, TILE);
    }
  });
  ctx.drawImage(baked, x, y);
}

function drawLavaTile(ctx: CanvasRenderingContext2D, x: number, y: number, now: number) {
  ctx.fillStyle = COLORS.lavaDark;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = COLORS.lava;
  const wob = Math.sin(now * 0.008 + x * 0.04) * 1.5;
  ctx.fillRect(x, y + 2 + wob, TILE, TILE - 4);
  ctx.fillStyle = COLORS.lavaGlow;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 3; i++) {
    const wx = (Math.sin(now * 0.005 + i + x * 0.1) * 6 + 8);
    ctx.fillRect(x + wx, y + 4 + i * 4, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawSpikeTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawSprite(ctx, SPIKE, x, y + TILE / 2, 1);
}

function drawTiles(ctx: CanvasRenderingContext2D, s: GameState, now: number, viewW: number) {
  const startTX = Math.max(0, Math.floor(s.camX / TILE));
  const endTX = Math.min(s.level.width, Math.ceil((s.camX + viewW) / TILE));
  const startTY = Math.max(0, Math.floor(s.camY / TILE));
  const endTY = Math.min(s.level.height, Math.ceil((s.camY + VIEW_H) / TILE));

  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const t = s.level.tiles[ty][tx];
      if (t === 'empty') continue;
      const sx = Math.floor(tx * TILE - s.camX);
      const sy = Math.floor(ty * TILE - s.camY);

      // Block bump offset
      let bumpDY = 0;
      for (const bp of s.blockBumps) {
        if (bp.tx === tx && bp.ty === ty) {
          if (bp.frame < 5) bumpDY = -bp.frame * 1.6;
          else bumpDY = -((10 - bp.frame) * 1.6);
        }
      }
      const drawY = sy + Math.floor(bumpDY);

      switch (t) {
        case 'ground':
          drawGroundTile(ctx, sx, drawY, s.level.theme);
          break;
        case 'brick':
          drawBrickTile(ctx, sx, drawY, s.level.theme);
          break;
        case 'brick_coin':
          drawBrickTile(ctx, sx, drawY, s.level.theme);
          break;
        case 'question':
          drawQuestionTile(ctx, sx, drawY, now);
          break;
        case 'question_used':
          drawBrickTile(ctx, sx, drawY, s.level.theme, true);
          break;
        case 'spike':
          drawSpikeTile(ctx, sx, drawY);
          break;
        case 'lava':
          drawLavaTile(ctx, sx, drawY, now);
          break;
        case 'pipe_tl':
        case 'pipe_tr':
        case 'pipe_bl':
        case 'pipe_br':
          drawPipeTile(ctx, sx, drawY, t, false);
          break;
        case 'pipe_warp_tl':
        case 'pipe_warp_tr':
          drawPipeTile(ctx, sx, drawY, t, true);
          break;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entities
// ─────────────────────────────────────────────────────────────────────────────

function playerSprite(s: GameState) {
  const isLarge = s.pSize !== 'small';
  if (s.pCrouching) return PLAYER_L_CROUCH;
  if (!s.pOnGround) return isLarge ? PLAYER_L_JUMP : PLAYER_S_JUMP;
  if (Math.abs(s.pvx) > 0.5) {
    const frame = Math.floor(s.pAnimT / 5) % 2;
    return frame === 0
      ? (isLarge ? PLAYER_L_RUN_A : PLAYER_S_RUN_A)
      : (isLarge ? PLAYER_L_RUN_B : PLAYER_S_RUN_B);
  }
  return isLarge ? PLAYER_L_IDLE : PLAYER_S_IDLE;
}

function playerPalette(s: GameState, now: number): PaletteOverride {
  // Star mode overrides everything with a rainbow cycle.
  if (s.pStarT > 0) {
    const rainbow = ['#FF4D6D', '#FFD23F', '#00B040', '#00D4FF', '#0052FF', '#7B5BFF'];
    const idx = Math.floor(now / 60) % rainbow.length;
    const next = rainbow[(idx + 1) % rainbow.length];
    return {
      B: rainbow[idx],
      D: next,
      L: COLORS.baseIvory,
      I: '#050a16',
    };
  }
  if (s.pSize === 'fire') {
    const pulse = Math.floor(now / 120) % 2 === 0;
    return {
      B: pulse ? COLORS.fireOverlay : COLORS.baseIvory,
      D: '#A06C00',
      L: COLORS.goldGlow,
      I: '#FF4500',
    };
  }
  // Default state — use the user's currently equipped skin (empty for default).
  return getEquippedPalette();
}

function drawPlayer(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  // Hurt blink
  if (s.pHurtT > 0 && (s.pHurtT >> 1) & 1) return;
  // Transformation flash — slight flicker
  if (s.pTransformT > 0 && (s.pTransformT >> 1) & 1) {
    // skip every other frame for sparkle
  }

  const sx = Math.floor(s.px - s.camX) - (s.pSize === 'small' ? 0 : 0);
  const sy = Math.floor(s.py - s.camY);
  const sprite = playerSprite(s);
  drawSprite(ctx, sprite, sx, sy, 1, s.pFacing < 0, playerPalette(s, now));
}

function drawGoombas(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  for (const g of s.goombas) {
    const sx = Math.floor(g.x - s.camX);
    const sy = Math.floor(g.y - s.camY);
    if (!g.alive) {
      if (now - g.squashedAt > 400) continue;
      drawSprite(ctx, GOOMBA_DEAD, sx, sy, 1, g.dir > 0);
      continue;
    }
    const frame = Math.floor(now / 200) % 2;
    drawSprite(ctx, frame === 0 ? GOOMBA_A : GOOMBA_B, sx, sy, 1, g.dir > 0);
  }
}

function drawKoopas(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  for (const k of s.koopas) {
    if (!k.alive) continue;
    const sx = Math.floor(k.x - s.camX);
    const sy = Math.floor(k.y - s.camY);
    if (k.state === 'walking') {
      const frame = Math.floor(now / 180) % 2;
      drawSprite(ctx, frame === 0 ? KOOPA_A : KOOPA_B, sx, sy, 1, k.dir > 0);
    } else {
      drawSprite(ctx, SHELL, sx, sy, 1);
      if (k.state === 'shell_slide') {
        // Motion lines behind shell
        ctx.fillStyle = COLORS.baseIvory;
        ctx.globalAlpha = 0.4;
        const offX = k.dir > 0 ? -8 : SHELL_W;
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(sx + offX + (k.dir > 0 ? -i * 3 : i * 3), sy + 2 + i * 3, 4, 1);
        }
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawParatroopas(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  for (const p of s.paratroopas) {
    if (!p.alive) continue;
    const sx = Math.floor(p.x - s.camX);
    const sy = Math.floor(p.y - s.camY);
    const frame = Math.floor(now / 120) % 2;
    drawSprite(ctx, frame === 0 ? KOOPA_A : KOOPA_B, sx, sy, 1, p.dir > 0);
    // Wings — flap with frame
    ctx.fillStyle = COLORS.cloudWhite;
    const wOpen = frame === 0;
    const wx = sx + (p.dir > 0 ? KOOPA_W - 2 : -4);
    ctx.fillRect(wx, sy + 2, wOpen ? 6 : 3, 4);
    ctx.fillRect(wx - 2, sy + (wOpen ? 4 : 2), wOpen ? 4 : 5, 3);
    ctx.fillStyle = '#050a16';
    ctx.fillRect(wx, sy + 2, 1, 4);
  }
}

function drawPiranhas(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  for (const pl of s.piranhas) {
    if (!pl.alive) continue;
    if (pl.state === 'hidden') continue;
    // Clip drawing to area above pipe top — only the visible part shows
    const sx = Math.floor(pl.x + TILE - PIRANHA_W / 2 - s.camX);   // centered on 2-tile-wide pipe
    const syRaw = Math.floor(pl.visibleY - s.camY);
    const pipeTopScreenY = Math.floor((pl.y + TILE) - s.camY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx - 2, syRaw - 2, PIRANHA_W + 4, pipeTopScreenY - syRaw + 4);
    ctx.clip();
    const frame = Math.floor(now / 180) % 2;
    drawSprite(ctx, frame === 0 ? PIRANHA_A : PIRANHA_B, sx, syRaw, 1);
    ctx.restore();
  }
}

function drawFireBars(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  for (const fb of s.firebars) {
    const cx = Math.floor(fb.cx - s.camX);
    const cy = Math.floor(fb.cy - s.camY);
    // Pivot center
    ctx.fillStyle = COLORS.firebar;
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
    ctx.fillStyle = COLORS.firebarHot;
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    // Segments
    for (let i = 1; i <= FIREBAR_LENGTH; i++) {
      const ex = cx + Math.cos(fb.angle) * (FIREBAR_SEG_RADIUS * 2) * i;
      const ey = cy + Math.sin(fb.angle) * (FIREBAR_SEG_RADIUS * 2) * i;
      const flick = (Math.floor(now / 100) + i) % 2 === 0;
      ctx.fillStyle = flick ? COLORS.firebar : COLORS.firebarHot;
      ctx.beginPath();
      ctx.arc(ex, ey, FIREBAR_SEG_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.goldGlow;
      ctx.beginPath();
      ctx.arc(ex, ey, FIREBAR_SEG_RADIUS - 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBowser(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  if (!s.bowser || !s.bowser.alive) return;
  const b = s.bowser;
  if (b.hurtT > 0 && (b.hurtT >> 1) & 1) return;
  const sx = Math.floor(b.x - s.camX);
  const sy = Math.floor(b.y - s.camY);
  const frame = Math.floor(now / 220) % 2;
  drawSprite(ctx, frame === 0 ? BOWSER_A : BOWSER_B, sx, sy, 1, b.dir > 0);
  // HP bar above
  const hpRatio = Math.max(0, b.hp / 5);
  ctx.fillStyle = '#050a16';
  ctx.fillRect(sx - 2, sy - 6, 28, 4);
  ctx.fillStyle = COLORS.warn;
  ctx.fillRect(sx, sy - 5, Math.floor(24 * hpRatio), 2);
}

function drawFireballs(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  for (const f of s.fireballs) {
    const sx = Math.floor(f.x - s.camX);
    const sy = Math.floor(f.y - s.camY);
    const spin = Math.floor(now / 60) % 4;
    ctx.save();
    ctx.translate(sx + 3, sy + 3);
    ctx.rotate((spin * Math.PI) / 2);
    drawSprite(ctx, FIREBALL, -3, -3, 1);
    ctx.restore();
  }
}

function drawBowserFires(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const bf of s.bowserFires) {
    const sx = Math.floor(bf.x - s.camX);
    const sy = Math.floor(bf.y - s.camY);
    drawSprite(ctx, BOWSER_FIRE, sx, sy, 1, bf.vx > 0);
  }
}

function drawItems(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  for (const it of s.items) {
    if (it.taken) continue;
    const sx = Math.floor(it.x - s.camX);
    const sy = Math.floor(it.y - s.camY);
    if (it.kind === 'mushroom') {
      drawSprite(ctx, MUSHROOM, sx, sy, 1);
    } else if (it.kind === 'fire_flower') {
      const frame = Math.floor(now / 140) % 2;
      drawSprite(ctx, frame === 0 ? FIRE_FLOWER_A : FIRE_FLOWER_B, sx, sy, 1);
    } else if (it.kind === 'star') {
      const frame = Math.floor(now / 100) % 2;
      // Star pulse halo
      ctx.fillStyle = COLORS.gold;
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(now * 0.012);
      ctx.beginPath();
      ctx.arc(sx + 7, sy + 7, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      drawSprite(ctx, frame === 0 ? STAR_A : STAR_B, sx, sy, 1);
    }
  }
}

function drawCoinPops(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  for (const cp of s.coinPops) {
    const sx = Math.floor(cp.x - s.camX) - 4;
    const sy = Math.floor(cp.y - s.camY);
    if (cp.text) {
      // Score-pop floating text — uses VT323 (smoother, smaller-feeling than
      // Press Start 2P). Fades out as life decreases.
      const a = Math.min(1, cp.life / 28);
      ctx.globalAlpha = a;
      ctx.font = '12px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Soft dark drop-shadow for legibility on any background
      ctx.fillStyle = 'rgba(5,10,22,0.85)';
      ctx.fillText(cp.text, sx + 5, sy + 1);
      ctx.fillStyle = cp.color ?? '#FFD23F';
      ctx.fillText(cp.text, sx + 5, sy);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    } else {
      const frame = Math.floor(now / 90) % 2;
      drawSprite(ctx, frame === 0 ? COIN_A : COIN_B, sx, sy, 1);
    }
  }
}

function drawFreeCoins(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  for (const c of s.freeCoins) {
    if (c.taken) continue;
    const bob = Math.sin(now * 0.004 + c.id * 0.7) * 1.5;
    const sx = Math.floor(c.x - s.camX) - 4;
    const sy = Math.floor(c.y - 6 - s.camY + bob);
    const frame = Math.floor(now / 140) % 2;
    drawSprite(ctx, frame === 0 ? COIN_A : COIN_B, sx, sy, 1);
  }
}

function drawBrickDebris(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const d of s.brickDebris) {
    const sx = Math.floor(d.x - s.camX);
    const sy = Math.floor(d.y - s.camY);
    const a = Math.max(0, Math.min(1, d.life / 40));
    ctx.globalAlpha = a;
    ctx.fillStyle = COLORS.brick;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(d.rot);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.fillStyle = COLORS.brickDark;
    ctx.fillRect(-3, 1, 6, 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawAxe(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  if (!s.level.axe) return;
  const sx = Math.floor(s.level.axe.x + 2 - s.camX);
  const sy = Math.floor(s.level.axe.y + 2 - s.camY);
  const bob = Math.sin(now * 0.005) * 1.2;
  drawSprite(ctx, AXE, sx, sy + bob, 1);
  // Glow
  ctx.fillStyle = COLORS.gold;
  ctx.globalAlpha = 0.2 + 0.15 * Math.sin(now * 0.006);
  ctx.beginPath();
  ctx.arc(sx + 6, sy + 6, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFlag(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  if (!s.level.flag) return;
  // flag.y marks the BASE of the pole (player's walking level).
  // Pole extends UP from the base.
  const poleH = 8 * TILE;
  const fx = Math.floor(s.level.flag.x + 6 - s.camX);
  const baseY = Math.floor(s.level.flag.y + TILE - s.camY);    // base sits at top of ground tile
  const topY = baseY - poleH;
  // Pole
  ctx.fillStyle = COLORS.flagPole;
  ctx.fillRect(fx, topY, 2, poleH);
  // Gold pole ball at top
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(fx - 2, topY, 6, 4);
  // Cloth waves at top
  const wave = Math.floor(now / 220) % 2;
  drawSprite(ctx, FLAG_CLOTH, fx - 9, topY + 4 + wave, 1);
}

function drawParticles(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const p of s.particles) {
    const sx = Math.floor(p.x - s.camX);
    const sy = Math.floor(p.y - s.camY);
    ctx.fillStyle = p.color;
    const a = p.life / p.maxLife;
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillRect(sx, sy, Math.max(1, p.size), Math.max(1, p.size));
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx: CanvasRenderingContext2D, s: GameState, viewW: number) {
  ctx.fillStyle = COLORS.baseIvory;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  // Lives
  ctx.fillText('LIFE', 4, 4);
  for (let i = 0; i < Math.min(5, s.lives); i++) {
    ctx.fillStyle = COLORS.baseCyan;
    ctx.fillRect(4 + i * 7, 14, 5, 5);
  }
  // Score (center)
  ctx.fillStyle = COLORS.baseIvory;
  ctx.textAlign = 'center';
  ctx.fillText('SCORE', viewW / 2, 4);
  ctx.fillStyle = COLORS.coin;
  ctx.fillText(String(s.score).padStart(6, '0'), viewW / 2, 14);
  // Time (right)
  ctx.fillStyle = COLORS.baseIvory;
  ctx.textAlign = 'right';
  ctx.fillText('TIME', viewW - 4, 4);
  ctx.fillStyle = COLORS.baseCyan;
  const totalSec = Math.floor(s.runTimeMs / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  ctx.fillText(`${mm}:${ss}`, viewW - 4, 14);
  // Level name (bottom-center on ready)
  if (s.status === 'ready') {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.baseIvory;
    ctx.fillText(s.level.tag.toUpperCase(), viewW / 2, VIEW_H - 38);
    ctx.fillStyle = COLORS.baseCyan;
    ctx.fillText('TAP TO PLAY', viewW / 2, VIEW_H - 22);
  }
  ctx.textAlign = 'left';
}

// Small pixel heart (≈7×6) for the rescue cutscene.
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number, scale = 1) {
  const rows = [
    '.XX.XX.',
    'XXXXXXX',
    'XXXXXXX',
    '.XXXXX.',
    '..XXX..',
    '...X...',
  ];
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = '#FF4D6D';
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] === 'X') ctx.fillRect(Math.floor(x + c * scale), Math.floor(y + r * scale), scale, scale);
    }
  }
  ctx.globalAlpha = 1;
}

// Rescue cutscene — Queen stands beside the player while hearts float up.
function drawRescue(ctx: CanvasRenderingContext2D, s: GameState, now: number) {
  const qx = Math.floor(s.queenX - s.camX);
  const qy = Math.floor(s.queenY - s.camY) + Math.round(Math.sin(now * 0.004) * 2);
  drawSprite(ctx, QUEEN, qx, qy, 1);
  // Hearts rising between player and queen
  const midX = (s.px + s.queenX) / 2 - s.camX;
  const baseY = s.py - s.camY;
  for (let i = 0; i < 7; i++) {
    const t = ((now * 0.0009) + i / 7) % 1;       // 0..1 lifecycle per heart
    const hy = baseY - 2 - t * 70;
    const hx = midX + Math.sin(now * 0.003 + i * 1.4) * 16 + (i - 3) * 5;
    drawHeart(ctx, hx, hy, 1 - t);
  }
}

export function render(targetCtx: CanvasRenderingContext2D, s: GameState, now: number, canvasW: number, canvasH: number) {
  // Compute internal canvas width to match canvas aspect → no letterbox.
  // Keep height fixed (VIEW_H) so tile sizes stay consistent.
  const aspect = canvasW / Math.max(1, canvasH);
  let internalW = Math.max(VIEW_W, Math.ceil(VIEW_H * aspect));
  // Round to even number for cleaner integer scaling
  if (internalW % 2 !== 0) internalW += 1;
  const { c: internal, ctx } = getInternal(internalW);

  drawBackground(ctx, s.level.theme, s.camX, now, internalW);
  drawTiles(ctx, s, now, internalW);
  drawFreeCoins(ctx, s, now);
  drawCoinPops(ctx, s, now);
  drawItems(ctx, s, now);
  drawBrickDebris(ctx, s);
  drawGoombas(ctx, s, now);
  drawKoopas(ctx, s, now);
  drawParatroopas(ctx, s, now);
  drawPiranhas(ctx, s, now);
  drawFireBars(ctx, s, now);
  drawAxe(ctx, s, now);
  drawFlag(ctx, s, now);
  drawBowser(ctx, s, now);
  drawFireballs(ctx, s, now);
  drawBowserFires(ctx, s);
  drawPlayer(ctx, s, now);
  drawParticles(ctx, s);
  if (s.status === 'rescue') drawRescue(ctx, s, now);
  drawHud(ctx, s, internalW);

  // Fit-inside (letterbox) — preserves the game's aspect on any screen. The top
  // letterbox area is painted with a single continuous gradient that fades from
  // deep space at the very top into the theme's exact sky-top colour at the
  // game's edge, so the seam where the playfield begins is invisible.
  targetCtx.imageSmoothingEnabled = false;
  const fitScale = Math.min(canvasW / internalW, canvasH / VIEW_H);
  const outW = internalW * fitScale;
  const outH = VIEW_H * fitScale;
  const ox = Math.floor((canvasW - outW) / 2);
  // Game sits in the lower-middle of the viewport — black void above and below.
  // Lifted slightly compared to the previous near-bottom anchor so the
  // playfield reads more centrally on phone.
  const portraitGap = canvasH - outH;
  const RESERVE_BELOW = 100;
  const oy = portraitGap > 4
    ? Math.max(0, Math.min(Math.floor(portraitGap * 0.62), portraitGap - RESERVE_BELOW))
    : 0;

  // Top extension — plain black. Matches the void below the platform so the
  // playfield floats in solid darkness.
  if (oy > 0) {
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, 0, canvasW, oy);
  }

  // Below the playfield — pure black void (platform appears to float above it).
  const bottomY = oy + outH;
  const bottomH = canvasH - bottomY;
  if (bottomH > 0) {
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, bottomY, canvasW, bottomH);
  }
  // Side bands (rare in portrait, but handle landscape edge cases) — also black
  if (ox > 0) {
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, oy, ox, outH);
    targetCtx.fillRect(canvasW - ox, oy, ox, outH);
  }

  targetCtx.drawImage(internal, ox, oy, outW, outH);
}

// Standalone draw for menus — animated hero cube
export function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number) {
  const frame = Math.floor(t / 380) % 4;
  const sprite =
    frame === 0 ? PLAYER_S_IDLE :
    frame === 1 ? PLAYER_S_RUN_A :
    frame === 2 ? PLAYER_S_IDLE :
    PLAYER_S_RUN_B;
  drawSprite(ctx, sprite, x, y, scale);
}

export { PALETTE };
