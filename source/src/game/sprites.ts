// Pixel-art sprites. Each is a 2D array; characters map to a palette per draw call.
// Convention: '.' = transparent. Otherwise = palette key.

export type SpriteKey = string[];

// ─────────────────────────────────────────────────────────────────────────────
// Player — SMALL (12×14). Base-blue cube with cream eyes.
// ─────────────────────────────────────────────────────────────────────────────
export const PLAYER_S_IDLE: SpriteKey = [
  '..KKKKKKKK..',
  '.KBBBBBBBBK.',
  'KBLLBBBBBBLK',
  'KBLLBBBBBBBK',
  'KBIIBBBBIIBK',
  'KBIIBBBBIIBK',
  'KBBBBBBBBBBK',
  'KBBBBBBBBBBK',
  'KBBBBDDBBBBK',
  'KBBBBDDBBBBK',
  'KBBBBBBBBBBK',
  'KBBBBBBBBBBK',
  '.KBBBBBBBBK.',
  '..KKKKKKKK..',
];
export const PLAYER_S_RUN_A: SpriteKey = [
  '..KKKKKKKK..',
  '.KBBBBBBBBK.',
  'KBLLBBBBBBLK',
  'KBLLBBBBBBBK',
  'KBIIBBBBIIBK',
  'KBIIBBBBIIBK',
  'KBBBBBBBBBBK',
  'KBBBBBBBBBBK',
  'KBBBBDDBBBBK',
  'KBBBBBBBBBBK',
  'KBBBBBBBBBBK',
  '.KKBBBBBBKK.',
  '.K..KKKK..K.',
  '............',
];
export const PLAYER_S_RUN_B: SpriteKey = [
  '..KKKKKKKK..',
  '.KBBBBBBBBK.',
  'KBLLBBBBBBLK',
  'KBLLBBBBBBBK',
  'KBIIBBBBIIBK',
  'KBIIBBBBIIBK',
  'KBBBBBBBBBBK',
  'KBBBBBBBBBBK',
  'KBBBBDDBBBBK',
  'KBBBBBBBBBBK',
  'KBBBBBBBBBBK',
  '.KKBBBBBBKK.',
  '.K.KKKK...K.',
  '...........K',
];
export const PLAYER_S_JUMP: SpriteKey = [
  '..KKKKKKKK..',
  '.KBLLBBBBBK.',
  'KBLLBBBBBBLK',
  'KBLLBBBBBBBK',
  'KBIBBBBBBIBK',
  'KBIBBBBBBIBK',
  'KBBBBBBBBBBK',
  'KBBBBBBBBBBK',
  'KBBBBBBBBBBK',
  'KBBBBDDBBBBK',
  'KBBBBDDBBBBK',
  'KBBBBBBBBBBK',
  '.KBBBBBBBBK.',
  '..KKKKKKKK..',
];

