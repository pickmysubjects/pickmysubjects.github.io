// Generates src/components/guide/art/Art*.vue: one small isometric scene per guide page
// (the hero illustration at the top of each 墨大入门 page).
//
// Run from the repo root:  node scripts/art/gen.cjs
// It overwrites every Art*.vue in src/components/guide/art/. Edit a scene below (or the
// isometric helpers in iso.cjs), rerun, then look at the guide pages at 1440 and 390 wide,
// light and dark. The generated files are committed; this script is only for changing them.
const fs = require('fs')
const path = require('path')
const { origin, P, poly, box, flat, wallY, wallX, ground, person, r } = require('./iso.cjs')
const OUT = path.join(__dirname, '../../src/components/guide/art/')
const scenes = {}

// A lollipop tree (lilac by default) at ground point.
function tree(x, y, s = 1, cls = 'li') {
  const [tx, ty] = P(x, y, 0)
  return `<g transform="translate(${tx} ${ty}) scale(${s})"><ellipse class="sh2" cx="0" cy="0" rx="10" ry="4"/><rect x="-2" y="-22" width="4" height="22" rx="2" class="trunk"/><circle cx="0" cy="-32" r="14" class="${cls}"/><circle cx="-7" cy="-26" r="9" class="${cls}"/><circle cx="7" cy="-25" r="9" class="${cls}"/><circle cx="-3" cy="-37" r="6" class="hl"/></g>`
}

// ---------- Overview: the eight sections as a small grid of tiles ----------
scenes.Overview = () => {
  origin(200, 92)
  const cols = ['pk', 'li', 'sk', 'mi', 'wa', 'li', 'pk', 'sk']
  let s = ground(0, 0, 168, 168, 10)
  let i = 0
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
    const x = 14 + gx * 52, y = 14 + gy * 52
    if (gx === 1 && gy === 1) {
      // The middle: the guide itself, an open book on a raised pink tile.
      s += `<g class="tile mid">${box(x, y, 0, 36, 36, 22, ['pkt', 'pkl', 'pkr'])}${flat(x + 7, y + 7, 22.5, 22, 22, 'bk')}<path class="ln" d="M${P(x + 18, y + 7, 22.6)} L${P(x + 18, y + 29, 22.6)}"/></g>`
      continue
    }
    const c = cols[i++]
    s += `<g class="tile" style="--i:${i}">${box(x, y, 0, 36, 36, 12)}${flat(x + 9, y + 9, 12.4, 18, 18, c)}</g>`
  }
  const css = `.art-overview .tile{animation:ao-bob 4.8s ease-in-out infinite;animation-delay:calc(var(--i,0)*-0.6s)}
.art-overview .mid{animation:ao-mid 4.8s ease-in-out infinite}
@keyframes ao-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes ao-mid{0%,100%{transform:translateY(-2px)}50%{transform:translateY(-8px)}}`
  return { s, css }
}

