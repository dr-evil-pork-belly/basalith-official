/* fingerprint-field.js
 *
 * Generates the homepage hero fingerprint as evenly-spaced STREAMLINES of a
 * loop+delta orientation field (Sherlock-Monro zero-pole model), traced with
 * the Jobard-Lefebvre algorithm. Ridges flow and recurve and converge to a
 * triangular delta on one side; they do NOT share a single center.
 *
 *   theta(x,y) = 0.5*atan2(y-CORE_y, x-CORE_x) - 0.5*atan2(y-DELTA_y, x-DELTA_x)
 *
 * Run:  node scripts/fingerprint-field.js
 * Emits a JSX <g> of <path>s (scaled into the panel's 500x700 space) plus a
 * concentric-arc sanity check, written to scripts/fingerprint-out.txt.
 */
'use strict'
const fs = require('fs')
const path = require('path')

// ── single density knob: d_sep tuned for ~28-32 ridges ──────────────────────
const D_SEP = 8.7

// integration / tracing
const STEP      = 1.0
const D_TEST    = 0.5 * D_SEP   // min ridge gap while tracing AND seed rejection
const MAX_STEPS = 6000
const MIN_LEN   = 14.0          // discard ridge fragments shorter than this (box units)
const RDP_EPS   = 0.35          // light smoothing only — no integer rounding

// ── normalized 200x240 box: one loop core + one delta ───────────────────────
const CORE   = [100.0, 100.0]
const DELTA  = [134.0, 168.0]
const MASK_C = [100.0, 118.0]   // oval mask center
const RX = 78.0, RY = 98.0      // oval mask radii

// ── output mapping: box → panel 500x700, print center → (245,300) ───────────
const S = 1.45
const PCX = 245.0, PCY = 300.0
const BCX = 100.0, BCY = 120.0
const toPanel = (x, y) => [PCX + (x - BCX) * S, PCY + (y - BCY) * S]

// orientation field (line field, range over half-angles)
function field(x, y) {
  return 0.5 * Math.atan2(y - CORE[1], x - CORE[0])
       - 0.5 * Math.atan2(y - DELTA[1], x - DELTA[0])
}

// unit direction at a point, flipped to stay continuous with the previous heading
function dirAt(x, y, ref) {
  const th = field(x, y)
  let vx = Math.cos(th), vy = Math.sin(th)
  if (ref && vx * ref[0] + vy * ref[1] < 0) { vx = -vx; vy = -vy }
  return [vx, vy]
}

const inMask = (x, y) =>
  ((x - MASK_C[0]) / RX) ** 2 + ((y - MASK_C[1]) / RY) ** 2 <= 1.0

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

// integrate from the seed in BOTH directions, join into one ridge
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
  if (dmax > eps) {
    const a = rdp(pts.slice(0, idx + 1), eps)
    const b = rdp(pts.slice(idx), eps)
    return a.slice(0, -1).concat(b)
  }
  return [pts[0], pts[pts.length - 1]]
}

// ── Jobard-Lefebvre evenly-spaced seeding ───────────────────────────────────
const seeds = [[100.0, 132.0]]   // initial seed near, but not on, the core
const committed = []
while (seeds.length) {
  const s = seeds.shift()
  if (!inMask(s[0], s[1])) continue
  if (nearCommitted(s[0], s[1], D_TEST)) continue
  const line = trace(s)
  if (polyLen(line) < MIN_LEN) continue
  for (const p of line) addPoint(p[0], p[1])
  committed.push(line)
  // spawn perpendicular candidate seeds at +/- d_sep along the new ridge
  for (let i = 0; i < line.length; i += 2) {
    const [x, y] = line[i]
    const j = i + 1 < line.length ? i + 1 : i - 1
    if (j < 0) continue
    let tx = line[j][0] - x, ty = line[j][1] - y
    if (j < i) { tx = -tx; ty = -ty }
    const tl = Math.hypot(tx, ty); if (!tl) continue
    const nx = -ty / tl, ny = tx / tl  // perpendicular
    for (const sgn of [+1, -1]) {
      const sx = x + sgn * D_SEP * nx, sy = y + sgn * D_SEP * ny
      if (inMask(sx, sy) && !nearCommitted(sx, sy, D_TEST)) seeds.push([sx, sy])
    }
  }
}

// ── concentric-arc sanity check ─────────────────────────────────────────────
// For concentric arcs every ridge normal passes through ONE center, so the
// least-squares intersection of all normals has ~0 residual. A loop+delta
// field gives a large residual (no shared center).
let Axx = 0, Axy = 0, Ayy = 0, bx = 0, by = 0, samples = 0
for (const ln of committed) {
  for (let i = 1; i < ln.length; i++) {
    const px = ln[i - 1][0], py = ln[i - 1][1]
    let tx = ln[i][0] - px, ty = ln[i][1] - py
    const tl = Math.hypot(tx, ty); if (!tl) continue
    tx /= tl; ty /= tl
    const a = 1 - tx * tx, b = -tx * ty, c = 1 - ty * ty // (I - t t^T)
    Axx += a; Axy += b; Ayy += c
    bx += a * px + b * py
    by += b * px + c * py
    samples++
  }
}
const det = Axx * Ayy - Axy * Axy
const Cx = (Ayy * bx - Axy * by) / det
const Cy = (Axx * by - Axy * bx) / det
let resid = 0
for (const ln of committed) {
  for (let i = 1; i < ln.length; i++) {
    const px = ln[i - 1][0], py = ln[i - 1][1]
    let tx = ln[i][0] - px, ty = ln[i][1] - py
    const tl = Math.hypot(tx, ty); if (!tl) continue
    tx /= tl; ty /= tl
    const ex = Cx - px, ey = Cy - py
    const perp = ex * (-ty) + ey * tx   // distance from C to the normal line
    resid += perp * perp
  }
}
const rms = Math.sqrt(resid / samples)

// ── emit JSX <g> of scaled, one-decimal paths ───────────────────────────────
const paths = committed.map(ln => {
  const simp = rdp(ln, RDP_EPS).map(([x, y]) => toPanel(x, y))
  const d = 'M ' + simp.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')
  return `            <path d="${d}" />`
}).join('\n')

const jsx =
`          <g fill="none" stroke="rgb(184,150,62)" strokeOpacity={0.6} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round">
${paths}
          </g>`

const report =
`RIDGES: ${committed.length}
SAMPLES: ${samples}
CONCENTRIC-ARC CHECK (least-squares shared-center): center=(${Cx.toFixed(1)}, ${Cy.toFixed(1)}) box units, RMS residual=${rms.toFixed(1)} box units
  -> RMS near 0 would mean concentric arcs. ${rms > 10 ? 'PASS: large residual, ridges do NOT share a center.' : 'FAIL: looks concentric.'}
`

fs.writeFileSync(path.join(__dirname, 'fingerprint-out.txt'), jsx + '\n')
process.stdout.write(report)
process.stdout.write(jsx.slice(0, 400) + '\n...\n')