// ─────────────────────────────────────────────────────────────────────────────
// Player — SUPER (14×22). Tall Base-blue cube stack with cream eyes.
// ─────────────────────────────────────────────────────────────────────────────
export const PLAYER_L_IDLE: SpriteKey = [
  '...KKKKKKKK...',
  '..KBBBBBBBBK..',
  '.KBLLBBBBBBLK.',
  '.KBLLBBBBBBBK.',
  '.KBIIBBBBIIBK.',
  '.KBIIBBBBIIBK.',
  '.KBBBBBBBBBBK.',
  '.KBBBBDDBBBBK.',
  '.KBBBBDDBBBBK.',
  '.KBBBBBBBBBBK.',
  '..KKBBBBBBKK..',
  '...KBBBBBBK...',
  '...KBBBBBBK...',
  '...KBBBBBBK...',
  '...KBBLLBBK...',
  '...KBLLLLBK...',
  '...KBLLLLBK...',
  '...KBBLLBBK...',
  '...KBBBBBBK...',
  '...KBBBBBBK...',
  '...KKKKKKKK...',
  '..............',
];
export const PLAYER_L_RUN_A: SpriteKey = [
  '...KKKKKKKK...',
  '..KBBBBBBBBK..',
  '.KBLLBBBBBBLK.',
  '.KBLLBBBBBBBK.',
  '.KBIIBBBBIIBK.',
  '.KBIIBBBBIIBK.',
  '.KBBBBBBBBBBK.',
  '.KBBBBDDBBBBK.',
  '.KBBBBDDBBBBK.',
  '.KBBBBBBBBBBK.',
  '..KKBBBBBBKK..',
  '...KBBBBBBK...',
  '...KBBBBBBK...',
  '...KBBLLBBK...',
  '...KBLLBLLBK..',
  '...KBLBBBLBK..',
  '...KBLBBBBBK..',
  '...KKBBBBBK...',
  '....KBBBBBK...',
  '....KKKKKK....',
  '..............',
  '..............',
];
export const PLAYER_L_RUN_B: SpriteKey = [
  '...KKKKKKKK...',
  '..KBBBBBBBBK..',
  '.KBLLBBBBBBLK.',
  '.KBLLBBBBBBBK.',
  '.KBIIBBBBIIBK.',
  '.KBIIBBBBIIBK.',
  '.KBBBBBBBBBBK.',
  '.KBBBBDDBBBBK.',
  '.KBBBBDDBBBBK.',
  '.KBBBBBBBBBBK.',
  '..KKBBBBBBKK..',
  '...KBBBBBBK...',
  '...KBBBBBBK...',
  '...KBBLLBBK...',
  '..KBLLBLLBK...',
  '..KBLBBBLBK...',
  '..KBBBBBLBK...',
  '...KBBBBKK....',
  '...KBBBBBK....',
  '....KKKKKK....',
  '..............',
  '..............',
];
export const PLAYER_L_JUMP: SpriteKey = [
  '...KKKKKKKK...',
  '..KBLLBBBBBK..',
  '.KBLLBBBBBBLK.',
  '.KBLLBBBBBBBK.',
  '.KBIBBBBBBIBK.',
  '.KBIBBBBBBIBK.',
  '.KBBBBBBBBBBK.',
  '.KBBBBBBBBBBK.',
  '.KBBBBDDBBBBK.',
  '.KBBBBDDBBBBK.',
  '..KKBBBBBBKK..',
  '...KBBBBBBK...',
  '...KBBBBBBK...',
  '...KBBLLBBK...',
  '...KBLLLLBK...',
  '..KBLLBBLLBK..',
  '..KBLLBBLLBK..',
  '..KKLBBBBLKK..',
  '...KLBBBBLK...',
  '...KLBBBBLK...',
  '...KKKKKKKK...',
  '..............',
];
export const PLAYER_L_CROUCH: SpriteKey = [
  '..............',
  '..............',
  '...KKKKKKKK...',
  '..KBBBBBBBBK..',
  '.KBLLBBBBBBLK.',
  '.KBIIBBBBIIBK.',
  '.KBIIBBBBIIBK.',
  '.KBBBBBBBBBBK.',
  '.KBBBBDDBBBBK.',
  '.KBBBBDDBBBBK.',
  '..KKBBBBBBKK..',
  '...KBBLLBBK...',
  '..KBBLLLLBBK..',
  '..KBLBBBBBLK..',
  '..KBLBBBBBLK..',
  '...KBBBBBBK...',
  '...KKBBBBKK...',
  '....KKKKKK....',
  '..............',
  '..............',
  '..............',
  '..............',
];

// ─────────────────────────────────────────────────────────────────────────────
// Goomba (bug) — 12×12. Red glitchy creeper.
// ─────────────────────────────────────────────────────────────────────────────
export const GOOMBA_A: SpriteKey = [
  '...KKKKKK...',
  '..KRRRRRRK..',
  '.KRRRRRRRRK.',
  'KRRRRRRRRRRK',
  'KRRIIRRRRRRK',
  'KRRIIRRRRRRK',
  'KRRRNNRRRRRK',
  'KRRRRRRRNNRK',
  'KRRRRRRRRRRK',
  '.KRRRRRRRRK.',
  '..KK.KK.KK..',
  '............',
];
export const GOOMBA_B: SpriteKey = [
  '...KKKKKK...',
  '..KRRRRRRK..',
  '.KRRRRRRRRK.',
  'KRRRRRRRRRRK',
  'KRRIIRRRRRRK',
  'KRRIIRRRRRRK',
  'KRRRNNRRRRRK',
  'KRRRRRRRNNRK',
  'KRRRRRRRRRRK',
  '.KRRRRRRRRK.',
  '..KK.KK.KK..',
  '..K....K...K',
];
export const GOOMBA_DEAD: SpriteKey = [
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '....KKKK....',
  '..KRRRRRRK..',
  'KKRRRRRRRRKK',
  '.KKKKKKKKKK.',
];