// ---------- Basics: a campus gate, students walking in ----------
scenes.Basics = () => {
  origin(200, 96)
  let s = ground(0, 0, 160, 160, 10)
  s += flat(0, 8, 0.2, 160, 22, 'grass') + flat(0, 130, 0.2, 160, 22, 'grass')
  s += flat(56, 66, 0.4, 104, 28, 'pa')
  // A hall behind the gate, with windows on its front.
  s += box(8, 20, 0, 34, 120, 46)
  for (let k = 0; k < 4; k++) s += wallX(42.1, 30 + k * 27, 14, 12, 20, 'win')
  s += box(4, 16, 46, 42, 128, 5, ['t', 'l', 'r'])
  // The gate: two pillars and a lintel with a pink crest.
  s += box(50, 54, 0, 12, 12, 60) + box(50, 94, 0, 12, 12, 60)
  s += box(48, 50, 60, 16, 60, 11, ['pkt', 'pkl', 'pkr'])
  s += tree(128, 24, 0.9) + tree(140, 132, 0.85, 'mi')
  const walkers = [['#c2227a', '#3a2a22'], ['#9d8bf2', '#1d1514'], ['#7aa58a', '#8a6cc9']]
  const [sx, sy] = P(150, 80), [ex, ey] = P(70, 80)
  walkers.forEach(([b, h], i) => { s += person(150, 80, b, h, 'walker', `--d:${-i * 2.4}s`) })
  const css = `.art-basics .walker{animation:ab-walk 7.2s linear infinite;animation-delay:var(--d)}
.art-basics .walker > g{animation:ab-step .5s ease-in-out infinite alternate}
@keyframes ab-walk{0%{transform:translate(0,0);opacity:0}8%{opacity:1}85%{opacity:1}100%{transform:translate(${r(ex - sx)}px,${r(ey - sy)}px);opacity:0}}
@keyframes ab-step{to{translate:0 -1.5px}}
@media (prefers-reduced-motion: reduce){.art-basics .walker:nth-of-type(2){transform:translate(${r((ex - sx) / 3)}px,${r((ey - sy) / 3)}px)}.art-basics .walker:nth-of-type(3){transform:translate(${r((ex - sx) * 0.66)}px,${r((ey - sy) * 0.66)}px)}}`
  return { s, css }
}

// A floating glass window in screen space: header bar colour, then a small glyph.
function win(x, y, w, h, cls, glyph, d) {
  return `<g class="fw" style="--d:${d}s"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" class="gls"/><rect x="${x}" y="${y}" width="${w}" height="9" rx="4.5" class="${cls}"/><g transform="translate(${x + w / 2} ${y + 9 + (h - 9) / 2})">${glyph}</g></g>`
}
const G = {
  home: '<path class="gly" d="M-8 1 L0 -7 L8 1 M-5.5 -1.5 V7 H5.5 V-1.5"/>',
  mail: '<rect x="-9" y="-6" width="18" height="12" rx="2.5" class="gly"/><path class="gly" d="M-8.5 -5 L0 1.5 L8.5 -5"/>',
  cal: '<rect x="-9" y="-7" width="18" height="15" rx="2.5" class="gly"/><path class="gly" d="M-9 -2 H9 M-4 2 h0.1 M0 2 h0.1 M4 2 h0.1 M-4 5.5 h0.1 M0 5.5 h0.1"/>',
  chat: '<path class="gly" d="M-9 -6 h18 v10 h-10 l-5 4 v-4 h-3z"/>',
  book: '<path class="gly" d="M0 -5 q-5 -3 -9 -1 v12 q4 -2 9 1 q5 -3 9 -1 v-12 q-4 -2 -9 1 v13"/>',
}

// ---------- Systems: a laptop and a phone, app windows floating above ----------
scenes.Systems = () => {
  origin(200, 118)
  let s = ground(0, 0, 160, 160, 10)
  // Laptop: base, keyboard, screen standing at the back edge.
  s += box(36, 52, 0, 76, 52, 4) + flat(42, 60, 4.2, 64, 30, 'key') + flat(60, 93, 4.2, 26, 8, 'key')
  s += wallY(36, 52, 4, 76, 52, 'r') + wallY(40, 52.2, 8, 68, 44, 'scr')
  s += wallY(46, 52.4, 40, 30, 4, 'pkt') + wallY(46, 52.4, 30, 50, 3, 'lnf') + wallY(46, 52.4, 22, 40, 3, 'lnf') + wallY(46, 52.4, 14, 46, 3, 'lnf')
  // Phone, lying down.
  s += box(118, 96, 0, 22, 38, 4) + flat(120.5, 99, 4.2, 17, 32, 'scr') + flat(123, 102, 4.3, 12, 5, 'li')
  s += tree(136, 20, 0.75)
  s += win(30, 58, 58, 42, 'pkt', G.home, 0) + win(92, 18, 58, 42, 'li', G.book, -1.2) + win(170, 6, 58, 42, 'sk', G.chat, -2.4)
  s += win(250, 22, 58, 42, 'mi', G.cal, -3.6) + win(306, 76, 58, 42, 'wa', G.mail, -1.8)
  const css = `.art-systems .fw{animation:as-float 5s ease-in-out infinite;animation-delay:var(--d)}
@keyframes as-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`
  return { s, css }
}

