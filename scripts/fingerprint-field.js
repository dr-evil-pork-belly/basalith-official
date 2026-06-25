/* fingerprint-field.js
 *
 * Generates the homepage hero "cognitive fingerprint" as evenly-spaced
 * STREAMLINES of a loop+delta orientation field (Sherlock-Monro zero-pole
 * model), traced with the Jobard-Lefebvre algorithm and CLIPPED TO A BRAIN
 * silhouette. Ridges flow and recurve and converge to a triangular delta on
 * one side; they do NOT share a single center.
 *
 *   theta(x,y) = SWIRL*atan2(y-CORE_y, x-CORE_x) - SWIRL*atan2(y-DELTA_y, x-DELTA_x)
 *
 * Run:  node scripts/fingerprint-field.js
 * Emits (to scripts/fingerprint-out.txt) the ridge <path>s plus the brain
 * outline as one smooth <path>, scaled into the panel's 500x700 space, and
 * prints a concentric-arc sanity check.
 */
'use strict'
const fs = require('fs')
const path = require('path')

// ── single density knob: d_sep tuned for ~30-34 ridges ──────────────────────
const D_SEP = 8.5

// integration / tracing
const STEP      = 1.0
const D_TEST    = 0.5 * D_SEP   // min ridge gap while tracing AND seed rejection
const MAX_STEPS = 6000
const MIN_LEN   = 9.0           // discard ridge fragments shorter than this (box units)
const RDP_EPS   = 0.30          // light smoothing only — no integer rounding

// ── loop core + delta field (in the 215x180 design box) ─────────────────────
const CORE  = [104.0, 92.0]
const DELTA = [162.0, 132.0]
const SWIRL = 0.5

// ── brain silhouette (side profile), cubic beziers in the 215x180 box ───────
const G = 3.0                    // gyri depth
const A = G * 0.4, B = G * 0.6
const START = [40.0, 130.0]
const SEGS = [
  [[20, 110],     [25, 70],       [55, 55]],
  [[65, 40 - A],  [85, 38 - B],   [95, 50 + G]],
  [[105, 38 - B], [125, 38 - B],  [135, 50 + G]],
  [[145, 38 - B], [168, 40 - A],  [178, 58]],
  [[198, 72],     [200, 95],      [188, 110]],
  [[196, 118],    [198, 130],     [188, 138]],
  [[192, 150],    [190, 162],     [178, 160]],
  [[175, 150],    [178, 142],     [170, 140]],
  [[150, 148],    [120, 150],     [95, 145]],
  [[80, 152],     [60, 150],      [52, 140]],
  [[44, 138],     [40, 134],      [40, 130]],
]

// sample the beziers to a polygon for point-in-polygon containment
function cubic(p0, p1, p2, p3, t) {
  const m = 1 - t
  return [
    m*m*m*p0[0] + 3*m*m*t*p1[0] + 3*m*t*t*p2[0] + t*t*t*p3[0],
    m*m*m*p0[1] + 3*m*m*t*p1[1] + 3*m*t*t*p2[1] + t*t*t*p3[1],
  ]
}
const POLY = []
{
  let cur = START
  for (const [c1, c2, end] of SEGS) {
    for (let k = 1; k <= 30; k++) POLY.push(cubic(cur, c1, c2, end, k / 30))
    cur = end
  }
}
function inBrain(x, y) {
  let inside = false
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const xi = POLY[i][0], yi = POLY[i][1], xj = POLY[j][0], yj = POLY[j][1]
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside
  }
  return inside
}
const inMask = inBrain

// ── output mapping: box → panel 500x700, brain bbox center → (245,300) ───────
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
for (const [x, y] of POLY) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
const BCX = (minX + maxX) / 2, BCY = (minY + maxY) / 2
const S = 1.45
const PCX = 245.0, PCY = 300.0
const toPanel = (x, y) => [PCX + (x - BCX) * S, PCY + (y - BCY) * S]

// orientation field (line field over half-angles)
function field(x, y) {
  return SWIRL * Math.atan2(y - CORE[1], x - CORE[0])
       - SWIRL * Math.atan2(y - DELTA[1], x - DELTA[0])
}
function dirAt(x, y, ref) {
  const th = field(x, y)
  let vx = Math.cos(th), vy = Math.sin(th)
  if (ref && vx * ref[0] + vy * ref[1] < 0) { vx = -vx; vy = -vy }
  return [vx, vy]
}

// ── spatial grid over committed ridge points for the separation test ────────
const CELL = D_SEP
const grid = new Map()
const gkey = (x, y) => Math.floor(x / CELL) + ',' + Math.floor(y / CELL)
function addPoint(x, y) {
  const k = gkey(x, y)
  if (!grid.has(k)) grid.set(k, [])
  grid.get(k).push([x, y])
}
function nearCommitted(x, y, dmin) {
  const ci = Math.floor(x / CELL), cj = Math.floor(y / CELL)
  const d2 = dmin * dmin
  for (let i = ci - 1; i <= ci + 1; i++)
    for (let j = cj - 1; j <= cj + 1; j++) {
      const cell = grid.get(i + ',' + j)
      if (!cell) continue
      for (const [px, py] of cell)
        if ((px - x) ** 2 + (py - y) ** 2 < d2) return true
    }
  return false
}