// ─────────────────────────────────────────────────────────────────────────────
// Koopa Troopa — 13×18. Green shell + yellow head + cyan eyes.
// Palette: G=koopaShell V=koopaShellDark v=koopaShellEdge Y=koopaSkin n=koopaSkinDark
// ─────────────────────────────────────────────────────────────────────────────
export const KOOPA_A: SpriteKey = [
  '.....KKKK....',
  '....KYYYYK...',
  '....KIIYYK...',
  '....KYYYYK...',
  '...KYYYYYYK..',
  '....KKKKKK...',
  '..KGGGGGGGGK.',
  '.KvGGVVGGGvGK',
  '.KGGGVVGGGGGK',
  '.KGGGGGGGGGGK',
  '.KvGGVVGGGGvK',
  '.KGGGGGGGGGGK',
  '..KGGVVGGGGGK',
  '..KGGGGGGGGK.',
  '...KKKKKKKK..',
  '...KYY..YYK..',
  '...KYY..YYK..',
  '....KK..KK...',
];
export const KOOPA_B: SpriteKey = [
  '.....KKKK....',
  '....KYYYYK...',
  '....KYYIIK...',
  '....KYYYYK...',
  '...KYYYYYYK..',
  '....KKKKKK...',
  '..KGGGGGGGGK.',
  '.KGGGVVGGGGGK',
  '.KvGGVVGGGvGK',
  '.KGGGGGGGGGGK',
  '.KGGGGGGGGGvK',
  '.KGGVVGGGGGGK',
  '..KGGGGVVGGGK',
  '..KGGGGGGGGK.',
  '...KKKKKKKK..',
  '...KYY..YYK..',
  '....KK....KK.',
  '...........K.',
];
// Shell (idle / sliding) — 14×12
export const SHELL: SpriteKey = [
  '....KKKKKK....',
  '..KKGGGGGGKK..',
  '.KGGVVGGVVGGK.',
  'KGGGVVGGVVGGGK',
  'KvGGGGGGGGGGvK',
  'KGGGGGGGGGGGGK',
  'KGGVVGGGGVVGGK',
  'KGGVVGGGGVVGGK',
  'KvGGGGGGGGGGvK',
  'KGGGGGGGGGGGGK',
  '.KKGGGGGGGGKK.',
  '...KKKKKKKK...',
];

// ─────────────────────────────────────────────────────────────────────────────
// Piranha Plant — 14×22. Red head + green stem.
// Palette: r=piranhaBody n=piranhaDark s=piranhaStem t=piranhaStemDark I=ivory K=outline
// ─────────────────────────────────────────────────────────────────────────────
export const PIRANHA_A: SpriteKey = [
  '..K..KKKK..K..',
  '.KrK.K..K.Krk.',
  '.Kr.KK..KK.rK.',
  'KrrKnnnKKKnrrK',
  'KrrKnnnnnnnrrK',
  'KrrKnnnKKKnrrK',
  '.KrKKnIKIKKrK.',
  '..KKKKKKKKKK..',
  '.KrrrrrrrrrrK.',
  '.KrnnnKKKnnrK.',
  '.KrnnnKKKnnrK.',
  '.KrrrrrrrrrrK.',
  '..KKsstsKK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KKKKKKK....',
  '..............',
];
export const PIRANHA_B: SpriteKey = [
  '..K..KKKK..K..',
  '.KrKKK..KKKrK.',
  'KrrnnnnnnnnrrK',
  'KrnnnKKKKKKnrK',
  'KrnnnKKIIKKnrK',
  'KrnnnKKIIKKnrK',
  'KrnnnnnnnnnnrK',
  '.KrrrrrrrrrrK.',
  '.KrnnnKKKnnrK.',
  '.KrnnnKKKnnrK.',
  '.KrrrrrrrrrrK.',
  '..KKsstsKK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KstttsK....',
  '...KKKKKKK....',
  '..............',
];