// ---------- Enrolling: subject cards sliding into a semester board ----------
scenes.Enrolling = () => {
  origin(200, 100)
  let s = ground(0, 0, 160, 160, 10)
  s += box(14, 22, 0, 132, 112, 7)
  const cols = [['pkt', 'pkl', 'pkr'], ['lit', 'lil', 'lir'], ['skt', 'skl', 'skr'], ['mit', 'mil', 'mir'], ['wat', 'wal', 'war']]
  const slots = []
  for (let row = 0; row < 2; row++) for (let c = 0; c < 4; c++) slots.push([22 + c * 31, 30 + row * 52])
  slots.forEach(([x, y]) => (s += flat(x, y, 7.2, 25, 44, 'slot')))
  const filled = [0, 1, 2, 4, 5, 7]
  filled.forEach((k, i) => { const [x, y] = slots[k]; s += box(x + 1, y + 1, 7, 23, 42, 4, cols[i % 5]) })
  // Two cards drop into the empty slots, one after the other.
  const [x3, y3] = slots[3], [x6, y6] = slots[6]
  s += `<g class="drop" style="--d:0s">${box(x3 + 1, y3 + 1, 7, 23, 42, 4, cols[3])}</g>`
  s += `<g class="drop" style="--d:-3s">${box(x6 + 1, y6 + 1, 7, 23, 42, 4, cols[1])}</g>`
  // Subject codes floating by, in the site's glass.
  const chip = (x, y, c, t, d) => `<g class="chip" style="--d:${d}s"><rect x="${x}" y="${y}" width="78" height="20" rx="10" class="gls"/><circle cx="${x + 11}" cy="${y + 10}" r="3" class="${c}"/><text x="${x + 19}" y="${y + 14}" class="code">${t}</text></g>`
  s += chip(30, 40, 'pkt', 'COMP10001', 0) + chip(290, 30, 'lit', 'MAST10006', -2) + chip(300, 160, 'mit', 'BIOL10004', -4)
  const css = `.art-enrolling .drop{animation:ae-drop 6s cubic-bezier(.3,.7,.2,1) infinite;animation-delay:var(--d)}
.art-enrolling .chip{animation:ae-chip 6s ease-in-out infinite;animation-delay:var(--d)}
.art-enrolling .code{font:600 9.5px var(--font-code);fill:var(--ink-soft)}
@keyframes ae-drop{0%{transform:translate(24px,-46px);opacity:0}12%{opacity:1}30%,80%{transform:translate(0,0);opacity:1}92%,100%{transform:translate(0,0);opacity:0}}
@keyframes ae-chip{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`
  return { s, css }
}

// ---------- During semester: a desk calendar turning its pages, a checklist ticking off ----------
scenes.Semester = () => {
  origin(200, 100)
  let s = ground(0, 0, 160, 160, 10)
  // Desk calendar: a base and pages standing on it (front face).
  s += box(14, 34, 0, 92, 34, 8)
  s += wallY(18, 60, 8, 84, 80, 'l')
  const page = (head) => `${wallY(20, 62.2, 8, 80, 76, 't')}${wallY(20, 62.3, 64, 80, 20, head)}${wallY(32, 62.4, 22, 56, 32, 'big')}`
  s += `<g class="pg2">${page('lit')}</g><g class="pg">${page('pkt')}</g>`
  // Rings at the top.
  for (let k = 0; k < 5; k++) { const [rx, ry] = P(28 + k * 15, 62, 86); s += `<rect x="${rx - 2}" y="${ry - 7}" width="4" height="12" rx="2" class="ring"/>` }
  // Checklist sheet on the desk, three rows; ticks appear one by one.
  s += box(90, 64, 0, 64, 92, 2)
  for (let k = 0; k < 3; k++) {
    const y = 74 + k * 27
    s += flat(98, y, 2.3, 14, 14, 'box') + flat(120, y + 4, 2.3, 28, 6, 'lnf')
    const [a, b, c] = [P(99.5, y + 6.5, 2.4), P(103.5, y + 12, 2.4), P(112, y + 1.5, 2.4)]
    s += `<path class="tick" style="--d:${k * 0.7}s" d="M${a} L${b} L${c}"/>`
  }
  s += tree(140, 24, 0.8, 'mi')
  const css = `.art-semester .pg{transform-box:fill-box;transform-origin:50% 0;animation:asm-flip 4.2s ease-in infinite}
.art-semester .pg2{opacity:1}
.art-semester .tick{fill:none;stroke:var(--a-good);stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:24;stroke-dashoffset:0;animation:asm-tick 4.2s ease-out infinite;animation-delay:var(--d)}
@keyframes asm-flip{0%,45%{transform:scaleY(1);opacity:1}70%{transform:scaleY(0.04) translateY(-40px);opacity:.2}71%,100%{transform:scaleY(1);opacity:0}}
@keyframes asm-tick{0%,20%{stroke-dashoffset:24}35%,85%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:0}}`
  return { s, css }
}