// ── RK2 streamline integration in ONE direction (line field) ────────────────
function integrate(seed, sign) {
  const pts = []
  let [x, y] = seed
  let [vx, vy] = dirAt(x, y, null)
  if (sign < 0) { vx = -vx; vy = -vy }
  let ref = [vx, vy]
  for (let n = 0; n < MAX_STEPS; n++) {
    const d1 = dirAt(x, y, ref)
    const mx = x + 0.5 * STEP * d1[0], my = y + 0.5 * STEP * d1[1]
    const d2 = dirAt(mx, my, d1)
    const nx = x + STEP * d2[0], ny = y + STEP * d2[1]
    if (!inMask(nx, ny)) break
    if (nearCommitted(nx, ny, D_TEST)) break
    pts.push([nx, ny])
    x = nx; y = ny; ref = d2
  }
  return pts
}
function trace(seed) {
  const fwd = integrate(seed, +1)
  const bwd = integrate(seed, -1); bwd.reverse()
  return [...bwd, seed, ...fwd]
}
const polyLen = (ln) => {
  let s = 0
  for (let i = 1; i < ln.length; i++) s += Math.hypot(ln[i][0] - ln[i - 1][0], ln[i][1] - ln[i - 1][1])
  return s
}

// Ramer-Douglas-Peucker — light smoothing, keeps curves
function rdp(pts, eps) {
  if (pts.length < 3) return pts
  let dmax = 0, idx = 0
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len
    if (d > dmax) { dmax = d; idx = i }
  }
  if (dmax > eps) return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps))
  return [pts[0], pts[pts.length - 1]]
}

// ── Jobard-Lefebvre evenly-spaced seeding ───────────────────────────────────
const seeds = [[104.0, 105.0]]   // initial seed inside the brain, near the core
const committed = []
while (seeds.length) {
  const s = seeds.shift()
  if (!inMask(s[0], s[1])) continue
  if (nearCommitted(s[0], s[1], D_TEST)) continue
  const line = trace(s)
  if (polyLen(line) < MIN_LEN) continue
  for (const p of line) addPoint(p[0], p[1])
  committed.push(line)
  for (let i = 0; i < line.length; i += 2) {
    const [x, y] = line[i]
    const j = i + 1 < line.length ? i + 1 : i - 1
    if (j < 0) continue
    let tx = line[j][0] - x, ty = line[j][1] - y
    if (j < i) { tx = -tx; ty = -ty }
    const tl = Math.hypot(tx, ty); if (!tl) continue
    const nx = -ty / tl, ny = tx / tl
    for (const sgn of [+1, -1]) {
      const sx = x + sgn * D_SEP * nx, sy = y + sgn * D_SEP * ny
      if (inMask(sx, sy) && !nearCommitted(sx, sy, D_TEST)) seeds.push([sx, sy])
    }
  }
}

// ── sanity gates ────────────────────────────────────────────────────────────
// (a) concentric-arc check: least-squares shared center of all ridge normals.
let Axx = 0, Axy = 0, Ayy = 0, bx = 0, by = 0, samples = 0
for (const ln of committed)
  for (let i = 1; i < ln.length; i++) {
    const px = ln[i - 1][0], py = ln[i - 1][1]
    let tx = ln[i][0] - px, ty = ln[i][1] - py
    const tl = Math.hypot(tx, ty); if (!tl) continue
    tx /= tl; ty /= tl
    const a = 1 - tx * tx, b = -tx * ty, c = 1 - ty * ty
    Axx += a; Axy += b; Ayy += c; bx += a * px + b * py; by += b * px + c * py; samples++
  }
const det = Axx * Ayy - Axy * Axy
const Cx = (Ayy * bx - Axy * by) / det, Cy = (Axx * by - Axy * bx) / det
let resid = 0
for (const ln of committed)
  for (let i = 1; i < ln.length; i++) {
    const px = ln[i - 1][0], py = ln[i - 1][1]
    let tx = ln[i][0] - px, ty = ln[i][1] - py
    const tl = Math.hypot(tx, ty); if (!tl) continue
    tx /= tl; ty /= tl
    const perp = (Cx - px) * (-ty) + (Cy - py) * tx
    resid += perp * perp
  }
const rms = Math.sqrt(resid / samples)
// (b) containment: every ridge point must lie inside the brain mask.
let outside = 0
for (const ln of committed) for (const [x, y] of ln) if (!inMask(x, y)) outside++

// ── emit JSX: ridge <path>s (inherit <g> paint) + brain outline <path> ──────
const ridgePaths = committed.map(ln => {
  const d = 'M ' + rdp(ln, RDP_EPS).map(([x, y]) => { const [px, py] = toPanel(x, y); return `${px.toFixed(1)} ${py.toFixed(1)}` }).join(' L ')
  return `            <path d="${d}" />`
}).join('\n')

const fmt = (p) => { const [x, y] = toPanel(p[0], p[1]); return `${x.toFixed(1)} ${y.toFixed(1)}` }
let outlineD = `M ${fmt(START)}`
for (const [c1, c2, end] of SEGS) outlineD += ` C ${fmt(c1)} ${fmt(c2)} ${fmt(end)}`
outlineD += ' Z'
const outlinePath = `            {/* Brain silhouette */}\n            <path d="${outlineD}" strokeWidth={1.4} strokeOpacity={0.72} />`

fs.writeFileSync(path.join(__dirname, 'fingerprint-out.txt'), ridgePaths + '\n' + outlinePath + '\n')

process.stdout.write(
`RIDGES: ${committed.length}
SAMPLES: ${samples}
CONTAINMENT: ${outside} ridge points outside the brain mask (must be 0).
CONCENTRIC-ARC CHECK (least-squares shared-center): center=(${Cx.toFixed(1)}, ${Cy.toFixed(1)}) box units, RMS residual=${rms.toFixed(1)} box units
  -> ${rms > 10 && outside === 0 ? 'PASS: large residual (not concentric) AND all ridges inside the brain.' : 'FAIL.'}
`)