// ─────────────────────────────────────────────────────────────────────────────
// Bowser — 24×24. Green dragon-cube with crown.
// Palette: G=bowserBody V=bowserDark Y=bowserCrown R=bowserEye W=bowserBack
// ─────────────────────────────────────────────────────────────────────────────
export const BOWSER_A: SpriteKey = [
  '........KKKK............',
  '......KKYYYYKK..........',
  '....KKYYYYYYYYKK........',
  '...KYYYYYYYYYYYYK.......',
  '....KKKKKKKKKKKK........',
  '..KKGGGGGGGGGGGGKK......',
  '.KGGGGGGGGGGGGGGGGK.....',
  'KGGRRGGGGGGRRGGGGGGK....',
  'KGGRRGGGGGGRRGGGGGGK....',
  'KGGGGGGGGGGGGGGGGGGK....',
  'KGGGGGGKKKKGGGGGGGGGK...',
  'KGGGGGGGGGGGGGGGGGGK....',
  '.KGGGGGGGGGGGGGGGGK.....',
  '..KGGGGGGGGGGGGGGGGK....',
  '.KWWGGGGGGGGGGGGGGGGK...',
  '.KWWGGGGGGGGGGGGGGGGK...',
  '.KWWWGGGGGGGGGGGGGGGK...',
  '.KWWWGGGGGGGGGGGGGGGK...',
  '.KWWGGGGGGGGGGGGGGGGK...',
  '..KGGGGGGGGGGGGGGGGK....',
  '..KGGGGKKKKKKGGGGGGK....',
  '..KGGKK....KKGGGGGGK....',
  '..KKK........KKKGGGK....',
  '.................KKKK...',
];
export const BOWSER_B: SpriteKey = [
  '........KKKK............',
  '......KKYYYYKK..........',
  '....KKYYYYYYYYKK........',
  '...KYYYYYYYYYYYYK.......',
  '....KKKKKKKKKKKK........',
  '..KKGGGGGGGGGGGGKK......',
  '.KGGGGGGGGGGGGGGGGK.....',
  'KGGRRGGGGGGRRGGGGGGK....',
  'KGGRRGGGGGGRRGGGGGGK....',
  'KGGGGGGGGGGGGGGGGGGK....',
  'KGGGRGGGKKKKGGGGGGGGK...',
  'KGGGGGGGGGGGGGGGGGGK....',
  '.KGGGGGGGGGGGGGGGGK.....',
  '..KGGGGGGGGGGGGGGGGK....',
  '.KWWGGGGGGGGGGGGGGGGK...',
  '.KWWGGGGGGGGGGGGGGGGK...',
  '.KWWWGGGGGGGGGGGGGGGK...',
  '.KWWWGGGGGGGGGGGGGGGK...',
  '.KWWGGGGGGGGGGGGGGGGK...',
  '..KGGGGGGGGGGGGGGGGK....',
  '..KGGKKKKKKGGGGGGGGK....',
  '..KKK.....KKGGGGGGGK....',
  '...........KKKKGGGGK....',
  '...............KKKKK....',
];

// ─────────────────────────────────────────────────────────────────────────────
// Mushroom — 14×14. Red cap + ivory dots + gold stem.
// Palette: m=mushroomCap s=mushroomSpot t=mushroomStem K=outline
// ─────────────────────────────────────────────────────────────────────────────
export const MUSHROOM: SpriteKey = [
  '....KKKKKK....',
  '..KKmmmmmmKK..',
  '.KmmmmsssmmmK.',
  'KmmssssssssmmK',
  'KmssssmmmsssmK',
  'KmsmmmmmmmmsmK',
  'KmmmmmmsssmmmK',
  'KmmmsssssmmmmK',
  '.KmmmmmmmmmmK.',
  '..KKKttttKKK..',
  '...KttttttK...',
  '...KtIIIItK...',
  '...KtIIIItK...',
  '...KKKKKKK....',
];

// ─────────────────────────────────────────────────────────────────────────────
// Fire Flower — 14×14. Cyan petals + gold core + green stem.
// Palette: p=fireFlowerPet c=fireFlowerCore t=mushroomStem
// ─────────────────────────────────────────────────────────────────────────────
export const FIRE_FLOWER_A: SpriteKey = [
  '....KKKKKK....',
  '...KppppppK...',
  '..Kpppccccpp..',
  '.Kpppccccpppp.',
  'Kpccccccccccpk',
  'Kpccccccccccpk',
  'Kpcccc..ccccpk',
  '.Kpccccccccpk.',
  '..KpppccccppK.',
  '...Kpppppppk..',
  '....KKttttKK..',
  '....KttttttK..',
  '....KttttttK..',
  '....KKKKKKK...',
];
export const FIRE_FLOWER_B: SpriteKey = [
  '....KKKKKK....',
  '...KppppppK...',
  '..KpppcccpppK.',
  '.Kpppcccccppp.',
  'Kpcccc..ccccpk',
  'Kpccccccccccpk',
  'Kpccccccccccpk',
  '.Kpccccccccpk.',
  '..KpppccccppK.',
  '...Kpppppppk..',
  '....KKttttKK..',
  '....KttttttK..',
  '....KttttttK..',
  '....KKKKKKK...',
];