// ---------- Wellbeing & life: a bench under a tree, a coffee, a slow breathing glow ----------
scenes.Life = () => {
  origin(200, 104)
  let s = ground(0, 0, 160, 160, 10)
  s += flat(8, 8, 0.2, 144, 144, 'grass')
  s += flat(66, 0, 0.4, 26, 160, 'pa')
  const [gx, gy] = P(52, 52, 60)
  s += `<circle class="glow" cx="${gx}" cy="${gy}" r="62"/>`
  s += tree(40, 50, 1.35)
  // Bench: legs, seat, back.
  for (const [x, y] of [[30, 98], [72, 98], [30, 110], [72, 110]]) s += box(x, y, 0, 3, 3, 10, ['r', 'r', 'r'])
  s += box(26, 96, 10, 52, 18, 3) + box(26, 95, 13, 52, 3, 13)
  // Coffee cup on the seat, steam rising.
  const [cx, cy] = P(62, 104, 13)
  s += `<g transform="translate(${cx} ${cy})"><path class="cup" d="M-5 -10 h10 l-1.2 10 h-7.6z"/><ellipse cx="0" cy="-10" rx="5" ry="1.8" class="coffee"/><path class="cupband" d="M-4.6 -6 h9.2 l-.3 3 h-8.6z"/><path class="steam" style="--d:0s" d="M-2 -14 q-3 -4 0 -8 q3 -4 0 -8"/><path class="steam" style="--d:-1.3s" d="M2.5 -14 q-3 -4 0 -8 q3 -4 0 -8"/></g>`
  s += tree(132, 128, 0.8, 'mi') + tree(140, 30, 0.7, 'pks')
  s += person(110, 104, '#9d8bf2', '#3a2a22', 'idle')
  const css = `.art-life .glow{fill:url(#al-glow);transform-box:fill-box;transform-origin:center;animation:al-breathe 6s ease-in-out infinite}
.art-life .steam{fill:none;stroke:var(--a-steam);stroke-width:2;stroke-linecap:round;animation:al-steam 2.6s ease-out infinite;animation-delay:var(--d)}
@keyframes al-breathe{0%,100%{transform:scale(.88);opacity:.55}50%{transform:scale(1.08);opacity:1}}
@keyframes al-steam{0%{transform:translateY(4px);opacity:0}30%{opacity:.9}100%{transform:translateY(-8px);opacity:0}}`
  const defs = `<defs><radialGradient id="al-glow"><stop offset="0" class="glow0"/><stop offset="1" class="glow1"/></radialGradient></defs>`
  return { s: defs + s, css }
}

