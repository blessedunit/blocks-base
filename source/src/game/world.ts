// Level data — string tilemaps built programmatically for accurate placement.
//
// Each tile is 16×16 px. Levels are 14 rows tall; row 12-13 = ground level.
// Player jump apex from row-12 ground reaches row 8 — that's the bump-target row.
// Standing on a row-8 brick lets the player reach row 4 with a hop.
//
// Tile chars (used by parser):
//   ' '  empty   '#' ground   '=' brick   'B' brick+coin   '?' question(coin)
//   'M' question(mushroom)   '*' question(fire-flower)   'S' question(star — 10s invincibility)
//   '^' spike   'L' lava
//   '['  pipe top-L   ']'  pipe top-R   '('  pipe body-L   ')'  pipe body-R
//   '<'  warp top-L   '>'  warp top-R
//   'P'  piranha anchor (empty tile, plant rises here)
//   'g' goomba   'k' koopa   'q' paratroopa
//   'X'  fire-bar pivot   'W'  bowser spawn   'A'  axe   'F'  flag
//   'c'  free coin pickup

import { TILE } from './constants';

export type LevelTheme = 'overworld' | 'underground' | 'sky' | 'castle';

export interface LevelData {
  name: string;
  tag: string;
  theme: LevelTheme;
  music: 'overworld' | 'underground' | 'sky' | 'castle';
  map: string[];
  // Castle clue shown after clearing a non-final castle (1-4 / 2-4 / 3-4).
  hint?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid builder helpers
// ─────────────────────────────────────────────────────────────────────────────

function emptyGrid(w: number, h: number): string[] {
  return Array.from({ length: h }, () => ' '.repeat(w));
}

function put(grid: string[], col: number, row: number, s: string) {
  if (row < 0 || row >= grid.length) return;
  const line = grid[row];
  const left = line.substring(0, col);
  const right = line.substring(col + s.length);
  grid[row] = (left + s + right).substring(0, line.length);
}

function fillRow(grid: string[], row: number, ch: string, from = 0, to = grid[row]?.length ?? 0) {
  if (row < 0 || row >= grid.length) return;
  let line = grid[row];
  for (let i = from; i < to && i < line.length; i++) {
    line = line.substring(0, i) + ch + line.substring(i + 1);
  }
  grid[row] = line;
}

// Place a pipe at given column with given pipe-top row and total height.
// E.g. pipe(grid, 28, 10, 2) → top at row 10, body at row 11 (2-tall).
function pipe(grid: string[], col: number, topRow: number, height: number, withPiranha = false) {
  put(grid, col, topRow, '[]');
  for (let r = topRow + 1; r < topRow + height; r++) {
    put(grid, col, r, '()');
  }
  if (withPiranha) put(grid, col, topRow - 1, 'P ');
}

// Build a brick staircase ascending right from (col, baseRow) for `steps` steps.
// Each step is 1 tile taller than the previous (column adds 1, row drops 1).
function stairUp(grid: string[], col: number, baseRow: number, steps: number) {
  for (let i = 0; i < steps; i++) {
    for (let r = baseRow - i; r <= baseRow; r++) {
      put(grid, col + i, r, '=');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1-1 — Boot Up (overworld)
// Pacing: spawn → first goomba → coin row → ?-row with mushroom →
// pipe gauntlet → piranha pipe → pit gap → brick wall puzzle → staircase →
// koopa cluster → final pit → ascending stair → flag.
// ─────────────────────────────────────────────────────────────────────────────
function buildL1_1(): LevelData {
  const W = 200;
  const H = 14;
  const g = emptyGrid(W, H);

  // Ground rows 12-13 with pits
  const pits: Array<[number, number]> = [
    [60, 62],    // 3-wide pit
    [98, 101],   // 4-wide pit
    [132, 134],  // 3-wide pit
    [165, 168],  // 4-wide pit (final hop before flag)
  ];
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, '#', 0, W);
  for (const [a, b] of pits) {
    for (let c = a; c <= b; c++) {
      put(g, c, 12, ' ');
      put(g, c, 13, ' ');
    }
  }

  // ── Intro section
  put(g, 15, 11, 'g');                       // first goomba (close to spawn)
  put(g, 20, 11, 'g');                       // second goomba

  // First coin row in air
  put(g, 22, 8, 'ccc');

  // First ?-block formation: `?M?` — middle is mushroom
  put(g, 27, 8, '?M?');
  put(g, 31, 11, 'g');                       // goomba under ?-blocks

  // Brick wall + ?-block at row 4 (high — needs stepping stone)
  put(g, 32, 4, '=B?');

  // 2-tall pipe + goombas
  pipe(g, 38, 10, 2);
  put(g, 42, 11, 'g');
  put(g, 44, 11, 'g');

  // Higher pipe + koopas
  pipe(g, 46, 9, 3);
  put(g, 51, 11, 'k');
  put(g, 53, 11, 'g');

  // ── Mid section: piranha pipe + brick wall
  pipe(g, 57, 9, 3, true);                   // piranha pipe (3-tall) — moved over 2 cols

  // After pit 60-62: row of 3 coins + enemies
  put(g, 64, 8, 'c c c');
  put(g, 66, 11, 'g');
  put(g, 69, 11, 'k');

  // Brick + ?-block sandwich at row 4 (high)
  put(g, 70, 4, '==B?M?B==');

  // Brick wall at row 8 — break-or-jump
  put(g, 73, 8, '=====');
  put(g, 78, 11, 'g');
  put(g, 82, 11, 'k');

  // Floating brick platforms over pit 98-101
  put(g, 88, 8, '====');
  put(g, 94, 6, '====');                     // higher platform
  put(g, 93, 11, 'g');                       // goomba below platforms

  // ── After-pit section: koopa cluster
  put(g, 104, 11, 'k');
  put(g, 107, 11, 'k');
  put(g, 110, 11, 'g');
  put(g, 113, 11, 'g');

  // ?-block ladder + fire flower + star secret
  put(g, 114, 8, '?B*BS');                   // fire-flower mid, star at right
  put(g, 120, 4, '====');                    // high brick platform

  // Tall piranha pipe before final pit
  pipe(g, 127, 9, 3, true);

  // After pit 132-134: enemy patrol
  put(g, 137, 11, 'g');
  put(g, 140, 11, 'k');
  put(g, 143, 11, 'g');

  // ── Final approach: ascending staircase
  stairUp(g, 146, 11, 5);                    // 5-step stair up (moved right)
  put(g, 154, 11, 'g');
  put(g, 158, 11, 'k');
  put(g, 162, 11, 'g');

  // Final stair to flag
  stairUp(g, 178, 11, 4);                    // 4-step ascending platform
  put(g, 188, 11, 'F');                      // flag pole base at path level

  return {
    name: 'Boot Up',
    tag: '1-1 / cold start',
    theme: 'overworld',
    music: 'overworld',
    map: g,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1-2 — Underground
// Brick ceiling, coin clusters in formations, 2 piranha pipes, tight pacing.
// ─────────────────────────────────────────────────────────────────────────────
function buildL1_2(): LevelData {
  const W = 200;
  const H = 14;
  const g = emptyGrid(W, H);

  // Brick ceiling (rows 0-1) and ground (rows 12-13)
  fillRow(g, 0, '#', 0, W);
  fillRow(g, 1, '#', 0, W);
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, '#', 0, W);
  // Side walls
  for (let r = 2; r <= 11; r++) {
    put(g, 0, r, '#');
    put(g, W - 1, r, '#');
  }

  // Coin clusters — diamond patterns
  const diamond = (col: number, row: number) => {
    put(g, col + 1, row - 1, 'c');
    put(g, col, row, 'ccc');
    put(g, col + 1, row + 1, 'c');
  };
  diamond(7, 6);
  diamond(20, 7);
  diamond(33, 6);

  // Brick formation with hidden coin
  put(g, 14, 7, '======');
  put(g, 14, 8, 'B B B');

  // First piranha pipe — short enough to jump over (top at row 9, 3 tall)
  pipe(g, 47, 9, 3, true);

  // Mid-section: floating platforms with coins — decorative, not blocking
  put(g, 60, 8, '====');
  put(g, 70, 9, '====');
  put(g, 80, 8, '====');
  put(g, 90, 9, '======');
  put(g, 100, 8, '====');

  // Enemies at ground — denser patrols
  put(g, 22, 11, 'g');
  put(g, 26, 11, 'g');
  put(g, 32, 11, 'k');
  put(g, 38, 11, 'g');
  put(g, 42, 11, 'k');
  put(g, 55, 11, 'g');
  put(g, 65, 11, 'g');
  put(g, 70, 11, 'k');
  put(g, 76, 11, 'g');
  put(g, 85, 11, 'k');
  put(g, 93, 11, 'g');
  put(g, 100, 11, 'g');
  put(g, 106, 11, 'k');
  put(g, 124, 11, 'g');
  put(g, 130, 11, 'k');
  put(g, 135, 11, 'g');
  put(g, 148, 11, 'g');
  put(g, 155, 11, 'k');
  put(g, 162, 11, 'g');
  put(g, 170, 11, 'k');
  put(g, 175, 11, 'g');

  // Second piranha pipe — short
  pipe(g, 115, 9, 3, true);

  // Power-up block — fire flower
  put(g, 120, 8, '*');

  // Coin rooms (rows 4-5)
  put(g, 140, 4, 'c c c c c');
  put(g, 140, 5, '=========');

  put(g, 160, 7, '====B=B====');

  // Final stretch
  pipe(g, 180, 9, 4);                          // exit pipe (no piranha)

  // Flag
  put(g, 196, 11, 'F');

  return {
    name: 'Underground',
    tag: '1-2 / deep stack',
    theme: 'underground',
    music: 'underground',
    map: g,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1-3 — Sky Bridge (athletic)
// Cloud platforms over death pit. Paratroopas + scattered coin clusters.
// Falling = death (no floor).
// ─────────────────────────────────────────────────────────────────────────────
function buildL1_3(): LevelData {
  const W = 200;
  const H = 14;
  const g = emptyGrid(W, H);

  // Tiny start platform
  for (let c = 0; c <= 8; c++) {
    put(g, c, 12, '#');
    put(g, c, 13, '#');
  }
  put(g, 6, 11, 'g');

  // Floating cloud-brick platforms — gaps tuned for run-jump reach (3-4 tiles max).
  const platforms: Array<{ col: number; row: number; len: number; enemy?: string }> = [
    { col: 12, row: 11, len: 4, enemy: 'g' },
    { col: 19, row: 10, len: 3, enemy: 'q' },
    { col: 26, row: 11, len: 3, enemy: 'k' },
    { col: 32, row: 10, len: 4, enemy: 'q' },
    { col: 40, row: 11, len: 4, enemy: 'g' },
    { col: 48, row: 10, len: 3, enemy: 'q' },
    { col: 55, row: 11, len: 5, enemy: 'k' },
    { col: 64, row: 10, len: 3, enemy: 'q' },
    { col: 71, row: 11, len: 4, enemy: 'k' },
    { col: 79, row: 10, len: 3, enemy: 'q' },
    { col: 86, row: 11, len: 4, enemy: 'g' },
    { col: 93, row: 9,  len: 4, enemy: 'q' },     // higher platform
    { col: 101, row: 11, len: 5, enemy: 'g' },
    { col: 110, row: 10, len: 4, enemy: 'q' },
    { col: 117, row: 11, len: 4, enemy: 'k' },
    { col: 124, row: 10, len: 3, enemy: 'q' },
    { col: 131, row: 11, len: 5, enemy: 'g' },
    { col: 139, row: 10, len: 3, enemy: 'q' },
    { col: 146, row: 11, len: 6, enemy: 'k' },
    { col: 155, row: 10, len: 3, enemy: 'q' },
    { col: 162, row: 11, len: 5, enemy: 'g' },
    { col: 170, row: 10, len: 4, enemy: 'q' },
    { col: 178, row: 11, len: 12 },                // final wide landing
  ];

  for (const p of platforms) {
    for (let i = 0; i < p.len; i++) {
      put(g, p.col + i, p.row, '=');
    }
    if (p.enemy) put(g, p.col + Math.floor(p.len / 2), p.row - 1, p.enemy);
  }

  // Coins above high platforms (collect during jump)
  put(g, 33, 9, 'cc');
  put(g, 65, 9, 'cc');
  put(g, 94, 8, 'ccc');
  put(g, 125, 9, 'cc');
  put(g, 171, 9, 'cc');

  // Flag pole base anchored at row 10 — pole rises from above the platform
  // (player walks on row 11 platform tiles). flag.y row 10 → pole base = top of row 11.
  put(g, 188, 10, 'F');

  return {
    name: 'Sky Bridge',
    tag: '1-3 / above the clouds',
    theme: 'sky',
    music: 'sky',
    map: g,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1-4 — Castle
// Stone walls + lava floor in gaps + fire bars + bowser-fight + axe.
// ─────────────────────────────────────────────────────────────────────────────
function buildL1_4(): LevelData {
  const W = 200;
  const H = 14;
  const g = emptyGrid(W, H);

  // Stone ceiling + lava floor (row 13 = lava)
  fillRow(g, 0, '#', 0, W);
  fillRow(g, 1, '#', 0, W);
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, 'L', 0, W);

  // Side walls
  for (let r = 2; r <= 11; r++) {
    put(g, 0, r, '#');
    put(g, W - 1, r, '#');
  }

  // Lava pits in floor (row 12 = empty over the lava in row 13).
  // Max safe single-jump gap = ~5 tiles. Wider pits need stepping-stone islands.
  const lavaPits: Array<[number, number]> = [
    [15, 19], [27, 32], [42, 47], [56, 62], [72, 76], [87, 92], [105, 111], [128, 134],
  ];
  for (const [a, b] of lavaPits) {
    for (let c = a; c <= b; c++) {
      put(g, c, 12, ' ');
    }
  }

  // Stepping-stone islands over wider pits (row 11 lets player run + jump again)
  put(g, 59, 11, '=');                  // mid-pit 56-62 (7 wide)
  put(g, 108, 11, '=');                 // mid-pit 105-111 (7 wide)
  put(g, 131, 11, '=');                 // mid-pit 128-134 (7 wide)

  // Short stone blocks (2 tiles tall) with fire-bar pivots HIGH above — player
  // can walk under fire-bar reach on ground and jump over the block freely.
  // Bar length 4 × radius 5 × 2 = max reach 40 px. Pivot at row 4 (y=64) means
  // reach down to y=104 (row 6.5). Player at row 12 (y=176) and jump apex
  // (~y=88) both safe; only matters when jumping onto/over the stone block.
  const barBlocks: Array<{ col: number; pivotRow: number }> = [
    { col: 22, pivotRow: 4 },
    { col: 37, pivotRow: 4 },
    { col: 67, pivotRow: 4 },
    { col: 80, pivotRow: 4 },
    { col: 98, pivotRow: 4 },
    { col: 117, pivotRow: 4 },
    { col: 140, pivotRow: 4 },
  ];
  for (const b of barBlocks) {
    for (let r = 9; r <= 10; r++) put(g, b.col, r, '#');
    put(g, b.col, b.pivotRow, 'X');
  }

  // Floating brick stretches (cover routes around pits)
  put(g, 50, 9, '======');
  put(g, 95, 9, '====');

  // Fire-flower power-up early in the level — gives player a fighting chance vs. boss
  put(g, 10, 8, '*');
  // Mushroom mid-level (in case player got hit)
  put(g, 100, 8, 'M');
  // Star — 10s invincibility, place mid-castle so player can blitz through fire bars
  put(g, 75, 8, 'S');

  // Koopas + goombas patrolling between hazards
  put(g, 8, 11, 'k');
  put(g, 24, 11, 'g');
  put(g, 35, 11, 'k');
  put(g, 50, 11, 'g');
  put(g, 65, 11, 'k');
  put(g, 78, 11, 'g');
  put(g, 82, 11, 'k');
  put(g, 95, 11, 'g');
  put(g, 100, 11, 'k');
  put(g, 115, 11, 'g');
  put(g, 124, 11, 'k');
  put(g, 138, 11, 'g');
  put(g, 145, 11, 'k');

  // Bowser arena: clear stretch from col 150 to 188, no pillars, axe at 188
  // Bridge for collapse: row 12 ground from col 150 to 188 (already ground from fillRow above)
  put(g, 162, 11, 'W');                          // bowser spawn
  put(g, 188, 11, 'A');                          // axe

  // Wall behind axe to keep player from running past
  for (let r = 4; r <= 11; r++) put(g, 192, r, '#');

  return {
    name: 'Castle',
    tag: '1-4 / last stand',
    theme: 'castle',
    music: 'castle',
    map: g,
    hint: 'A scroll in the rubble: "The Queen is not here. Seek the keep beyond the clouds."',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLD 2 — harder variants of each theme
// ─────────────────────────────────────────────────────────────────────────────

// 2-1 — PIPE JUNCTION
// Distinct signature: NO ground enemies before mid-level; player navigates
// a forest of varying-height pipes (climb-up-and-over puzzles).
function buildL2_1(): LevelData {
  const W = 220;
  const H = 14;
  const g = emptyGrid(W, H);

  // Continuous ground (no pits in first half)
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, '#', 0, W);

  // ── Forest-of-pipes: short pipes (all 3-tall) so player can clear with
  // a held jump. Piranhas at alternate pipes.
  pipe(g, 14, 10, 2);                 // short
  pipe(g, 20, 9, 3, true);            // medium + piranha
  pipe(g, 28, 10, 2);                 // short
  pipe(g, 34, 9, 3, true);            // medium + piranha
  pipe(g, 44, 10, 2);                 // short
  pipe(g, 50, 9, 3, true);            // medium + piranha
  pipe(g, 58, 10, 2);                 // short

  // Coins between pipes — collected mid-jump
  put(g, 24, 9, 'c');
  put(g, 30, 9, 'c');
  put(g, 40, 9, 'c');
  put(g, 46, 9, 'c');
  put(g, 56, 9, 'c');

  // ── Mid-section: lava pit + brick stepping stone over it
  for (let c = 66; c <= 69; c++) { put(g, c, 12, ' '); put(g, c, 13, ' '); }
  put(g, 67, 9, '==');                // stepping bricks at row 9

  // ── Floating power-up row above ground (not on pipes)
  put(g, 72, 8, '?M*?');              // 4 blocks: ?, mushroom, fire-flower, ?

  // ── Brick-tower puzzle: shorter stacks so player can land on each top.
  // Max apex y ≈ 101 (row 6.3). Tower tops at row 8 = y=128 → reachable.
  for (let r = 9; r <= 11; r++) put(g, 78, r, '=');     // 3-tall, top row 9
  for (let r = 8; r <= 11; r++) put(g, 86, r, '=');     // 4-tall, top row 8
  for (let r = 8; r <= 11; r++) put(g, 94, r, '=');     // 4-tall, top row 8
  for (let r = 9; r <= 11; r++) put(g, 102, r, '=');    // 3-tall, top row 9
  // Coin clusters at top of towers
  put(g, 78, 8, 'c');
  put(g, 86, 7, 'c');
  put(g, 94, 7, 'c');
  put(g, 102, 8, 'c');
  // Enemies between towers
  put(g, 82, 11, 'g');
  put(g, 90, 11, 'k');
  put(g, 98, 11, 'g');

  // ── More pipes — all 3-tall, no impossibly-tall ones
  pipe(g, 108, 9, 3, true);
  pipe(g, 116, 9, 3, true);
  pipe(g, 124, 10, 2);

  // ── Mid-air bridge of bricks (player walks above ground level)
  for (let c = 132; c <= 144; c++) put(g, c, 8, '=');
  put(g, 135, 8, 'B');
  put(g, 138, 8, '?');
  put(g, 141, 8, 'B');
  // Below the bridge — pit + enemies
  for (let c = 132; c <= 140; c++) { put(g, c, 12, ' '); put(g, c, 13, ' '); }

  // ── Final approach: gauntlet of koopas + last piranha pipe + ascent
  put(g, 150, 11, 'k');
  put(g, 154, 11, 'g');
  put(g, 158, 11, 'k');
  pipe(g, 165, 9, 3, true);           // 3-tall (was 4) so player can clear
  put(g, 172, 11, 'g');
  put(g, 176, 11, 'k');

  // Final ascent — 4 steps (was 6) so top stays within jump range
  stairUp(g, 195, 11, 4);
  put(g, 210, 11, 'F');

  return {
    name: 'Pipe Junction',
    tag: '2-1 / climb the stack',
    theme: 'overworld',
    music: 'overworld',
    map: g,
  };
}

// 2-2 — VERTICAL STACK
// Distinct signature: tall brick pillars rising from floor to ceiling that
// force the player to CLIMB on top via brick stairs and DROP between them.
// Floor has hazard gaps. Coins hide in pocket-rooms inside the stacks.
function buildL2_2(): LevelData {
  const W = 210;
  const H = 14;
  const g = emptyGrid(W, H);

  fillRow(g, 0, '#', 0, W);
  fillRow(g, 1, '#', 0, W);
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, '#', 0, W);
  for (let r = 2; r <= 11; r++) { put(g, 0, r, '#'); put(g, W - 1, r, '#'); }

  // Spike-pit hazards in the floor between stacks
  for (const c of [38, 78, 118, 158]) {
    put(g, c, 12, ' '); put(g, c + 1, 12, ' '); put(g, c + 2, 12, ' ');
    put(g, c, 13, '^'); put(g, c + 1, 13, '^'); put(g, c + 2, 13, '^');
  }

  // ── Short brick pillars (3-tall, rows 9-11) — climbable obstacles.
  // Player can jump OVER each pillar from ground.
  const pillarCols = [20, 50, 95, 135, 175];
  for (const col of pillarCols) {
    for (let r = 9; r <= 11; r++) {
      put(g, col, r, '=');
      put(g, col + 1, r, '=');
    }
  }

  // ── Power-up ?-blocks FLOATING at row 6 (bumpable from ground: apex head y=87 < block bottom 111).
  // Placed in air between pillars so player jumps up to bump them.
  put(g, 26, 6, 'M');         // mushroom after 1st pillar
  put(g, 57, 6, '*');         // fire-flower after 2nd pillar
  put(g, 102, 6, 'S');        // star after 3rd pillar
  put(g, 143, 6, 'M');        // mushroom after 4th pillar

  // ── Floating coin bricks at row 6 — bumpable for extra coins
  put(g, 32, 6, 'B B B');     // coin row
  put(g, 78, 6, 'B B B');
  put(g, 121, 6, 'B B B');
  put(g, 161, 6, 'B B B');

  // ── Coins next to each pillar (low row 11 next to obstacle)
  put(g, 24, 8, 'c'); put(g, 54, 8, 'c'); put(g, 99, 8, 'c'); put(g, 139, 8, 'c'); put(g, 179, 8, 'c');

  // ── Piranha pipe at far-mid (single threat)
  pipe(g, 65, 9, 3, true);
  pipe(g, 108, 9, 3, true);

  // ── Enemies scattered between stacks
  put(g, 25, 11, 'k');
  put(g, 30, 11, 'g');
  put(g, 55, 11, 'g');
  put(g, 60, 11, 'k');
  put(g, 70, 11, 'g');
  put(g, 85, 11, 'k');
  put(g, 100, 11, 'g');
  put(g, 113, 11, 'k');
  put(g, 125, 11, 'g');
  put(g, 145, 11, 'k');
  put(g, 150, 11, 'g');
  put(g, 165, 11, 'k');
  put(g, 185, 11, 'g');
  put(g, 190, 11, 'k');

  // ── Coin rows in low gaps (right after stacks)
  put(g, 33, 11, 'c'); put(g, 73, 11, 'c'); put(g, 113, 11, 'c');

  // Flag at end
  put(g, 200, 11, 'F');

  return {
    name: 'Vertical Stack',
    tag: '2-2 / climb the towers',
    theme: 'underground',
    music: 'underground',
    map: g,
  };
}

// 2-3 — LAYERED SKY
// Distinct signature: THREE strict horizontal layers (high/mid/low) of long
// continuous platforms. Player picks a layer and stays. No paratroopas
// jumping between layers — instead, each layer has its own dedicated enemies.
function buildL2_3(): LevelData {
  const W = 210;
  const H = 14;
  const g = emptyGrid(W, H);

  // Start landing
  for (let c = 0; c <= 8; c++) { put(g, c, 11, '='); }
  put(g, 5, 12, '#'); put(g, 5, 13, '#');     // tiny ground under start

  // Layered Sky — strips arranged so every transition is ≤4-tile gap.
  // Player follows a continuous low chain; mid+high strips are bonuses.

  // Low layer (row 11) — primary path, mostly continuous with ≤3-tile gaps.
  const lowStrips: Array<[number, number]> = [
    [10, 22], [25, 36], [39, 52], [55, 68], [71, 84], [87, 100],
    [103, 118], [121, 134], [137, 150], [153, 168], [171, 184],
  ];
  for (const [a, b] of lowStrips) {
    for (let c = a; c <= b; c++) put(g, c, 11, '=');
    put(g, a + 3, 10, 'g');
  }

  // Mid layer (row 9) — bonus bridges directly above low strips (2-row drop only).
  const midStrips: Array<[number, number]> = [
    [16, 24], [32, 42], [48, 60], [64, 78], [82, 94], [100, 114], [120, 134], [142, 158],
  ];
  for (const [a, b] of midStrips) {
    for (let c = a; c <= b; c++) put(g, c, 9, '=');
    put(g, (a + b) >> 1, 8, 'k');
  }

  // High layer (row 7) — short reward platforms above each mid strip (2-row up).
  // Reachable: standing on row 9 strip (feet y=144, py=130 small) → apex py=39, head bumps row 7 (bottom y=127). ✓
  const highStrips: Array<[number, number]> = [
    [18, 22], [36, 42], [52, 58], [72, 78], [88, 92], [108, 114], [128, 134], [148, 156],
  ];
  for (const [a, b] of highStrips) {
    for (let c = a; c <= b; c++) put(g, c, 7, '=');
    put(g, a + 1, 6, 'cc');
    put(g, (a + b) >> 1, 6, 'q');
  }

  // Power-ups — at row 7 strip positions (player on row 9 strip bumps them)
  put(g, 39, 6, '*');
  put(g, 89, 6, 'S');
  put(g, 130, 6, 'M');

  // Final wide landing
  for (let c = 188; c <= 208; c++) put(g, c, 11, '=');
  put(g, 200, 11, 'F');

  return {
    name: 'Layered Sky',
    tag: '2-3 / pick a lane',
    theme: 'sky',
    music: 'sky',
    map: g,
  };
}

// 2-4 — CASTLE CHAMBERS
// Distinct: chambered castle with short obstacle-pillars + floating bumpable
// power-up blocks + fire-bars over pillars. Everything reachable from ground.
function buildL2_4(): LevelData {
  const W = 220;
  const H = 14;
  const g = emptyGrid(W, H);

  // Stone ceiling + lava floor
  fillRow(g, 0, '#', 0, W);
  fillRow(g, 1, '#', 0, W);
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, 'L', 0, W);
  for (let r = 2; r <= 11; r++) { put(g, 0, r, '#'); put(g, W - 1, r, '#'); }

  // Lava pits in floor — exactly 4 tiles wide and ALWAYS placed BETWEEN
  // pillars (never overlapping a pillar column, or player can't jump over both).
  const lavaPits: Array<[number, number]> = [
    [14, 17],   // before pillar 22
    [28, 31],   // between 22 and 38
    [44, 47],   // between 38 and 54
    [60, 63],   // between 54 and 70
    [76, 79],   // between 70 and 86
    [92, 95],   // between 86 and 104
    [112, 115], // between 104 and 124
    [132, 135], // between 124 and 144
    [152, 155], // after 144, before bowser arena
  ];
  for (const [a, b] of lavaPits) {
    for (let c = a; c <= b; c++) put(g, c, 12, ' ');
  }

  // Short obstacle pillars (rows 9-11, 3-tall) — player jumps over from ground.
  const pillars = [22, 38, 54, 70, 86, 104, 124, 144];
  for (const c of pillars) {
    for (let r = 9; r <= 11; r++) put(g, c, r, '#');
  }

  // Fire-bar pivots HIGH above pillars (row 4) — reach only down to row 6.5.
  // Player on ground (apex row 6.3) is safe; only jumping on top of pillars risks hit.
  for (const c of pillars) {
    put(g, c, 4, 'X');
  }

  // Floating bumpable blocks at row 6 (bottom y=111, apex head y=87 → bump works).
  // Placed BETWEEN pillars so player jumps up to bump them.
  put(g, 8, 7, '*');           // fire-flower right at start
  put(g, 26, 6, 'B?B');        // bumpable trio
  put(g, 51, 6, 'M');          // mushroom mid
  put(g, 74, 6, 'S');          // STAR for bowser-prep
  put(g, 91, 6, 'B?B');
  put(g, 109, 6, '?');
  put(g, 128, 6, 'M');         // mushroom late
  put(g, 148, 6, '*');         // last fire-flower

  // Koopa patrols between pillars (on ground)
  put(g, 26, 11, 'k');
  put(g, 42, 11, 'k');
  put(g, 58, 11, 'k');
  put(g, 75, 11, 'k');
  put(g, 90, 11, 'k');
  put(g, 108, 11, 'k');
  put(g, 130, 11, 'k');
  put(g, 150, 11, 'k');

  // Final bowser arena (col 168-214) — clear stretch
  put(g, 195, 11, 'W');
  put(g, 213, 11, 'A');
  for (let r = 4; r <= 11; r++) put(g, 217, r, '#');

  return {
    name: 'Castle Chambers',
    tag: '2-4 / clear the keep',
    theme: 'castle',
    music: 'castle',
    map: g,
    hint: 'A carved tablet glows: "Still not here. One last keep waits past the fire."',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLD 3 — additional variants
// ─────────────────────────────────────────────────────────────────────────────

// 3-1 — BRICK RUN (overworld). Distinct: dense brick formations + breakable
// walls — fire-flower rewards player who clears the path with fireballs.
function buildL3_1(): LevelData {
  const W = 220;
  const H = 14;
  const g = emptyGrid(W, H);

  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, '#', 0, W);
  // Pits — small, evenly spaced
  for (const [a, b] of [[40, 42], [78, 80], [120, 123], [160, 163]] as const) {
    for (let c = a; c <= b; c++) { put(g, c, 12, ' '); put(g, c, 13, ' '); }
  }

  // Intro — small bumpable row + first enemies
  put(g, 16, 7, '?B?');
  put(g, 20, 11, 'g');
  put(g, 24, 11, 'g');

  // Brick walls (require super/fire to break)
  put(g, 30, 6, '======');           // ceiling row
  put(g, 30, 7, 'B?M?B');            // bumpable + mushroom
  put(g, 36, 11, 'g');

  // ── First brick wall — 3-tall, must break OR jump over
  for (let r = 8; r <= 10; r++) put(g, 48, r, '=');
  for (let r = 9; r <= 11; r++) put(g, 50, r, '='); // a step to start the climb

  // Second pipe
  pipe(g, 56, 9, 3, true);
  put(g, 62, 11, 'k');

  // ── Brick chamber — closed cell with coins inside (requires breaking brick)
  for (let c = 70; c <= 76; c++) {
    put(g, c, 7, '=');
    put(g, c, 11, '=');
  }
  put(g, 70, 8, '='); put(g, 70, 9, '='); put(g, 70, 10, '=');
  put(g, 76, 8, '='); put(g, 76, 9, '='); put(g, 76, 10, '=');
  // Coins inside chamber (player breaks ceiling to bump-collect)
  put(g, 72, 9, 'c'); put(g, 73, 9, 'c'); put(g, 74, 9, 'c');
  put(g, 72, 10, 'c'); put(g, 73, 10, 'c'); put(g, 74, 10, 'c');
  // Fire-flower bonus on chamber roof
  put(g, 73, 6, '*');

  put(g, 84, 11, 'g');
  put(g, 90, 11, 'k');

  // Star + open run
  put(g, 96, 6, 'S');
  put(g, 100, 11, 'g');
  put(g, 106, 11, 'k');
  put(g, 112, 11, 'g');

  // ── Brick staircase up + brick run on top
  stairUp(g, 130, 11, 4);
  for (let c = 138; c <= 150; c++) put(g, c, 8, '=');
  put(g, 140, 7, 'B?B');
  put(g, 145, 8, 'M');                // mushroom mid-run

  // Drop back to ground + last pipe + final approach
  pipe(g, 156, 9, 3, true);
  put(g, 168, 11, 'g');
  put(g, 172, 11, 'k');
  put(g, 176, 11, 'g');

  // Final stairs to flag
  stairUp(g, 195, 11, 4);
  put(g, 210, 11, 'F');

  return {
    name: 'Brick Run',
    tag: '3-1 / break the wall',
    theme: 'overworld',
    music: 'overworld',
    map: g,
  };
}

// 3-2 — COIN CAVES (underground). Distinct: hidden coin pocket rooms inside
// brick formations + many ?-blocks for collection-focused play.
function buildL3_2(): LevelData {
  const W = 220;
  const H = 14;
  const g = emptyGrid(W, H);

  fillRow(g, 0, '#', 0, W);
  fillRow(g, 1, '#', 0, W);
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, '#', 0, W);
  for (let r = 2; r <= 11; r++) { put(g, 0, r, '#'); put(g, W - 1, r, '#'); }

  // Coin pockets — 5 hidden caves
  const cave = (col: number) => {
    for (let c = col; c <= col + 5; c++) {
      put(g, c, 6, '=');               // ceiling
      put(g, c, 10, '=');              // floor
    }
    put(g, col, 7, '='); put(g, col, 8, '='); put(g, col, 9, '=');
    put(g, col + 5, 7, '='); put(g, col + 5, 8, '='); put(g, col + 5, 9, '=');
    // Coin block inside (player breaks ceiling to bump)
    put(g, col + 2, 7, 'B'); put(g, col + 3, 7, 'B');
    // Coin pickups too
    put(g, col + 2, 8, 'c'); put(g, col + 3, 8, 'c');
    put(g, col + 2, 9, 'c'); put(g, col + 3, 9, 'c');
  };
  cave(20);
  cave(50);
  cave(82);
  cave(120);
  cave(158);

  // Power-ups above caves
  put(g, 23, 5, 'M');
  put(g, 53, 5, '*');
  put(g, 85, 5, 'S');
  put(g, 123, 5, 'M');
  put(g, 161, 5, '*');

  // Piranha pipes between caves
  pipe(g, 40, 9, 3, true);
  pipe(g, 102, 9, 3, true);
  pipe(g, 144, 9, 3, true);

  // Floor enemies — heavy density
  for (let c = 12; c < W - 12; c += 6) {
    const which = ((c / 6) | 0) % 2 === 0 ? 'g' : 'k';
    put(g, c, 11, which);
  }

  // Exit
  pipe(g, 198, 9, 3);
  put(g, 210, 11, 'F');

  return {
    name: 'Coin Caves',
    tag: '3-2 / pockets full',
    theme: 'underground',
    music: 'underground',
    map: g,
  };
}

// 3-3 — DONUT DROP (sky). Distinct: ALL platforms are tiny (2-3 tiles wide)
// with significant gaps. Precision-jump challenge over the void.
function buildL3_3(): LevelData {
  const W = 220;
  const H = 14;
  const g = emptyGrid(W, H);

  // Start landing
  for (let c = 0; c <= 6; c++) put(g, c, 11, '=');
  put(g, 4, 10, 'g');

  // Series of small platforms — alternating row 11 (main) and row 9 (high)
  // Gap between consecutive row-11 platforms = 4 tiles (max reach)
  // Gap to row-9 platforms = 4 tiles horizontally + 2 rows up
  const platforms: Array<{ col: number; row: number; len: number; enemy?: string }> = [
    { col: 10, row: 11, len: 3, enemy: 'q' },
    { col: 17, row: 9,  len: 3, enemy: 'q' },
    { col: 24, row: 11, len: 3, enemy: 'k' },
    { col: 31, row: 9,  len: 3, enemy: 'q' },
    { col: 38, row: 11, len: 3 },
    { col: 45, row: 10, len: 2, enemy: 'q' },
    { col: 51, row: 11, len: 3, enemy: 'g' },
    { col: 58, row: 9,  len: 3, enemy: 'q' },
    { col: 65, row: 11, len: 3 },
    { col: 72, row: 10, len: 2, enemy: 'q' },
    { col: 78, row: 11, len: 3, enemy: 'k' },
    { col: 85, row: 9,  len: 3, enemy: 'q' },
    { col: 92, row: 11, len: 3 },
    { col: 99, row: 10, len: 2, enemy: 'q' },
    { col: 105, row: 11, len: 3 },
    { col: 112, row: 9, len: 3, enemy: 'q' },
    { col: 119, row: 11, len: 3, enemy: 'g' },
    { col: 126, row: 10, len: 2, enemy: 'q' },
    { col: 132, row: 11, len: 3 },
    { col: 139, row: 9, len: 3, enemy: 'q' },
    { col: 146, row: 11, len: 3 },
    { col: 153, row: 10, len: 2, enemy: 'q' },
    { col: 159, row: 11, len: 3, enemy: 'k' },
    { col: 166, row: 9, len: 3, enemy: 'q' },
    { col: 173, row: 11, len: 3 },
    { col: 180, row: 10, len: 2 },
    { col: 186, row: 11, len: 14 },                // final wide landing
  ];

  for (const p of platforms) {
    for (let i = 0; i < p.len; i++) put(g, p.col + i, p.row, '=');
    if (p.enemy) put(g, p.col + Math.floor(p.len / 2), p.row - 1, p.enemy);
  }

  // Power-ups on safer wider platforms
  put(g, 38, 10, '*');
  put(g, 92, 10, 'S');
  put(g, 146, 10, 'M');

  // Coins above high platforms
  put(g, 18, 8, 'c'); put(g, 59, 8, 'c'); put(g, 86, 8, 'c');
  put(g, 113, 8, 'c'); put(g, 140, 8, 'c'); put(g, 167, 8, 'c');

  // Flag at end (on final wide platform)
  put(g, 196, 11, 'F');

  return {
    name: 'Donut Drop',
    tag: '3-3 / hit the gap',
    theme: 'sky',
    music: 'sky',
    map: g,
  };
}

// 3-4 — STRONGHOLD (castle). Distinct: long multi-stage castle with rotating
// fire bars + lava trenches + final bowser arena. Hardest level in the game.
function buildL3_4(): LevelData {
  const W = 240;
  const H = 14;
  const g = emptyGrid(W, H);

  fillRow(g, 0, '#', 0, W);
  fillRow(g, 1, '#', 0, W);
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, 'L', 0, W);
  for (let r = 2; r <= 11; r++) { put(g, 0, r, '#'); put(g, W - 1, r, '#'); }

  // 12 lava pits, all 4-tile wide, between pillars
  const lavaPits: Array<[number, number]> = [
    [10, 13], [24, 27], [38, 41], [52, 55], [66, 69], [80, 83],
    [94, 97], [108, 111], [122, 125], [136, 139], [150, 153], [164, 167],
  ];
  for (const [a, b] of lavaPits) {
    for (let c = a; c <= b; c++) put(g, c, 12, ' ');
  }

  // 11 pillars between pits, 3-tall (rows 9-11)
  const pillars = [18, 32, 46, 60, 74, 88, 102, 116, 130, 144, 158];
  for (const c of pillars) {
    for (let r = 9; r <= 11; r++) put(g, c, r, '#');
  }

  // Fire-bar pivots on every other pillar (high — row 4)
  for (let i = 0; i < pillars.length; i += 2) {
    put(g, pillars[i], 4, 'X');
  }

  // Bumpable power-up blocks at row 6 between pillars
  put(g, 6, 7, '*');               // fire-flower at very start
  put(g, 22, 6, 'M');
  put(g, 50, 6, 'S');              // STAR — useful for the long gauntlet
  put(g, 78, 6, 'M');
  put(g, 106, 6, '*');
  put(g, 134, 6, 'S');             // second STAR before final stretch
  put(g, 162, 6, 'M');

  // Koopa patrols on each ground segment between pits
  for (const c of [20, 36, 64, 92, 120, 148]) {
    put(g, c, 11, 'k');
  }

  // Bowser arena (col 180-225) — clear long stretch
  put(g, 205, 11, 'W');
  put(g, 228, 11, 'A');
  for (let r = 4; r <= 11; r++) put(g, 234, r, '#');

  return {
    name: 'Stronghold',
    tag: '3-4 / final test',
    theme: 'castle',
    music: 'castle',
    map: g,
    hint: 'Words burned into the wall: "She is close. The King\'s Keep holds her. Go."',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLD 4 — final, hardest variants
// ─────────────────────────────────────────────────────────────────────────────

// 4-1 — SPIKE STAIRS (overworld). Spike clusters on top of bricks force precision
// jumps. Pits with spike bottoms instead of just empty (instant-death look).
function buildL4_1(): LevelData {
  const W = 230;
  const H = 14;
  const g = emptyGrid(W, H);

  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, '#', 0, W);
  // 5 pits with spike floors (player still dies on fall — already)
  for (const [a, b] of [[22, 25], [50, 53], [80, 83], [110, 114], [148, 151], [184, 187]] as const) {
    for (let c = a; c <= b; c++) { put(g, c, 12, ' '); put(g, c, 13, ' '); }
  }

  // Spike clusters on top of low bricks — must jump precisely
  const spikedBrick = (col: number) => {
    for (let c = col; c <= col + 2; c++) {
      put(g, c, 11, '=');
      put(g, c, 10, '^');
    }
  };
  spikedBrick(34);
  spikedBrick(62);
  spikedBrick(92);
  spikedBrick(126);
  spikedBrick(160);

  // Pipes between spikes
  pipe(g, 42, 9, 3, true);
  pipe(g, 72, 9, 3, true);
  pipe(g, 102, 8, 4, true);
  pipe(g, 136, 9, 3, true);
  pipe(g, 170, 9, 3, true);

  // ?-blocks (M / * / S) at row 6 for power-ups
  put(g, 15, 7, '?M?');
  put(g, 56, 7, 'B*B');
  put(g, 96, 6, 'S');                 // star (helpful for spike segment)
  put(g, 142, 7, 'BMB');
  put(g, 178, 6, '*');

  // Heavy enemy traffic — overlapping patrols
  for (const c of [16, 30, 38, 46, 58, 68, 76, 88, 96, 106, 122, 132, 142, 156, 166, 174, 192, 200, 208]) {
    put(g, c, 11, ((c / 4) | 0) % 2 === 0 ? 'g' : 'k');
  }

  stairUp(g, 198, 11, 5);
  put(g, 220, 11, 'F');

  return {
    name: 'Spike Stairs',
    tag: '4-1 / pinch points',
    theme: 'overworld',
    music: 'overworld',
    map: g,
  };
}

// 4-2 — NARROW TUNNEL (underground). Brick ceiling closes in low — forces
// crouch + duck under brick overhangs. Many piranhas + dense enemy.
function buildL4_2(): LevelData {
  const W = 230;
  const H = 14;
  const g = emptyGrid(W, H);

  fillRow(g, 0, '#', 0, W);
  fillRow(g, 1, '#', 0, W);
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, '#', 0, W);
  for (let r = 2; r <= 11; r++) { put(g, 0, r, '#'); put(g, W - 1, r, '#'); }

  // Low ceilings dropping to row 7-8 at intervals — player MUST crouch to pass
  // (with super/fire size). Small player walks under freely.
  const lowCeiling = (col: number, len: number) => {
    for (let c = col; c < col + len; c++) {
      put(g, c, 8, '=');
      put(g, c, 7, '=');
    }
  };
  lowCeiling(28, 6);
  lowCeiling(70, 6);
  lowCeiling(114, 6);
  lowCeiling(160, 6);
  lowCeiling(196, 6);

  // ?-blocks between low-ceiling sections (high row 5 to clear over ceiling reach)
  put(g, 18, 5, 'M');
  put(g, 50, 5, '*');
  put(g, 92, 5, 'S');
  put(g, 138, 5, 'M');
  put(g, 180, 5, '*');

  // 5 piranha pipes
  pipe(g, 40, 9, 3, true);
  pipe(g, 84, 9, 3, true);
  pipe(g, 128, 9, 3, true);
  pipe(g, 172, 9, 3, true);
  pipe(g, 210, 9, 3, true);

  // Dense ground enemies (every ~5 cols)
  for (let c = 8; c < W - 12; c += 5) {
    put(g, c, 11, ((c / 5) | 0) % 3 === 0 ? 'k' : 'g');
  }

  put(g, 222, 11, 'F');

  return {
    name: 'Narrow Tunnel',
    tag: '4-2 / duck and run',
    theme: 'underground',
    music: 'underground',
    map: g,
  };
}

// 4-3 — PARATROOPA STORM (sky). Many small platforms with paratroopas at almost
// every one — dodging is the main challenge. Some platforms only 2 tiles wide.
function buildL4_3(): LevelData {
  const W = 230;
  const H = 14;
  const g = emptyGrid(W, H);

  for (let c = 0; c <= 6; c++) put(g, c, 11, '=');

  // Many platforms, mostly 2-tile wide, each with paratroopa enemy
  const platforms: Array<{ col: number; row: number; len: number; enemy?: string }> = [
    { col: 10, row: 10, len: 2, enemy: 'q' },
    { col: 15, row: 11, len: 2, enemy: 'q' },
    { col: 20, row: 9,  len: 2, enemy: 'q' },
    { col: 25, row: 11, len: 2, enemy: 'q' },
    { col: 30, row: 10, len: 2, enemy: 'q' },
    { col: 35, row: 11, len: 3, enemy: 'k' },
    { col: 42, row: 9,  len: 2, enemy: 'q' },
    { col: 47, row: 11, len: 2, enemy: 'q' },
    { col: 52, row: 10, len: 2, enemy: 'q' },
    { col: 57, row: 11, len: 2, enemy: 'q' },
    { col: 62, row: 9,  len: 2, enemy: 'q' },
    { col: 67, row: 11, len: 3, enemy: 'g' },
    { col: 74, row: 10, len: 2, enemy: 'q' },
    { col: 79, row: 11, len: 2, enemy: 'q' },
    { col: 84, row: 9,  len: 2, enemy: 'q' },
    { col: 89, row: 11, len: 2, enemy: 'q' },
    { col: 94, row: 10, len: 2, enemy: 'q' },
    { col: 99, row: 11, len: 3 },
    { col: 106, row: 9, len: 2, enemy: 'q' },
    { col: 111, row: 11, len: 2, enemy: 'q' },
    { col: 116, row: 10, len: 2, enemy: 'q' },
    { col: 121, row: 11, len: 2, enemy: 'q' },
    { col: 126, row: 9, len: 2, enemy: 'q' },
    { col: 131, row: 11, len: 3, enemy: 'k' },
    { col: 138, row: 10, len: 2, enemy: 'q' },
    { col: 143, row: 11, len: 2, enemy: 'q' },
    { col: 148, row: 9, len: 2, enemy: 'q' },
    { col: 153, row: 11, len: 2, enemy: 'q' },
    { col: 158, row: 10, len: 2, enemy: 'q' },
    { col: 163, row: 11, len: 3, enemy: 'g' },
    { col: 170, row: 9, len: 2, enemy: 'q' },
    { col: 175, row: 11, len: 2, enemy: 'q' },
    { col: 180, row: 10, len: 2, enemy: 'q' },
    { col: 185, row: 11, len: 2, enemy: 'q' },
    { col: 190, row: 9, len: 2, enemy: 'q' },
    { col: 195, row: 11, len: 30 },     // final wide landing — runs all the way to the flag
  ];

  for (const p of platforms) {
    for (let i = 0; i < p.len; i++) put(g, p.col + i, p.row, '=');
    if (p.enemy) put(g, p.col + Math.floor(p.len / 2), p.row - 1, p.enemy);
  }

  // Power-ups on wide landings
  put(g, 36, 10, 'M');
  put(g, 100, 10, 'S');
  put(g, 164, 10, '*');

  // Coins above some platforms
  put(g, 22, 7, 'c'); put(g, 64, 7, 'c'); put(g, 108, 7, 'c'); put(g, 150, 7, 'c'); put(g, 192, 7, 'c');

  put(g, 220, 11, 'F');

  return {
    name: 'Paratroopa Storm',
    tag: '4-3 / dodge everything',
    theme: 'sky',
    music: 'sky',
    map: g,
  };
}

// 4-4 — KING'S KEEP (castle, FINAL). Longest, hardest castle. Two boss-fight
// chambers (mid-castle mini-encounter + final). Doubled fire bars. Final boss
// has 2× HP and faster fire (handled in engine via levelIndex check).
function buildL4_4(): LevelData {
  const W = 300;
  const H = 14;
  const g = emptyGrid(W, H);

  fillRow(g, 0, '#', 0, W);
  fillRow(g, 1, '#', 0, W);
  fillRow(g, 12, '#', 0, W);
  fillRow(g, 13, 'L', 0, W);
  for (let r = 2; r <= 11; r++) { put(g, 0, r, '#'); put(g, W - 1, r, '#'); }

  // Helper: carve a lava gap (remove floor) from col a..b inclusive.
  const carve = (a: number, b: number) => { for (let c = a; c <= b; c++) put(g, c, 12, ' '); };
  // Floating brick platform you LAND ON (clear air above → never bonks a jump).
  const platform = (a: number, b: number, row: number) => { for (let c = a; c <= b; c++) put(g, c, row, '='); };

  // ── Section 1: start ramp (flat, fire-flower, warm-up enemies) cols 4-30
  put(g, 8, 7, '*');

  // ── Section 2: LAVA LAKE 1 with platform hops (cols 36-56)
  carve(36, 56);
  platform(41, 43, 9);     // land-on-top stepping stone
  platform(48, 50, 9);     // second stone

  // ── Section 3: brick STAIRCASE up-and-over (cols 64-78) — verticality
  put(g, 66, 11, '=');
  platform(68, 68, 10); put(g, 68, 11, '=');
  platform(70, 70, 9);  put(g, 70, 10, '='); put(g, 70, 11, '=');   // peak
  platform(72, 72, 10); put(g, 72, 11, '=');
  put(g, 74, 11, '=');

  // ── Section 4: ground pits + high fire bars (cols 84-128)
  carve(86, 89);           // 4-wide pit
  carve(116, 118);         // 3-wide pit
  put(g, 96, 4, 'X');      // fire bar over flat ground
  put(g, 108, 6, 'X');     // lower fire bar (duck/time under)
  put(g, 104, 6, 'S');     // STAR

  // ── Section 5: LAVA LAKE 2 platform hops (cols 148-168)
  carve(148, 168);
  platform(153, 155, 9);
  platform(160, 162, 9);
  put(g, 140, 6, '*');     // fire-flower before the lake

  // ── Section 6: final pit run + fire bars + last star (cols 176-220)
  carve(178, 181);         // 4-wide
  carve(202, 204);         // 3-wide
  put(g, 190, 4, 'X');
  put(g, 212, 6, 'X');
  put(g, 196, 6, 'S');     // STAR before boss

  // Dense enemy gauntlet on every flat stretch (final level → packed).
  for (const c of [16, 22, 58, 62, 82, 96, 110, 124, 134, 144, 172, 186, 200, 222]) {
    put(g, c, 11, 'k');     // koopas
  }
  for (const c of [20, 26, 60, 94, 112, 122, 136, 174, 208, 224]) {
    put(g, c, 11, 'g');     // goombas
  }
  for (const c of [100, 188]) {
    put(g, c, 9, 'q');      // paratroopas (bouncing) over flat ground
  }

  // ── FINAL bowser arena (flat bridge, cols 232-292)
  put(g, 262, 11, 'W');                  // bowser spawn
  put(g, 286, 11, 'A');                  // axe
  for (let r = 4; r <= 11; r++) put(g, 292, r, '#');     // wall behind axe

  return {
    name: "King's Keep",
    tag: '4-4 / final stand',
    theme: 'castle',
    music: 'castle',
    map: g,
  };
}

export const LEVELS: LevelData[] = [
  buildL1_1(),
  buildL1_2(),
  buildL1_3(),
  buildL1_4(),
  buildL2_1(),
  buildL2_2(),
  buildL2_3(),
  buildL2_4(),
  buildL3_1(),
  buildL3_2(),
  buildL3_3(),
  buildL3_4(),
  buildL4_1(),
  buildL4_2(),
  buildL4_3(),
  buildL4_4(),
];

// ─────────────────────────────────────────────────────────────────────────────
// Parsed level + helpers
// ─────────────────────────────────────────────────────────────────────────────

export type TileType =
  | 'empty'
  | 'ground'
  | 'brick'
  | 'brick_coin'
  | 'question'
  | 'question_used'
  | 'spike'
  | 'lava'
  | 'pipe_tl' | 'pipe_tr' | 'pipe_bl' | 'pipe_br'
  | 'pipe_warp_tl' | 'pipe_warp_tr';

export type ItemKind = 'coin' | 'mushroom' | 'fire_flower' | 'star';

export interface ParsedLevel {
  name: string;
  tag: string;
  theme: LevelTheme;
  music: 'overworld' | 'underground' | 'sky' | 'castle';
  width: number;
  height: number;
  tiles: TileType[][];
  blockItems: Map<string, ItemKind>;
  goombaSpawns: Array<{ x: number; y: number }>;
  koopaSpawns: Array<{ x: number; y: number }>;
  paratroopaSpawns: Array<{ x: number; y: number }>;
  piranhaSpawns: Array<{ x: number; y: number }>;
  firebarSpawns: Array<{ x: number; y: number }>;
  bowserSpawn: { x: number; y: number } | null;
  axe: { x: number; y: number } | null;
  flag: { x: number; y: number } | null;
  freeCoins: Array<{ x: number; y: number; id: number }>;
  spawnPoint: { x: number; y: number };
  hint: string | null;
}

let _coinSid = 1;

export function parseLevel(data: LevelData): ParsedLevel {
  const width = Math.max(...data.map.map((row) => row.length));
  const height = data.map.length;
  const tiles: TileType[][] = [];
  const blockItems = new Map<string, ItemKind>();
  const goombaSpawns: ParsedLevel['goombaSpawns'] = [];
  const koopaSpawns: ParsedLevel['koopaSpawns'] = [];
  const paratroopaSpawns: ParsedLevel['paratroopaSpawns'] = [];
  const piranhaSpawns: ParsedLevel['piranhaSpawns'] = [];
  const firebarSpawns: ParsedLevel['firebarSpawns'] = [];
  let bowserSpawn: ParsedLevel['bowserSpawn'] = null;
  let axe: ParsedLevel['axe'] = null;
  let flag: ParsedLevel['flag'] = null;
  const freeCoins: ParsedLevel['freeCoins'] = [];

  for (let y = 0; y < height; y++) {
    const row: TileType[] = [];
    const line = data.map[y].padEnd(width, ' ');
    for (let x = 0; x < width; x++) {
      const ch = line[x];
      switch (ch) {
        case '#': row.push('ground'); break;
        case '=': row.push('brick'); break;
        case 'B':
          row.push('brick_coin');
          blockItems.set(`${x},${y}`, 'coin');
          break;
        case '?':
          row.push('question');
          blockItems.set(`${x},${y}`, 'coin');
          break;
        case 'M':
          row.push('question');
          blockItems.set(`${x},${y}`, 'mushroom');
          break;
        case '*':
          row.push('question');
          blockItems.set(`${x},${y}`, 'fire_flower');
          break;
        case 'S':
          row.push('question');
          blockItems.set(`${x},${y}`, 'star');
          break;
        case '^': row.push('spike'); break;
        case 'L': row.push('lava'); break;
        case '[': row.push('pipe_tl'); break;
        case ']': row.push('pipe_tr'); break;
        case '(': row.push('pipe_bl'); break;
        case ')': row.push('pipe_br'); break;
        case '<': row.push('pipe_warp_tl'); break;
        case '>': row.push('pipe_warp_tr'); break;
        case 'P':
          row.push('empty');
          piranhaSpawns.push({ x: x * TILE, y: y * TILE });
          break;
        case 'g':
          row.push('empty');
          goombaSpawns.push({ x: x * TILE, y: y * TILE });
          break;
        case 'k':
          row.push('empty');
          koopaSpawns.push({ x: x * TILE, y: y * TILE });
          break;
        case 'q':
          row.push('empty');
          paratroopaSpawns.push({ x: x * TILE, y: y * TILE });
          break;
        case 'X':
          row.push('empty');
          firebarSpawns.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 });
          break;
        case 'W':
          row.push('empty');
          bowserSpawn = { x: x * TILE, y: y * TILE };
          break;
        case 'A':
          row.push('empty');
          axe = { x: x * TILE, y: y * TILE };
          break;
        case 'F':
          row.push('empty');
          flag = { x: x * TILE, y: y * TILE };
          break;
        case 'c':
        case 's':
          row.push('empty');
          freeCoins.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, id: _coinSid++ });
          break;
        default:
          row.push('empty');
      }
    }
    tiles.push(row);
  }

  // Find safe spawn: leftmost column with a STANDING SURFACE (solid tile that
  // has 2 empty rows above — enough for a super player). Scan top-down to skip
  // ceilings and find the player's intended floor.
  let spawnX = 24;
  let spawnY = -1;
  outer: for (let x = 1; x < width; x++) {
    for (let y = 2; y < height; y++) {
      const t = tiles[y][x];
      if (t === 'ground' || t === 'brick') {
        const tAbove = tiles[y - 1][x];
        const tAbove2 = tiles[y - 2][x];
        if (tAbove === 'empty' && tAbove2 === 'empty') {
          spawnX = x * TILE + 4;
          spawnY = (y - 2) * TILE;
          break outer;
        }
        // hit a stack of solid without room — try next column
        break;
      }
    }
  }
  if (spawnY < 0) spawnY = (height - 4) * TILE;

  return {
    name: data.name,
    tag: data.tag,
    theme: data.theme,
    music: data.music,
    width,
    height,
    tiles,
    blockItems,
    goombaSpawns,
    koopaSpawns,
    paratroopaSpawns,
    piranhaSpawns,
    firebarSpawns,
    bowserSpawn,
    axe,
    flag,
    freeCoins,
    spawnPoint: { x: spawnX, y: spawnY },
    hint: data.hint ?? null,
  };
}

export function tileAt(level: ParsedLevel, tileX: number, tileY: number): TileType {
  if (tileX < 0 || tileX >= level.width || tileY < 0 || tileY >= level.height) {
    return 'empty';
  }
  return level.tiles[tileY][tileX];
}

export function setTile(level: ParsedLevel, tileX: number, tileY: number, t: TileType) {
  if (tileX < 0 || tileX >= level.width || tileY < 0 || tileY >= level.height) return;
  level.tiles[tileY][tileX] = t;
}

export function isSolid(t: TileType): boolean {
  return (
    t === 'ground' ||
    t === 'brick' ||
    t === 'brick_coin' ||
    t === 'question' ||
    t === 'question_used' ||
    t === 'pipe_tl' || t === 'pipe_tr' || t === 'pipe_bl' || t === 'pipe_br' ||
    t === 'pipe_warp_tl' || t === 'pipe_warp_tr'
  );
}

export function isBreakable(t: TileType): boolean {
  return t === 'brick';
}

export function isBumpable(t: TileType): boolean {
  return t === 'brick' || t === 'brick_coin' || t === 'question';
}

export function isHazard(t: TileType): boolean {
  return t === 'spike' || t === 'lava';
}

export function isInstantDeath(t: TileType): boolean {
  return t === 'lava';
}

export function isPipeTop(t: TileType): boolean {
  return t === 'pipe_tl' || t === 'pipe_tr' || t === 'pipe_warp_tl' || t === 'pipe_warp_tr';
}

export function isWarpTop(t: TileType): boolean {
  return t === 'pipe_warp_tl' || t === 'pipe_warp_tr';
}