// Coin — 8×12 vertically animated
export const COIN_A: SpriteKey = [
  '..KKKK..',
  '.KYYYYK.',
  'KYWWYYYK',
  'KYWWYYYK',
  'KYWWYYYK',
  'KYWWYYYK',
  'KYWWYYYK',
  'KYWWYYYK',
  'KYWWYYYK',
  'KYWWYYYK',
  '.KYYYYK.',
  '..KKKK..',
];
export const COIN_B: SpriteKey = [
  '...KK...',
  '..KYYK..',
  '.KYWWYK.',
  '.KYWWYK.',
  '.KYWWYK.',
  '.KYWWYK.',
  '.KYWWYK.',
  '.KYWWYK.',
  '.KYWWYK.',
  '.KYWWYK.',
  '..KYYK..',
  '...KK...',
];

// Base Queen — 16×24. Cyan cube character with a gold crown. Original Base-themed
// design (not based on any other game's princess); same blocky style as player.
// Palette: c=baseCyan I=baseIvory K=outline Y=gold W=ivory accent
export const QUEEN: SpriteKey = [
  '...K.K.K.K......',     // crown peaks
  '..KYKYKYKYKK....',     // crown spikes
  '.KYYYYYYYYYYK...',     // crown base
  '.KYWYYWYYWYYK...',     // crown with 3 ivory jewels
  'KKKKKKKKKKKKKKK.',     // top of head
  'KccccccccccccK..',
  'KcIIcccccccIIcK.',     // eyes (ivory)
  'KcIIcccccccIIcK.',
  'KccccccccccccK..',
  'KccccccccccccK..',
  'KccccccKKccccK..',     // mouth (small)
  'KccccccccccccK..',
  'KccccccccccccK..',
  'KccccccccccccK..',
  '.KcccccccccccK..',
  '.KcccccccccccK..',
  '.KcccccccccccK..',
  '.KccIIcccIIccK..',     // belt-line accent
  '.KcccccccccccK..',
  '.KcccccccccccK..',
  '..KccccccccccK..',
  '..KKKKKKKKKKKK..',
  '................',
  '................',
];

// Star — 14×14. 5-point star approximation.
// Palette: Y=star body Y W=star highlight w K=outline
export const STAR_A: SpriteKey = [
  '......KK......',
  '.....KYYK.....',
  '.....KYYK.....',
  '....KYWWYK....',
  'KKKKKYWWYKKKKK',
  'KYYYYYYYYYYYYK',
  'KYwWWWYYWWWwYK',
  '.KYWWWYYWWWYK.',
  '..KYWYYYYWYK..',
  '..KYYWWYWYYK..',
  '.KYYWYKKYYWYK.',
  '.KYYK....KYYK.',
  'KKKK......KKKK',
  '..............',
];
export const STAR_B: SpriteKey = [
  '......KK......',
  '.....KYWK.....',
  '.....KWYK.....',
  '....KYWWYK....',
  'KKKKKYWWYKKKKK',
  'KYYYYYWWYYYYYK',
  'KYWWWWYYWWWWYK',
  '.KYWWWYYWWWYK.',
  '..KYWYYYYWYK..',
  '..KYYWYYYWYYK.',
  '.KYYWYKKYYWYK.',
  '.KYYK....KYYK.',
  'KKKK......KKKK',
  '..............',
];

// Fireball — 6×6
export const FIREBALL: SpriteKey = [
  '.KYYK.',
  'KYWWYK',
  'KYWWYK',
  'KYWWYK',
  'KYWWYK',
  '.KYYK.',
];

// Bowser Fire — 8×6
export const BOWSER_FIRE: SpriteKey = [
  '..KRRR..',
  '.KRWYYK.',
  'KRRRYYRK',
  'KRRYYYRK',
  '.KYYYRK.',
  '..KRRK..',
];