// ---------- International: a globe, a plane flying to Melbourne, a passport ----------
scenes.International = () => {
  origin(200, 158)
  let s = ground(0, 0, 124, 124, 8)
  // Globe on a small stand.
  s += box(50, 50, 0, 24, 24, 14)
  const gx = 200, gy = 112, R = 58
  const [bx, by] = P(62, 62, 14)
  s += `<line x1="${gx}" y1="${gy + R - 4}" x2="${bx}" y2="${by}" class="stand"/>`
  s += `<circle cx="${gx}" cy="${gy}" r="${R}" class="globe"/>`
  s += `<g class="mer"><ellipse cx="${gx}" cy="${gy}" rx="${R}" ry="${R * 0.36}"/><ellipse cx="${gx}" cy="${gy}" rx="${R * 0.42}" ry="${R}"/><line x1="${gx}" y1="${gy - R}" x2="${gx}" y2="${gy + R}"/><ellipse cx="${gx}" cy="${gy - R * 0.55}" rx="${R * 0.83}" ry="${R * 0.18}"/><ellipse cx="${gx}" cy="${gy + R * 0.55}" rx="${R * 0.83}" ry="${R * 0.18}"/></g>`
  // Land: soft blobs (no real map), Australia-ish at the lower right.
  s += `<path class="land" d="M${gx - 40} ${gy - 28} q14 -16 32 -8 q10 10 -4 18 q-14 4 -18 14 q-10 -8 -10 -24z"/><path class="land" d="M${gx + 6} ${gy - 44} q18 -6 30 6 q-6 12 -20 10 q-12 -2 -10 -16z"/><path class="land" d="M${gx + 18} ${gy + 18} q16 -8 28 2 q4 14 -10 18 q-10 2 -14 -4 q-8 -6 -4 -16z"/>`
  s += `<circle cx="${gx}" cy="${gy}" r="${R}" class="shine"/>`
  // Route from the upper left to the pin at Melbourne.
  const path = `M${gx - 150} ${gy - 20} C ${gx - 100} ${gy - 120}, ${gx + 90} ${gy - 110}, ${gx + 36} ${gy + 34}`
  s += `<path class="route" d="${path}"/>`
  s += `<g transform="translate(${gx + 36} ${gy + 34})"><path class="pin" d="M0 0 c-6 -8 -9 -12 -9 -16 a9 9 0 0 1 18 0 c0 4 -3 8 -9 16z"/><circle cx="0" cy="-16" r="3.4" class="pinhole"/></g>`
  s += `<g class="plane" style="offset-path:path('${path}')"><path class="planeb" d="M-9 0 L9 0 M-2 0 L-7 -7 M-2 0 L-7 7 M6 0 L3 -3 M6 0 L3 3" transform="rotate(0)"/><path class="planef" d="M10 0 L-8 -2.2 L-8 2.2z"/><path class="planef" d="M1 0 L-5 -9 L-2 -9 L5 0 L-2 9 L-5 9z"/></g>`
  // Passport on the ground at the front left.
  s += box(8, 80, 0, 30, 40, 4, ['pass', 'passl', 'passr'])
  const [px, py] = P(23, 100, 4.2)
  s += `<ellipse cx="${px}" cy="${py}" rx="7" ry="4" class="emblem"/>`
  const css = `.art-international .plane{offset-rotate:auto;animation:ai-fly 7s ease-in-out infinite}
@keyframes ai-fly{0%{offset-distance:0%;opacity:0}8%{opacity:1}88%{opacity:1}100%{offset-distance:100%;opacity:0}}
@media (prefers-reduced-motion: reduce){.art-international .plane{offset-distance:46%}}`
  return { s, css }
}

// ---------- Help: a help desk, chat bubbles popping up ----------
scenes.Help = () => {
  origin(200, 102)
  let s = ground(0, 0, 160, 160, 10)
  s += person(70, 46, '#c2227a', '#1d1514', 'staff')
  s += box(40, 54, 0, 84, 26, 20) + wallY(40, 80.2, 9, 84, 6, 'pkl') + box(38, 52, 20, 88, 30, 3)
  // A "?" sign on the counter.
  s += wallY(98, 68, 23, 18, 18, 'lit')
  const [qx, qy] = P(107, 68.3, 32)
  s += `<text x="${qx}" y="${qy + 5}" class="q">?</text>`
  s += person(86, 118, '#7aa58a', '#8a6cc9', 'student') + person(118, 120, '#a7c6ea', '#3a2a22', 'student')
  const bubble = (x, y, w, cls, d, flip) => `<g class="bub" style="--d:${d}s;transform-origin:${x + (flip ? w - 8 : 8)}px ${y + 30}px"><rect x="${x}" y="${y}" width="${w}" height="24" rx="12" class="${cls}"/><path class="${cls}" d="M${x + (flip ? w - 16 : 10)} ${y + 21} l${flip ? 8 : -2} 9 l${flip ? -2 : 8} -6z"/><circle cx="${x + w / 2 - 9}" cy="${y + 12}" r="2.4" class="dot"/><circle cx="${x + w / 2}" cy="${y + 12}" r="2.4" class="dot"/><circle cx="${x + w / 2 + 9}" cy="${y + 12}" r="2.4" class="dot"/></g>`
  const [sx, sy] = P(70, 46, 34), [ax, ay] = P(86, 118, 34), [bx, by] = P(118, 120, 34)
  s += bubble(r(sx - 60), r(sy - 40), 50, 'bubp', 0, true) + bubble(r(ax - 8), r(ay - 34), 44, 'bubg', -1.6, false) + bubble(r(bx + 2), r(by - 30), 50, 'bubg', -3.2, false)
  const css = `.art-help .bub{animation:ah-pop 4.8s cubic-bezier(.3,1.4,.5,1) infinite;animation-delay:var(--d)}
.art-help .q{font:700 15px var(--font-ui);fill:var(--a-pk);text-anchor:middle}
@keyframes ah-pop{0%,8%{transform:scale(0);opacity:0}18%,60%{transform:scale(1);opacity:1}72%,100%{transform:scale(.9);opacity:0}}
@media (prefers-reduced-motion: reduce){.art-help .bub{transform:none;opacity:1}}`
  return { s, css, vb: '40 34 320 240' }
}

// ---------- Key dates: a calendar with dates lighting up in turn ----------
scenes.KeyDates = () => {
  origin(200, 92)
  let s = ground(0, 0, 168, 168, 10)
  s += box(18, 18, 0, 132, 132, 9)
  s += flat(18, 18, 9.2, 132, 26, 'pkt')
  for (let k = 0; k < 5; k++) { const [rx, ry] = P(34 + k * 25, 22, 12); s += `<rect x="${rx - 2.5}" y="${ry - 9}" width="5" height="12" rx="2.5" class="ring"/>` }
  const lit = { 1: 0, 6: 1, 8: 2, 13: 3, 15: 4 }
  let n = 0
  for (let row = 0; row < 4; row++) for (let c = 0; c < 5; c++) {
    const x = 26 + c * 24.5, y = 52 + row * 24
    s += flat(x, y, 9.3, 19, 18, 'cell')
    if (n in lit) s += flat(x, y, 9.4, 19, 18, 'litc', ` style="--d:${lit[n] * 0.9}s"`)
    n++
  }
  const css = `.art-keydates .litc{animation:ak-light 4.5s ease-in-out infinite;animation-delay:var(--d)}
@keyframes ak-light{0%,10%{opacity:.12}22%,60%{opacity:1}80%,100%{opacity:.12}}`
  return { s, css }
}

for (const [name, fn] of Object.entries(scenes)) {
  const { s, css, vb = '0 0 400 300' } = fn()
  const cls = `art-${name.toLowerCase()}`
  const sfc = `<!-- Generated: an isometric scene for the guide's ${name} page (pearl-white, the home hero's style). Decorative. -->
<template>
  <svg class="art ${cls}" viewBox="${vb}" focusable="false" aria-hidden="true">${s}</svg>
</template>

<style src="./art.css"></style>
<style>
${css}
</style>
`
  fs.writeFileSync(`${OUT}Art${name}.vue`, sfc)
  console.log(name, Buffer.byteLength(sfc), 'bytes')
}