// Axe — 12×12 (handle + blade)
export const AXE: SpriteKey = [
  '...KIIIIK...',
  '..KIWWWWIK..',
  '.KIWWWWWWIK.',
  'KIWWWWWWWWIK',
  'KIWWWWWWWWIK',
  '.KIWWWWWWIK.',
  '..KIWWWWIK..',
  '...KhhhhK...',
  '...KhhhhK...',
  '...KhhhhK...',
  '...KhhhhK...',
  '...KKKKKK...',
];

// Spike — 16×8
export const SPIKE: SpriteKey = [
  '.K....K....K....',
  '.SK..KSK..KSK...',
  '.SSK.SSEK.SSEK..',
  'KSSSESSEEKSSEEK.',
  'SSSEESSEEESSEEEK',
  'SSSEEEEESEEEEEEE',
  'EEEEEEEEEEEEEEEE',
  'EEEEEEEEEEEEEEEE',
];

// Flag pole + cloth (drawn as separate top sprite + pole line procedurally)
export const FLAG_CLOTH: SpriteKey = [
  'KKKKKKKKK',
  'KCCCCCCK.',
  'KCCCCCK..',
  'KCCCCK...',
  'KCCCK....',
  'KCCK.....',
  'KCK......',
  'KK.......',
];

export const PALETTE: Record<string, string> = {
  K: '#050a16',
  B: '#0052FF',   // player body
  D: '#0040C0',   // player dark
  L: '#3D7BFF',   // player light
  I: '#EEF4FF',   // ivory
  R: '#FF4D6D',
  N: '#A11D3A',
  S: '#7B8AA8',
  E: '#3F4D6E',
  C: '#00D4FF',
  c: '#00D4FF',
  G: '#00B040',   // koopa shell green
  V: '#005020',   // koopa shell dark
  v: '#7FE0A0',   // koopa shell edge
  Y: '#FFD23F',   // gold / koopa skin
  n: '#A11D3A',   // piranha dark
  r: '#FF4D6D',   // piranha body
  s: '#00B040',   // piranha stem
  t: '#005020',   // piranha stem dark / mushroom stem
  m: '#FF4D6D',   // mushroom cap (red)
  p: '#00D4FF',   // fire-flower petals (cyan)
  W: '#FFB300',   // bowser back / coin core
  w: '#FFE680',   // coin highlight
  h: '#7A2F08',   // axe handle brown
  e: '#2C4880',   // ground edge
  g: '#FFD23F',
};

export type PaletteOverride = Partial<Record<string, string>>;

// ─────────────────────────────────────────────────────────────────────────────
// Sprite bake cache — converts the per-pixel fillRect loop into a single
// drawImage call. Each unique (sprite, palette) combo is baked once into an
// offscreen canvas at 1× scale; subsequent draws blit it at the requested
// scale via drawImage. On mobile this is a ~100× speedup per sprite.
// ─────────────────────────────────────────────────────────────────────────────

const bakeCache = new WeakMap<SpriteKey, Map<string, HTMLCanvasElement>>();

function paletteKey(palette: PaletteOverride): string {
  const keys = Object.keys(palette);
  if (keys.length === 0) return '_';
  keys.sort();
  let out = '';
  for (const k of keys) out += k + ':' + palette[k] + ',';
  return out;
}

function bakeSprite(sprite: SpriteKey, palette: PaletteOverride): HTMLCanvasElement {
  const w = sprite[0]?.length ?? 0;
  const h = sprite.length;
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const bctx = c.getContext('2d');
  if (!bctx) return c;
  bctx.imageSmoothingEnabled = false;
  for (let row = 0; row < h; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch] ?? PALETTE[ch];
      if (!color) continue;
      bctx.fillStyle = color;
      bctx.fillRect(col, row, 1, 1);
    }
  }
  return c;
}

function getBakedSprite(sprite: SpriteKey, palette: PaletteOverride): HTMLCanvasElement {
  let inner = bakeCache.get(sprite);
  if (!inner) {
    inner = new Map();
    bakeCache.set(sprite, inner);
  }
  const pk = paletteKey(palette);
  let baked = inner.get(pk);
  if (!baked) {
    baked = bakeSprite(sprite, palette);
    inner.set(pk, baked);
  }
  return baked;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteKey,
  x: number,
  y: number,
  scale: number,
  flipX = false,
  palette: PaletteOverride = {},
) {
  const baked = getBakedSprite(sprite, palette);
  const w = baked.width * scale;
  const h = baked.height * scale;
  if (flipX) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(baked, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(baked, x, y, w, h);
  }
}
