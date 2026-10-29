// Generates the guide's illustrations in src/components/guide/art/ (and the About pages' in
// src/components/about/art/, the same two kinds; and the subject page's small one in
// src/components/subject/art/):
//   Art<Page>.vue   the hero band at the top of each 墨大入门 page: a wide, low scene (500×180)
//                   that sits on the right of the title and fades out under it;
//   Mini<Page>.vue  one small object about the page (200×150), at the foot of its "On this page"
//                   panel and on its card on the overview.
//
// Run from the repo root:  node scripts/art/gen.cjs
// It overwrites those files. Edit a scene below (or the isometric helpers in iso.cjs), rerun, then
// look at the guide pages at 1440, 1920 and 390 wide, light and dark, Motion on and off. Motion is
// a small loop per scene; the site's reduced-motion rule (and the preview pill's Motion off)
// stops every animation, so each scene's resting frame must read on its own. The generated files
// are committed; this script is only for changing them.
const fs = require('fs')
const path = require('path')
const { origin, P, box, flat, wallY, person, r } = require('./iso.cjs')
const { bounds } = require('./bounds.cjs')
const OUT = path.join(__dirname, '../../src/components/guide/art/')

// ---------- shared pieces ----------

/** A small ground slab with its shadow, its top centred on screen point (cx, cy). Sets the origin to its back corner. */
function isle(cx, cy, w, d, h = 7) {
  const C = Math.cos(Math.PI / 6)
  origin(cx - ((w - d) * C) / 2, cy - (w + d) / 4)
  const [sx, sy] = P(w / 2, d / 2, -h)
  return `<ellipse class="sh" cx="${sx}" cy="${r(sy + 9)}" rx="${r((w + d) * 0.49)}" ry="${r((w + d) * 0.19)}"/>` + box(0, 0, -h, w, d, h, ['g', 'gl', 'gr'])
}

/** A lollipop tree at ground point (iso, current origin); `sway` lets its crown move. */
function tree(x, y, s = 1, cls = 'li', sway = false) {
  const [tx, ty] = P(x, y, 0)
  const crown = `<circle cx="0" cy="-32" r="14" class="${cls}"/><circle cx="-7" cy="-26" r="9" class="${cls}"/><circle cx="7" cy="-25" r="9" class="${cls}"/><circle cx="-3" cy="-37" r="6" class="hl"/>`
  return `<g transform="translate(${tx} ${ty}) scale(${s})"><ellipse class="sh2" cx="0" cy="0" rx="10" ry="4"/><rect x="-2" y="-22" width="4" height="22" rx="2" class="trunk"/><g${sway ? ' class="sway"' : ''}>${crown}</g></g>`
}

/** A floating glass window in screen space: a header bar and a glyph. */
function win(x, y, w, h, cls, glyph, d) {
  return `<g class="fw" style="--d:${d}s"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="gls"/><rect x="${x}" y="${y}" width="${w}" height="8" rx="4" class="${cls}"/><g transform="translate(${x + w / 2} ${y + 8 + (h - 8) / 2})">${glyph}</g></g>`
}
const G = {
  home: '<path class="gly" d="M-8 1 L0 -7 L8 1 M-5.5 -1.5 V7 H5.5 V-1.5"/>',
  mail: '<rect x="-9" y="-6" width="18" height="12" rx="2.5" class="gly"/><path class="gly" d="M-8.5 -5 L0 1.5 L8.5 -5"/>',
  cal: '<rect x="-9" y="-7" width="18" height="15" rx="2.5" class="gly"/><path class="gly" d="M-9 -2 H9 M-4 2 h0.1 M0 2 h0.1 M4 2 h0.1 M-4 5.5 h0.1 M0 5.5 h0.1"/>',
  chat: '<path class="gly" d="M-9 -6 h18 v10 h-10 l-5 4 v-4 h-3z"/>',
  book: '<path class="gly" d="M0 -5 q-5 -3 -9 -1 v12 q4 -2 9 1 q5 -3 9 -1 v-12 q-4 -2 -9 1 v13"/>',
  shield: '<path class="gly" d="M0 -8 l7 3 v4 q0 6 -7 9 q-7 -3 -7 -9 v-4z M-3 0 l2 2 l4 -4"/>',
}
const COLS = [['pkt', 'pkl', 'pkr'], ['lit', 'lil', 'lir'], ['skt', 'skl', 'skr'], ['mit', 'mil', 'mir'], ['wat', 'wal', 'war']]

// ================= Hero bands (x 220–720, 180 high) =================
const heroes = {}

// Overview: the guide's sections as a row of tiles riding a slow wave; the guide itself (a pink
// book block) in the middle.
heroes.Overview = () => {
  let s = ''
  const tops = ['pk', 'li', 'sk', 'mi', null, 'wa', 'li', 'pk', 'sk']
  tops.forEach((c, i) => {
    const cx = 262 + i * 54, cy = 118 - Math.sin(i * 0.7) * 12
    origin(cx, cy - 26)
    const tile = c
      ? box(-13, -13, 0, 26, 26, 10) + flat(-6, -6, 10.3, 12, 12, c)
      : box(-16, -16, 0, 32, 32, 20, COLS[0]) + flat(-10, -10, 20.3, 20, 20, 'bk') + `<path class="ln" d="M${P(0, -10, 20.4)} L${P(0, 10, 20.4)}"/>`
    s += `<ellipse class="sh" cx="${cx}" cy="${r(cy + 4)}" rx="26" ry="9"/><g class="tile" style="--i:${i}">${tile}</g>`
  })
  const css = `.art-overview .tile{animation:ao-wave 5.4s ease-in-out infinite;animation-delay:calc(var(--i) * -0.5s)}
@keyframes ao-wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}`
  return { s, css, motion: [8, 0, 0, 0] }
}

// Basics: credit points stacking up (four 12.5-point blocks make a 50-point semester), the campus
// gate with a student walking through, a tree.
heroes.Basics = () => {
  let s = isle(330, 140, 58, 58)
  for (let k = 0; k < 3; k++) s += box(14, 14, k * 12, 30, 30, 12, COLS[k])
  s += `<g class="drop">${box(14, 14, 36, 30, 30, 12, COLS[3])}</g>`
  s += isle(500, 146, 84, 64)
  s += box(8, 8, 0, 10, 10, 50) + box(8, 44, 0, 10, 10, 50) + box(6, 4, 50, 14, 54, 9, COLS[0])
  const [ax, ay] = P(56, 30), [bx, by] = P(-10, 30)
  s += `<g class="walk">${person(56, 30, '#9d8bf2', '#3a2a22')}</g>`
  s += isle(650, 140, 46, 46)
  s += tree(23, 23, 1, 'mi', true)
  const css = `.art-basics .drop{animation:ab-drop 4.8s cubic-bezier(.3,.7,.2,1) infinite}
.art-basics .walk{animation:ab-walk 7s linear infinite}
.art-basics .sway{transform-origin:0 -10px;animation:ab-sway 6s ease-in-out infinite}
@keyframes ab-drop{0%{transform:translateY(-24px);opacity:0}15%{opacity:1}35%,85%{transform:translateY(0);opacity:1}100%{transform:translateY(0);opacity:0}}
@keyframes ab-walk{0%{transform:translate(0,0);opacity:0}10%,85%{opacity:1}100%{transform:translate(${r(bx - ax)}px,${r(by - ay)}px);opacity:0}}
@keyframes ab-sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}`
  return { s, css, motion: [26, 0, 0, 0] }
}

// Systems: a laptop and a phone, the systems' windows floating in a line above them.
heroes.Systems = () => {
  let s = isle(610, 146, 92, 70)
  s += box(8, 12, 0, 70, 46, 4) + flat(13, 19, 4.2, 60, 26, 'key')
  s += wallY(8, 12, 4, 70, 46, 'r') + wallY(11, 12.2, 8, 64, 38, 'scr')
  s += wallY(16, 12.4, 34, 28, 4, 'pkt') + wallY(16, 12.4, 26, 44, 3, 'lnf') + wallY(16, 12.4, 19, 36, 3, 'lnf')
  s += isle(470, 150, 44, 44)
  s += box(12, 6, 0, 20, 34, 4) + flat(14.5, 9, 4.2, 15, 28, 'scr') + flat(17, 12, 4.3, 10, 5, 'li')
  const ws = [[244, 84, 'pkt', G.home], [306, 52, 'li', G.shield], [368, 74, 'sk', G.mail], [430, 36, 'mi', G.chat], [500, 16, 'wa', G.cal], [576, 6, 'lit', G.book]]
  ws.forEach(([x, y, c, g], i) => (s += win(x, y, 52, 38, c, g, -i * 0.8)))
  const css = `.art-systems .fw{animation:as-float 5.6s ease-in-out infinite;animation-delay:var(--d)}
@keyframes as-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`
  return { s, css, motion: [7, 0, 0, 0] }
}

// Enrolling: subject codes drifting in, and cards dropping into the free slots of a semester board.
heroes.Enrolling = () => {
  let s = isle(600, 150, 108, 76)
  s += box(4, 4, 0, 100, 68, 5)
  const slots = []
  for (let row = 0; row < 2; row++) for (let c = 0; c < 4; c++) slots.push([10 + c * 23.5, 10 + row * 30])
  slots.forEach(([x, y]) => (s += flat(x, y, 5.2, 19, 26, 'slot')))
  ;[0, 1, 2, 4, 5, 6].forEach((k, i) => { const [x, y] = slots[k]; s += box(x + 1, y + 1, 5, 17, 24, 3, COLS[i % 5]) })
  const [x7, y7] = slots[7], [x3, y3] = slots[3]
  s += `<g class="drop" style="--d:0s">${box(x3 + 1, y3 + 1, 5, 17, 24, 3, COLS[3])}</g>`
  s += `<g class="drop" style="--d:-3s">${box(x7 + 1, y7 + 1, 5, 17, 24, 3, COLS[1])}</g>`
  const chip = (x, y, c, t, d) => `<g class="chip" style="--d:${d}s"><rect x="${x}" y="${y}" width="78" height="20" rx="10" class="gls"/><circle cx="${x + 11}" cy="${y + 10}" r="3" class="${c}"/><text x="${x + 19}" y="${y + 14}" class="code">${t}</text></g>`
  s += chip(244, 110, 'pkt', 'COMP10001', 0) + chip(320, 66, 'lit', 'MAST10006', -2) + chip(400, 112, 'mit', 'BIOL10004', -4) + chip(456, 30, 'wat', 'ECON10004', -1)
  const css = `.art-enrolling .drop{animation:ae-drop 6s cubic-bezier(.3,.7,.2,1) infinite;animation-delay:var(--d)}
.art-enrolling .chip{animation:ae-chip 6s ease-in-out infinite;animation-delay:var(--d)}
.art-enrolling .code{font:600 9.5px var(--font-code);fill:var(--ink-soft)}
@keyframes ae-drop{0%{transform:translate(10px,-20px);opacity:0}12%{opacity:1}30%,80%{transform:translate(0,0);opacity:1}92%,100%{transform:translate(0,0);opacity:0}}
@keyframes ae-chip{0%,100%{transform:translateX(0)}50%{transform:translateX(8px)}}`
  return { s, css, motion: [22, 10, 0, 0] }
}

// During semester: an exam clock, a checklist ticking off, a desk calendar turning its pages.
heroes.Semester = () => {
  let s = isle(320, 150, 46, 46)
  s += box(14, 14, 0, 18, 18, 6)
  const [cx, cy] = P(23, 23, 44)
  s += `<line x1="${cx}" y1="${r(cy + 20)}" x2="${cx}" y2="${r(cy + 38)}" class="stand"/><circle cx="${cx}" cy="${cy}" r="21" class="face"/><circle cx="${cx}" cy="${cy}" r="21" class="rim"/>`
  for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; s += `<circle cx="${r(cx + Math.sin(a) * 16)}" cy="${r(cy - Math.cos(a) * 16)}" r="1.3" class="tickm"/>` }
  s += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${r(cy - 10)}" class="hand hour"/><g class="min" style="transform-origin:${cx}px ${cy}px"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${r(cy - 15)}" class="hand"/></g><circle cx="${cx}" cy="${cy}" r="2" class="pin"/>`
  s += isle(460, 152, 64, 70)
  s += box(4, 4, 0, 56, 62, 2)
  for (let k = 0; k < 3; k++) {
    const y = 12 + k * 17
    s += flat(10, y, 2.3, 10, 10, 'box') + flat(26, y + 3, 2.3, 26, 4, 'lnf')
    const [a, b, c] = [P(11, y + 5, 2.4), P(14, y + 9, 2.4), P(20, y + 1, 2.4)]
    s += `<path class="tick" style="--d:${k * 0.7}s" d="M${a} L${b} L${c}"/>`
  }
  s += isle(612, 150, 80, 50)
  s += box(4, 14, 0, 70, 26, 6) + wallY(7, 32, 6, 64, 62, 'l')
  const page = (head) => `${wallY(9, 34.2, 6, 60, 58, 't')}${wallY(9, 34.3, 50, 60, 14, head)}${wallY(19, 34.4, 16, 40, 26, 'big')}`
  s += `<g class="pg2">${page('lit')}</g><g class="pg">${page('pkt')}</g>`
  for (let k = 0; k < 4; k++) { const [rx, ry] = P(15 + k * 15, 34, 66); s += `<rect x="${rx - 2}" y="${ry - 6}" width="4" height="10" rx="2" class="ring"/>` }
  const css = `.art-semester .min{animation:asm-min 8s linear infinite}
.art-semester .pg{transform-box:fill-box;transform-origin:50% 0;animation:asm-flip 4.2s ease-in infinite}
.art-semester .tick{fill:none;stroke:var(--a-good);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:22;stroke-dashoffset:0;animation:asm-tick 4.2s ease-out infinite;animation-delay:var(--d)}
@keyframes asm-min{to{transform:rotate(360deg)}}
@keyframes asm-flip{0%,45%{transform:scaleY(1);opacity:1}70%{transform:scaleY(0.04) translateY(-40px);opacity:.2}71%,100%{transform:scaleY(1);opacity:0}}
@keyframes asm-tick{0%,20%{stroke-dashoffset:22}35%,85%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:0}}`
  return { s, css, motion: [12, 0, 0, 0] }
}

// Wellbeing & life: small trees along the way to a bench, a coffee steaming, a slow breathing glow.
heroes.Life = () => {
  let s = ''
  s += isle(300, 150, 40, 40) + tree(20, 20, 0.7, 'mi', true)
  s += isle(400, 146, 52, 52) + tree(26, 26, 0.85, 'pks', true)
  s += isle(590, 150, 110, 80)
  s += flat(4, 4, 0.2, 102, 72, 'grass')
  const [gx, gy] = P(30, 30, 46)
  s += `<circle class="glow" cx="${gx}" cy="${gy}" r="46"/>`
  s += tree(26, 28, 1.05, 'li', true)
  for (const [x, y] of [[50, 46], [84, 46], [50, 58], [84, 58]]) s += box(x, y, 0, 3, 3, 9, ['r', 'r', 'r'])
  s += box(46, 44, 9, 44, 18, 3) + box(46, 43, 12, 44, 3, 11)
  const [cx, cy] = P(78, 52, 12)
  s += `<g transform="translate(${cx} ${cy})"><path class="cup" d="M-5 -10 h10 l-1.2 10 h-7.6z"/><ellipse cx="0" cy="-10" rx="5" ry="1.8" class="coffee"/><path class="cupband" d="M-4.6 -6 h9.2 l-.3 3 h-8.6z"/><path class="steam" style="--d:0s" d="M-2 -14 q-3 -4 0 -8 q3 -4 0 -8"/><path class="steam" style="--d:-1.3s" d="M2.5 -14 q-3 -4 0 -8 q3 -4 0 -8"/></g>`
  s += person(60, 68, '#9d8bf2', '#3a2a22')
  const css = `.art-life .glow{fill:url(#al-glow);transform-box:fill-box;transform-origin:center;animation:al-breathe 6s ease-in-out infinite}
.art-life .steam{fill:none;stroke:var(--a-steam);stroke-width:2;stroke-linecap:round;animation:al-steam 2.6s ease-out infinite;animation-delay:var(--d)}
.art-life .sway{transform-origin:0 -10px;animation:al-sway 6s ease-in-out infinite}
@keyframes al-breathe{0%,100%{transform:scale(.88);opacity:.55}50%{transform:scale(1.08);opacity:1}}
@keyframes al-steam{0%{transform:translateY(4px);opacity:0}30%{opacity:.9}100%{transform:translateY(-8px);opacity:0}}
@keyframes al-sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}`
  const defs = `<defs><radialGradient id="al-glow"><stop offset="0" class="glow0"/><stop offset="1" class="glow1"/></radialGradient></defs>`
  return { s: defs + s, css, motion: [6, 0, 0, 0] }
}

// International: a plane flying a long arc across the band to Melbourne on a globe; a passport.
heroes.International = () => {
  let s = isle(420, 152, 46, 46)
  s += box(10, 8, 0, 26, 32, 4, ['pass', 'passl', 'passr'])
  const [px, py] = P(23, 24, 4.2)
  s += `<ellipse cx="${px}" cy="${py}" rx="6" ry="3.4" class="emblem"/>`
  const gx = 610, gy = 84, R = 52
  s += `<ellipse class="sh" cx="${gx}" cy="${gy + R + 20}" rx="56" ry="12"/><line x1="${gx}" y1="${gy + R - 4}" x2="${gx}" y2="${gy + R + 16}" class="stand"/>`
  s += `<circle cx="${gx}" cy="${gy}" r="${R}" class="globe"/>`
  s += `<g class="mer"><ellipse cx="${gx}" cy="${gy}" rx="${R}" ry="${r(R * 0.36)}"/><ellipse cx="${gx}" cy="${gy}" rx="${r(R * 0.42)}" ry="${R}"/><line x1="${gx}" y1="${gy - R}" x2="${gx}" y2="${gy + R}"/></g>`
  s += `<path class="land" d="M${gx - 36} ${gy - 25} q13 -14 29 -7 q9 9 -4 16 q-13 4 -16 13 q-9 -7 -9 -22z"/><path class="land" d="M${gx + 5} ${gy - 40} q16 -5 27 5 q-5 11 -18 9 q-11 -2 -9 -14z"/><path class="land" d="M${gx + 16} ${gy + 16} q14 -7 25 2 q4 13 -9 16 q-9 2 -13 -4 q-7 -5 -3 -14z"/>`
  s += `<circle cx="${gx}" cy="${gy}" r="${R}" class="shine"/>`
  const route = `M240 130 C 320 20, 520 -6, ${gx + 32} ${gy + 30}`
  s += `<path class="route" d="${route}"/>`
  s += `<g transform="translate(${gx + 32} ${gy + 30})"><path class="pin" d="M0 0 c-6 -8 -9 -12 -9 -16 a9 9 0 0 1 18 0 c0 4 -3 8 -9 16z"/><circle cx="0" cy="-16" r="3.4" class="pinhole"/></g>`
  s += `<g class="plane" style="offset-path:path('${route}')"><path class="planef" d="M10 0 L-8 -2.2 L-8 2.2z"/><path class="planef" d="M1 0 L-5 -9 L-2 -9 L5 0 L-2 9 L-5 9z"/></g>`
  const css = `.art-international .plane{offset-rotate:auto;offset-distance:52%;animation:ai-fly 8s ease-in-out infinite}
@keyframes ai-fly{0%{offset-distance:0%;opacity:0}8%{opacity:1}88%{opacity:1}100%{offset-distance:100%;opacity:0}}`
  return { s, css, motion: [4, 0, 0, 0] }
}

// Help: students and a help desk, answers popping up in speech bubbles.
heroes.Help = () => {
  let s = isle(440, 152, 60, 44)
  s += person(18, 20, '#7aa58a', '#8a6cc9') + person(42, 26, '#a7c6ea', '#3a2a22')
  s += isle(610, 150, 96, 64)
  s += person(30, 14, '#c2227a', '#1d1514')
  s += box(8, 22, 0, 80, 22, 18) + wallY(8, 44.2, 8, 80, 5, 'pkl') + box(6, 20, 18, 84, 26, 3)
  s += wallY(62, 34, 21, 16, 16, 'lit')
  const [qx, qy] = P(70, 34.3, 29)
  s += `<text x="${qx}" y="${r(qy + 5)}" class="q">?</text>`
  const bubble = (x, y, w, cls, d, flip) => `<g class="bub" style="--d:${d}s;transform-origin:${x + (flip ? w - 8 : 8)}px ${y + 30}px"><rect x="${x}" y="${y}" width="${w}" height="24" rx="12" class="${cls}"/><path class="${cls}" d="M${x + (flip ? w - 16 : 10)} ${y + 21} l${flip ? 8 : -2} 9 l${flip ? -2 : 8} -6z"/><circle cx="${x + w / 2 - 9}" cy="${y + 12}" r="2.4" class="dot"/><circle cx="${x + w / 2}" cy="${y + 12}" r="2.4" class="dot"/><circle cx="${x + w / 2 + 9}" cy="${y + 12}" r="2.4" class="dot"/></g>`
  s += bubble(560, 34, 50, 'bubp', 0, true) + bubble(392, 60, 44, 'bubg', -1.6, false) + bubble(452, 46, 50, 'bubg', -3.2, false)
  const css = `.art-help .bub{animation:ah-pop 4.8s cubic-bezier(.3,1.4,.5,1) infinite;animation-delay:var(--d)}
.art-help .q{font:700 13px var(--font-ui);fill:var(--a-pk);text-anchor:middle}
@keyframes ah-pop{0%,8%{transform:scale(0);opacity:0}18%,60%{transform:scale(1);opacity:1}72%,100%{transform:scale(.9);opacity:0}}`
  return { s, css, motion: [6, 0, 0, 0] }
}

// Key dates: a run of date cards lifting in turn, ending at a desk calendar.
heroes.KeyDates = () => {
  let s = ''
  ;[[290, 'lit'], [370, 'skt'], [450, 'wat']].forEach(([x, c], i) => {
    s += `<ellipse class="sh" cx="${x}" cy="146" rx="24" ry="8"/><g class="day" style="--d:${i * 0.9}s"><rect x="${x - 22}" y="86" width="44" height="50" rx="8" class="gls"/><rect x="${x - 22}" y="86" width="44" height="13" rx="6" class="${c}"/><rect x="${x - 11}" y="108" width="22" height="16" rx="4" class="big"/></g>`
  })
  s += isle(610, 152, 100, 76)
  s += box(6, 6, 0, 88, 64, 6) + flat(6, 6, 6.2, 88, 14, 'pkt')
  for (let k = 0; k < 4; k++) { const [rx, ry] = P(16 + k * 20, 8, 8.5); s += `<rect x="${rx - 2}" y="${ry - 7}" width="4" height="10" rx="2" class="ring"/>` }
  const lit = { 1: 0, 6: 1, 8: 2, 11: 3 }
  let n = 0
  for (let row = 0; row < 3; row++) for (let c = 0; c < 5; c++) {
    const x = 11 + c * 16.5, y = 24 + row * 15
    s += flat(x, y, 6.3, 13, 11, 'cell')
    if (n in lit) s += flat(x, y, 6.4, 13, 11, 'litc', ` style="--d:${lit[n] * 0.9}s"`)
    n++
  }
  const css = `.art-keydates .litc{animation:ak-light 4.5s ease-in-out infinite;animation-delay:var(--d)}
.art-keydates .day{animation:ak-day 4.5s ease-in-out infinite;animation-delay:var(--d)}
@keyframes ak-light{0%,10%{opacity:.12}22%,60%{opacity:1}80%,100%{opacity:.12}}
@keyframes ak-day{0%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`
  return { s, css, motion: [7, 0, 0, 0] }
}

// ================= Minis (200 × 150) =================
const minis = {}

// Systems: a tablet hanging from its charging cable, swaying a little, the battery filling.
minis.Systems = () => {
  const s = `<ellipse class="sh" cx="100" cy="142" rx="36" ry="6"/><g class="hang"><path class="cable" d="M100 -4 C 100 18, 92 22, 100 36"/><rect x="96" y="34" width="8" height="8" rx="2" class="plug"/><rect x="66" y="42" width="68" height="90" rx="9" class="dev"/><rect x="71" y="48" width="58" height="76" rx="5" class="scr"/><rect x="88" y="80" width="24" height="12" rx="3" class="bat"/><rect x="112" y="83.5" width="2.5" height="5" rx="1" class="batcap"/><rect x="90" y="82" width="10" height="8" rx="1.5" class="fill"/><path class="bolt" d="M101 64 l-5 8 h4 l-2 7 l6 -9 h-4z"/></g>`
  const css = `.mini-systems .hang{transform-origin:100px 0;animation:ms-sway 4.6s ease-in-out infinite}
.mini-systems .fill{transform-box:fill-box;transform-origin:0 50%;animation:ms-fill 4.6s ease-in-out infinite}
@keyframes ms-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes ms-fill{0%{transform:scaleX(.3)}70%,100%{transform:scaleX(1)}}`
  return { s, css, motion: [0, 8, 0, 8] }
}

// Basics: credit points stacking, the top block bobbing into place.
minis.Basics = () => {
  let s = isle(100, 124, 54, 54)
  for (let k = 0; k < 3; k++) s += box(13, 13, k * 13, 28, 28, 13, COLS[k])
  s += `<g class="bob">${box(13, 13, 39, 28, 28, 13, COLS[3])}</g>`
  const css = `.mini-basics .bob{animation:mb-bob 3.6s ease-in-out infinite}
@keyframes mb-bob{0%,100%{transform:translateY(-8px)}50%{transform:translateY(0)}}`
  return { s, css, motion: [9, 0, 0, 0] }
}

// Enrolling: a timetable card sliding into its slot.
minis.Enrolling = () => {
  let s = isle(100, 116, 78, 60)
  s += box(4, 4, 0, 70, 52, 5)
  const slots = [[10, 10], [33, 10], [10, 32], [33, 32]]
  slots.forEach(([x, y]) => (s += flat(x, y, 5.2, 19, 18, 'slot')))
  s += box(11, 11, 5, 17, 16, 3, COLS[0]) + box(34, 11, 5, 17, 16, 3, COLS[2]) + box(11, 33, 5, 17, 16, 3, COLS[3])
  s += `<g class="slide">${box(34, 33, 5, 17, 16, 3, COLS[1])}</g>`
  const css = `.mini-enrolling .slide{animation:me-slide 4.4s cubic-bezier(.3,.7,.2,1) infinite}
@keyframes me-slide{0%{transform:translate(14px,-30px);opacity:0}15%{opacity:1}40%,85%{transform:translate(0,0);opacity:1}100%{transform:translate(0,0);opacity:0}}`
  return { s, css, motion: [32, 14, 0, 0] }
}

// During semester: an exam paper with a clock ticking at its corner.
minis.Semester = () => {
  let s = `<ellipse class="sh" cx="96" cy="140" rx="44" ry="7"/><g transform="rotate(-6 92 80)"><rect x="56" y="24" width="72" height="104" rx="6" class="sheet"/><rect x="66" y="36" width="34" height="6" rx="3" class="pkt"/>`
  for (let k = 0; k < 5; k++) s += `<rect x="66" y="${52 + k * 13}" width="${52 - (k % 2) * 14}" height="4" rx="2" class="lnf"/>`
  s += `</g><circle cx="132" cy="104" r="22" class="face"/><circle cx="132" cy="104" r="22" class="rim"/><line x1="132" y1="104" x2="132" y2="94" class="hand hour"/><g class="min" style="transform-origin:132px 104px"><line x1="132" y1="104" x2="132" y2="89" class="hand"/></g><circle cx="132" cy="104" r="2" class="pin"/>`
  const css = `.mini-semester .min{animation:msm-min 8s linear infinite}
@keyframes msm-min{to{transform:rotate(360deg)}}`
  return { s, css, motion: [0, 0, 0, 0] }
}

// Wellbeing & life: a cup of coffee, steam curling up.
minis.Life = () => {
  const s = `<ellipse class="sh" cx="100" cy="136" rx="46" ry="8"/><ellipse cx="100" cy="124" rx="44" ry="10" class="saucer"/><path class="cup" d="M70 76 h60 l-6 44 q-24 8 -48 0z"/><path class="cupband" d="M71.6 88 h56.8 l-1.4 10 h-54z"/><path class="handle" d="M129 84 q18 0 16 14 q-2 12 -18 10"/><ellipse cx="100" cy="76" rx="30" ry="7" class="coffee"/><path class="steam" style="--d:0s" d="M90 64 q-6 -8 0 -16 q6 -8 0 -16"/><path class="steam" style="--d:-1s" d="M102 64 q-6 -8 0 -16 q6 -8 0 -16"/><path class="steam" style="--d:-2s" d="M114 64 q-6 -8 0 -16 q6 -8 0 -16"/>`
  const css = `.mini-life .steam{fill:none;stroke:var(--a-steam);stroke-width:3;stroke-linecap:round;animation:ml-steam 3s ease-out infinite;animation-delay:var(--d)}
@keyframes ml-steam{0%{transform:translateY(6px);opacity:0}30%{opacity:.9}100%{transform:translateY(-10px);opacity:0}}`
  return { s, css, motion: [44, 0, 0, 0] }
}

// International: a suitcase, its luggage tag swinging.
minis.International = () => {
  const s = `<ellipse class="sh" cx="100" cy="142" rx="50" ry="7"/><path class="handle2" d="M86 50 v-14 q0 -6 6 -6 h16 q6 0 6 6 v14"/><rect x="54" y="48" width="92" height="84" rx="12" class="case"/><rect x="74" y="48" width="6" height="84" class="strap"/><rect x="120" y="48" width="6" height="84" class="strap"/><circle cx="70" cy="134" r="5" class="wheel"/><circle cx="130" cy="134" r="5" class="wheel"/><g class="tag" style="transform-origin:112px 36px"><path class="string" d="M112 36 L120 62"/><rect x="110" y="60" width="22" height="30" rx="4" transform="rotate(-12 121 75)" class="label"/><circle cx="119" cy="66" r="2" class="pinhole"/></g>`
  const css = `.mini-international .tag{animation:mi-swing 3.4s ease-in-out infinite}
@keyframes mi-swing{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(12deg)}}`
  return { s, css, motion: [0, 10, 0, 0] }
}

/** A ring segment between radii ri and ro from angle a to b (degrees, 0 = up). */
function arc(cx, cy, ro, ri, a, b) {
  const pt = (rad, deg) => { const t = ((deg - 90) * Math.PI) / 180; return `${r(cx + rad * Math.cos(t))} ${r(cy + rad * Math.sin(t))}` }
  return `M${pt(ro, a)} A${ro} ${ro} 0 0 1 ${pt(ro, b)} L${pt(ri, b)} A${ri} ${ri} 0 0 0 ${pt(ri, a)}z`
}

// Help: a life buoy bobbing on a little water.
minis.Help = () => {
  let ring = ''
  for (let k = 0; k < 4; k++) ring += `<path class="buoyp" d="${arc(100, 78, 38, 24, k * 90 + 20, k * 90 + 70)}"/>`
  const s = `<path class="water" d="M30 122 q17 -8 35 0 t35 0 t35 0 t35 0 v20 h-140z"/><g class="float"><path class="buoy" d="${arc(100, 78, 38, 24, 0, 359.9)}"/>${ring}<circle cx="100" cy="78" r="38" class="buoyrim"/><circle cx="100" cy="78" r="24" class="buoyrim"/></g>`
  const css = `.mini-help .float{animation:mh-bob 3.2s ease-in-out infinite}
@keyframes mh-bob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(6px) rotate(3deg)}}`
  return { s, css, motion: [0, 0, 8, 0] }
}

// Key dates: a desk calendar, its top page flipping over.
minis.KeyDates = () => {
  let grid = ''
  for (let row = 0; row < 3; row++) for (let c = 0; c < 4; c++) grid += `<rect x="${70 + c * 16}" y="${74 + row * 14}" width="11" height="9" rx="2" class="${row === 1 && c === 2 ? 'litc' : 'cell'}"/>`
  const page = (head, g) => `<rect x="60" y="40" width="80" height="90" rx="8" class="sheet"/><rect x="60" y="40" width="80" height="22" rx="8" class="${head}"/><rect x="60" y="54" width="80" height="8" class="${head}"/>${g}`
  const s = `<ellipse class="sh" cx="100" cy="140" rx="46" ry="7"/><g>${page('lit', grid)}</g><g class="flip">${page('pkt', '<rect x="80" y="76" width="40" height="34" rx="6" class="big"/>')}</g><rect x="76" y="32" width="5" height="14" rx="2.5" class="ring"/><rect x="119" y="32" width="5" height="14" rx="2.5" class="ring"/>`
  const css = `.mini-keydates .flip{transform-origin:100px 42px;animation:mk-flip 5s ease-in infinite}
@keyframes mk-flip{0%,50%{transform:scaleY(1);opacity:1}75%{transform:scaleY(-.1);opacity:.3}76%,100%{transform:scaleY(1);opacity:0}}`
  return { s, css, motion: [0, 0, 0, 0] }
}

// ================= About pages (src/components/about/art/) =================
// The same kit for the 关于 group: a hero band and a small object per page.
const aboutHeroes = {}
const aboutMinis = {}

/** A loose Handbook page in screen space, tilted a little. */
function sheet(x, y, rot, head) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-17" y="-22" width="34" height="44" rx="4" class="sheet"/><rect x="-11" y="-15" width="16" height="4" rx="2" class="${head}"/><rect x="-11" y="-6" width="22" height="3" rx="1.5" class="lnf"/><rect x="-11" y="1" width="18" height="3" rx="1.5" class="lnf"/><rect x="-11" y="8" width="22" height="3" rx="1.5" class="lnf"/></g>`
}

// About: the site's own story. Handbook pages scattered on the left, one drifting along a path to a
// laptop that shows them as one tidy plan, with a student beside it.
aboutHeroes.About = () => {
  let s = ''
  ;[[262, 104, -8, 'pkt', 0], [306, 70, 6, 'lit', -1.4], [330, 122, -4, 'skt', -2.8], [370, 88, 9, 'wat', -0.7]].forEach(([x, y, rot, c, d]) => {
    s += `<g class="pg" style="--d:${d}s">${sheet(x, y, rot, c)}</g>`
  })
  s += `<ellipse class="sh" cx="316" cy="152" rx="70" ry="9"/>`
  const route = 'M392 92 C 430 60, 470 58, 520 84'
  s += `<path class="route" d="${route}"/>`
  s += `<g class="fly" style="offset-path:path('${route}')"><rect x="-8" y="-10" width="16" height="20" rx="2.5" class="sheet"/><rect x="-5" y="-6" width="8" height="3" rx="1.5" class="pkt"/></g>`
  s += isle(600, 146, 92, 70)
  s += box(8, 12, 0, 70, 46, 4) + flat(13, 19, 4.2, 60, 26, 'key')
  s += wallY(8, 12, 4, 70, 46, 'r') + wallY(11, 12.2, 8, 64, 38, 'scr')
  const cells = ['pkt', 'lit', 'skt', 'mit', 'wat', 'skt', 'pkt', 'lit', 'mit', 'wat', 'lit', 'pkt']
  cells.forEach((c, k) => {
    const col = k % 4, row = Math.floor(k / 4)
    s += wallY(14 + col * 15, 12.4, 36 - row * 10, 12, 7, k === 11 ? `${c} new` : c)
  })
  s += person(86, 44, '#9d8bf2', '#3a2a22')
  const css = `.art-about .pg{animation:aab-bob 6s ease-in-out infinite;animation-delay:var(--d)}
.art-about .fly{offset-rotate:0deg;offset-distance:70%;animation:aab-fly 6s ease-in-out infinite}
.art-about .new{animation:aab-new 6s ease-in-out infinite}
@keyframes aab-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes aab-fly{0%{offset-distance:0%;opacity:0}10%{opacity:1}75%{opacity:1}90%,100%{offset-distance:100%;opacity:0}}
@keyframes aab-new{0%,80%{opacity:.25}92%,100%{opacity:1}}`
  return { s, css, motion: [6, 0, 0, 0] }
}

// Privacy: a browser window holding the student's data (plan cells, marks), a padlock in front of
// it clicking shut. Nothing leaves the window.
aboutHeroes.Privacy = () => {
  let s = isle(330, 148, 50, 50)
  s += person(25, 25, '#a7c6ea', '#3a2a22')
  s += `<ellipse class="sh" cx="560" cy="160" rx="120" ry="12"/>`
  s += `<rect x="452" y="18" width="216" height="134" rx="14" class="gls"/><rect x="452" y="18" width="216" height="24" rx="12" class="lit"/><rect x="452" y="32" width="216" height="10" class="lit"/>`
  s += `<circle cx="468" cy="30" r="3.5" class="hd"/><circle cx="480" cy="30" r="3.5" class="hd"/><circle cx="492" cy="30" r="3.5" class="hd"/><rect x="508" y="24" width="120" height="12" rx="6" class="bar"/>`
  s += `<g transform="translate(518 30) scale(.55)"><path class="gly" d="M-5 -1 v-3 a5 5 0 0 1 10 0 v3 M-7 -1 h14 v9 h-14z"/></g>`
  const cells = ['pkt', 'lit', 'skt', 'mit', 'wat', 'lit', 'mit', 'pkt', 'skt', 'wat', 'pkt', 'lit']
  cells.forEach((c, k) => {
    const col = k % 4, row = Math.floor(k / 4)
    s += `<rect x="${468 + col * 34}" y="${54 + row * 28}" width="28" height="20" rx="5" class="${c} cell2" style="--d:${(k % 5) * -0.9}s"/>`
  })
  // The padlock: body, keyhole, and a shackle that lifts and clicks shut.
  s += `<ellipse class="sh" cx="640" cy="160" rx="30" ry="6"/><g class="shackle"><path class="shk" d="M624 118 L624 104 C624 95.2 631.2 88 640 88 C648.8 88 656 95.2 656 104 L656 118"/></g><rect x="614" y="114" width="52" height="42" rx="10" class="pkt"/><rect x="614" y="114" width="52" height="10" rx="5" class="hl"/><circle cx="640" cy="132" r="5" class="keyh"/><rect x="638" y="134" width="4" height="10" rx="2" class="keyh"/>`
  const css = `.art-privacy .shackle{animation:apv-lock 5s cubic-bezier(.4,1.6,.5,1) infinite}
.art-privacy .cell2{animation:apv-cell 5s ease-in-out infinite;animation-delay:var(--d)}
@keyframes apv-lock{0%,20%{transform:translateY(-9px)}34%,100%{transform:translateY(0)}}
@keyframes apv-cell{0%,100%{opacity:1}50%{opacity:.55}}`
  return { s, css, motion: [14, 0, 0, 0] }
}

// Feedback: two students, their ideas rising as speech bubbles (an idea, a like, a dot dot dot),
// landing as notes on a board.
aboutHeroes.Feedback = () => {
  let s = isle(300, 150, 56, 44)
  s += person(16, 22, '#c2227a', '#1d1514') + person(40, 18, '#7aa58a', '#8a6cc9')
  s += isle(410, 154, 40, 40)
  s += person(20, 20, '#a7c6ea', '#3a2a22')
  s += isle(600, 152, 104, 54)
  s += box(10, 22, 0, 6, 6, 40) + box(84, 22, 0, 6, 6, 40)
  s += wallY(4, 28.2, 20, 92, 66, 'l') + wallY(7, 28.4, 24, 86, 58, 'board')
  const notes = [[12, 66, 'pkt'], [34, 70, 'wat'], [58, 64, 'skt'], [14, 44, 'mit'], [38, 46, 'lit'], [62, 42, 'wat']]
  notes.forEach(([x, z, c], k) => (s += wallY(x, 28.6, z, 16, 14, k === 5 ? `${c} note` : c)))
  const bub = (x, y, w, cls, glyph, d) => `<g class="bub" style="--d:${d}s"><rect x="${x}" y="${y}" width="${w}" height="30" rx="15" class="${cls}"/><path class="${cls}" d="M${x + 12} ${y + 26} l-3 9 l10 -6z"/><g transform="translate(${x + w / 2} ${y + 15})">${glyph}</g></g>`
  const bulb = '<circle cx="0" cy="-2" r="6" class="wat"/><rect x="-3" y="4" width="6" height="4" rx="1.5" class="ring"/>'
  const heart = '<path class="pkt" d="M0 6 C -9 0, -7 -8, 0 -3 C 7 -8, 9 0, 0 6z"/>'
  const dots = '<circle cx="-8" cy="0" r="2.4" class="dot"/><circle cx="0" cy="0" r="2.4" class="dot"/><circle cx="8" cy="0" r="2.4" class="dot"/>'
  s += bub(268, 62, 40, 'bubg', bulb, 0) + bub(318, 30, 40, 'bubg', heart, -1.6) + bub(408, 70, 44, 'bubg', dots, -3.2)
  const css = `.art-feedback .bub{animation:afb-rise 4.8s ease-in-out infinite;animation-delay:var(--d)}
.art-feedback .note{animation:afb-note 4.8s ease-in-out infinite}
@keyframes afb-rise{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes afb-note{0%,40%{opacity:0}55%,100%{opacity:1}}`
  return { s, css, motion: [7, 0, 0, 0] }
}

/** A data card with field rows; row 2's value is being corrected (a wrong value, the fixed one over
 * it, a tick) by a pencil moving along it. (x, y): top-left; k: scale; p: animation prefix. */
function dataCard(x, y, k, p) {
  const W = 200 * k, H = 132 * k
  let s = `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="${14 * k}" class="gls"/><rect x="${x + 16 * k}" y="${y + 14 * k}" width="${70 * k}" height="${12 * k}" rx="${6 * k}" class="pkt"/>`
  for (let i = 0; i < 4; i++) {
    const ry = y + (40 + i * 22) * k
    s += `<rect x="${x + 16 * k}" y="${ry}" width="${40 * k}" height="${8 * k}" rx="${4 * k}" class="lnf"/>`
    if (i === 2) {
      s += `<rect x="${x + 66 * k}" y="${ry - 2 * k}" width="${84 * k}" height="${12 * k}" rx="${6 * k}" class="bad"/>`
      s += `<g class="${p}-fix"><rect x="${x + 66 * k}" y="${ry - 2 * k}" width="${84 * k}" height="${12 * k}" rx="${6 * k}" class="mit"/></g>`
      s += `<path class="${p}-tick tickp" d="M${x + 160 * k} ${ry + 4 * k} l${4 * k} ${4 * k} l${8 * k} ${-9 * k}"/>`
    } else s += `<rect x="${x + 66 * k}" y="${ry}" width="${(i % 2 ? 70 : 96) * k}" height="${8 * k}" rx="${4 * k}" class="big"/>`
  }
  // The pencil rests at the end of the corrected value.
  const px = x + 150 * k, py = y + 84 * k
  s += `<g class="${p}-pen"><g transform="translate(${px} ${py}) scale(${k})"><path class="pen" d="M0 0 l6 -18 l10 4 l-6 18z"/><path class="pentip" d="M0 0 l2.2 -6.6 l3.7 1.5z"/><path class="pencap" d="M6 -18 l1.6 -4.6 l10 4 l-1.6 4.6z"/></g></g>`
  return s
}
const fixCss = (p, dx) => `.${p}-fix{transform-box:fill-box;transform-origin:0 50%;animation:${p}-fix 5s ease-in-out infinite}
.${p}-pen{animation:${p}-pen 5s ease-in-out infinite}
.${p}-tick{stroke-dasharray:24;animation:${p}-tick 5s ease-out infinite}
@keyframes ${p}-fix{0%,15%{transform:scaleX(0)}55%,100%{transform:scaleX(1)}}
@keyframes ${p}-pen{0%,15%{transform:translateX(${-dx}px)}55%,100%{transform:translateX(0)}}
@keyframes ${p}-tick{0%,58%{stroke-dashoffset:24}72%,100%{stroke-dashoffset:0}}`

// Add or fix data: a Handbook page on the left feeds a subject's data card, where a pencil corrects
// one wrong fact and it turns green.
aboutHeroes.Contribute = () => {
  let s = isle(320, 150, 54, 44)
  for (let k = 0; k < 4; k++) s += box(10, 8, k * 4, 34, 28, 4, ['sheett', 'sheetl', 'sheetr'])
  s += `<g class="pg">${sheet(318, 82, -6, 'pkt')}</g>`
  s += `<path class="route" d="M346 100 C 380 90, 410 88, 438 92"/>`
  s += `<ellipse class="sh" cx="548" cy="166" rx="104" ry="10"/>`
  s += dataCard(448, 20, 1, 'act')
  const css = `.art-contribute .pg{animation:act-bob 5s ease-in-out infinite}
@keyframes act-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
${fixCss('act', 84)}`
  return { s, css, motion: [6, 0, 0, 0] }
}

// Yearly changes and updates: a timeline running across the band, each update a small card on its
// marker, the newest one at the end lifting with a pink head.
aboutHeroes.Changes = () => {
  let s = `<path class="tl" d="M244 140 C 340 128, 440 120, 640 102"/>`
  const pts = [[262, 137], [342, 129], [422, 123], [502, 115], [600, 105]]
  pts.forEach(([x, y], i) => {
    const last = i === pts.length - 1
    const w = last ? 60 : 44, h = last ? 52 : 38
    s += `<ellipse class="sh" cx="${x}" cy="${y + 4}" rx="${last ? 22 : 15}" ry="4"/><circle cx="${x}" cy="${y}" r="${last ? 7 : 5}" class="tldot" style="--d:${i * 0.7}s"/>`
    s += `<g class="${last ? 'newest' : 'upd'}"><line x1="${x}" y1="${y - 6}" x2="${x}" y2="${y - 18}" class="stem"/><rect x="${x - w / 2}" y="${y - 18 - h}" width="${w}" height="${h}" rx="8" class="gls"/><rect x="${x - w / 2}" y="${y - 18 - h}" width="${w}" height="${last ? 14 : 10}" rx="6" class="${last ? 'pkt' : COLS[i][0]}"/><rect x="${x - w / 2 + 8}" y="${y - 18 - h + (last ? 22 : 17)}" width="${w - 16}" height="4" rx="2" class="lnf"/><rect x="${x - w / 2 + 8}" y="${y - 18 - h + (last ? 31 : 25)}" width="${w - 24}" height="4" rx="2" class="lnf"/>${last ? `<rect x="${x - w / 2 + 8}" y="${y - 18 - h + 40}" width="${w - 20}" height="4" rx="2" class="lnf"/>` : ''}</g>`
  })
  const [nx, ny] = pts[4]
  s += `<g class="spark" style="transform-origin:${nx + 34}px ${ny - 76}px"><path class="wat" d="M${nx + 34} ${ny - 86} l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z"/></g>`
  const css = `.art-changes .tldot{animation:ach-dot 4.2s ease-in-out infinite;animation-delay:var(--d)}
.art-changes .newest{animation:ach-lift 4.2s ease-in-out infinite}
.art-changes .spark{animation:ach-spark 4.2s ease-in-out infinite}
@keyframes ach-dot{0%,100%{opacity:1}20%{opacity:.4}}
@keyframes ach-lift{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes ach-spark{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.6);opacity:.4}}`
  return { s, css, motion: [6, 0, 0, 0] }
}

// About: the site's own tile (pink glass, a white graduation cap), floating, its tassel swinging.
aboutMinis.About = () => {
  const s = `<ellipse class="sh" cx="100" cy="140" rx="34" ry="6"/><g class="float"><rect x="62" y="40" width="76" height="76" rx="20" class="pkt"/><rect x="62" y="40" width="76" height="30" rx="15" class="hl"/><path class="cap" d="M100 62 l28 11 l-28 11 l-28 -11z"/><path class="cap" d="M84 79 v10 q16 8 32 0 v-10 l-16 6z"/><g class="tassel" style="transform-origin:124px 74px"><path class="tas" d="M124 74 v14"/><circle cx="124" cy="90" r="2.6" class="tasb"/></g></g>`
  const css = `.mini-about .float{animation:mab-float 4.4s ease-in-out infinite}
.mini-about .tassel{animation:mab-swing 2.2s ease-in-out infinite}
@keyframes mab-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes mab-swing{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}`
  return { s, css, motion: [6, 0, 0, 0] }
}

// Privacy: a padlock clicking shut.
aboutMinis.Privacy = () => {
  const s = `<ellipse class="sh" cx="100" cy="140" rx="40" ry="7"/><g class="shackle"><path class="shk shk-big" d="M78 76 L78 56 C78 43.8 87.8 34 100 34 C112.2 34 122 43.8 122 56 L122 76"/></g><rect x="62" y="70" width="76" height="62" rx="14" class="pkt"/><rect x="62" y="70" width="76" height="16" rx="8" class="hl"/><circle cx="100" cy="98" r="7" class="keyh"/><rect x="97" y="101" width="6" height="14" rx="3" class="keyh"/>`
  const css = `.mini-privacy .shackle{animation:mpv-lock 4.6s cubic-bezier(.4,1.6,.5,1) infinite}
@keyframes mpv-lock{0%,25%{transform:translateY(-10px)}40%,100%{transform:translateY(0)}}`
  return { s, css, motion: [15, 0, 0, 0] }
}

// Feedback: two speech bubbles taking turns.
aboutMinis.Feedback = () => {
  const s = `<ellipse class="sh" cx="100" cy="140" rx="46" ry="6"/><g class="b1"><rect x="34" y="34" width="84" height="46" rx="23" class="bubg"/><path class="bubg" d="M54 76 l-6 14 l16 -9z"/><circle cx="62" cy="57" r="4" class="dot"/><circle cx="76" cy="57" r="4" class="dot"/><circle cx="90" cy="57" r="4" class="dot"/></g><g class="b2"><rect x="84" y="78" width="84" height="46" rx="23" class="bubp"/><path class="bubp" d="M148 120 l6 13 l-16 -8z"/><path class="heartw" d="M126 112 C 113 103, 116 91, 126 98 C 136 91, 139 103, 126 112z"/></g>`
  const css = `.mini-feedback .b1{animation:mfb-a 4.4s ease-in-out infinite}
.mini-feedback .b2{animation:mfb-a 4.4s ease-in-out infinite;animation-delay:-2.2s}
@keyframes mfb-a{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`
  return { s, css, motion: [6, 0, 0, 0] }
}

// Add or fix data: the data card with its pencil.
aboutMinis.Contribute = () => {
  const s = `<ellipse class="sh" cx="100" cy="140" rx="54" ry="6"/>` + dataCard(40, 44, 0.62, 'mct')
  return { s, css: fixCss('mct', 52), motion: [0, 0, 0, 0] }
}

// Changes: a short timeline down the panel, its markers lighting in turn, the newest one pink.
aboutMinis.Changes = () => {
  let s = `<line x1="70" y1="30" x2="70" y2="124" class="tlv"/>`
  ;[[36, 'pkt', 60], [70, 'lit', 48], [104, 'skt', 54]].forEach(([y, c, w], i) => {
    s += `<g class="mk" style="--d:${i * -0.8}s"><circle cx="70" cy="${y}" r="${i ? 6 : 8}" class="${c}"/></g><rect x="88" y="${y - 9}" width="${w}" height="18" rx="9" class="gls"/><rect x="96" y="${y - 2}" width="${w - 22}" height="4" rx="2" class="lnf"/>`
  })
  const css = `.mini-changes .mk{transform-box:fill-box;transform-origin:center;animation:mch-pulse 2.4s ease-in-out infinite;animation-delay:var(--d)}
@keyframes mch-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}`
  return { s, css, motion: [2, 0, 2, 2] }
}

// ================= Subject pages (src/components/subject/art/) =================
// The foot of a subject page's "On this page" panel: the subject as a book, its code on the
// cover's label, a pink bookmark ribbon swaying under it.
const subjectMinis = {}
subjectMinis.Subject = () => {
  let s = `<ellipse class="sh" cx="100" cy="136" rx="44" ry="7"/><g transform="rotate(-4 100 80)">`
  s += `<rect x="70" y="30" width="72" height="98" rx="4" class="sheet"/><path class="lnf" d="M138 36 v86 h-2 v-86z"/>`
  s += `<rect x="60" y="28" width="76" height="100" rx="7" class="lit"/><rect x="60" y="28" width="14" height="100" rx="5" class="lil"/><rect x="60" y="28" width="76" height="22" rx="7" class="hl"/>`
  s += `<rect x="82" y="50" width="44" height="30" rx="6" class="sheet"/><rect x="89" y="57" width="22" height="6" rx="3" class="pkt"/><rect x="89" y="68" width="30" height="4" rx="2" class="lnf"/>`
  s += `<g class="ribbon"><path class="pkt" d="M110 120 h9 v28 l-4.5 -5 l-4.5 5z"/></g></g>`
  const css = `.mini-subject .ribbon{transform-origin:114.5px 120px;animation:msu-sway 3.8s ease-in-out infinite}
@keyframes msu-sway{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}`
  return { s, css, motion: [0, 6, 2, 6] }
}

// ================= Find subjects (src/components/browse/art/) =================
// The hero of Find subjects, Majors and Careers: loose subject cards on the left, one travelling
// along a dashed path to a shelf where the rest already stand sorted by colour, with a student
// beside it. The small one at the foot of the filter panel: cards dropping through a sieve.
const browseHeroes = {}
const browseMinis = {}
browseHeroes.Browse = () => {
  let s = `<ellipse class="sh" cx="306" cy="152" rx="70" ry="9"/>`
  ;[[262, 112, -9, 'skt', 0], [300, 84, 7, 'pkt', -1.6], [326, 124, -4, 'mit', -3.1], [356, 96, 10, 'wat', -0.8]].forEach(([x, y, rot, c, d]) => {
    s += `<g class="pg" style="--d:${d}s">${sheet(x, y, rot, c)}</g>`
  })
  const route = 'M384 92 C 420 58, 470 52, 534 74'
  s += `<path class="route" d="${route}"/>`
  s += `<g class="fly" style="offset-path:path('${route}')"><rect x="-8" y="-10" width="16" height="20" rx="2.5" class="sheet"/><rect x="-5" y="-6" width="8" height="3" rx="1.5" class="lit"/></g>`
  // The shelf: a base board, the cards standing on it sorted by colour, a top board; one slot
  // near the end fills as the travelling card arrives.
  s += isle(612, 150, 112, 58)
  s += box(4, 14, 0, 104, 30, 5, ['sheett', 'sheetl', 'sheetr'])
  const spines = [COLS[0], COLS[0], COLS[1], COLS[1], COLS[1], COLS[2], COLS[2], COLS[3], COLS[3], COLS[4]]
  spines.forEach((c, k) => {
    const h = 30 + ((k * 7) % 4) * 3
    s += box(8 + k * 10, 20, 5, 8, 20, h, c, k === 4 ? ' class="new"' : '')
  })
  s += person(118, 44, '#bfaef3', '#3a2a22')
  const css = `.art-browse .pg{animation:abr-bob 6s ease-in-out infinite;animation-delay:var(--d)}
.art-browse .fly{offset-rotate:0deg;offset-distance:70%;animation:abr-fly 6s ease-in-out infinite}
.art-browse .new{animation:abr-new 6s ease-in-out infinite}
@keyframes abr-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes abr-fly{0%{offset-distance:0%;opacity:0}10%{opacity:1}75%{opacity:1}90%,100%{offset-distance:100%;opacity:0}}
@keyframes abr-new{0%,80%{opacity:.3}92%,100%{opacity:1}}`
  return { s, css, motion: [6, 0, 0, 0] }
}

// Filters: three cards above a glass sieve; one card has come through and rests below it.
browseMinis.Browse = () => {
  let s = `<ellipse class="sh" cx="100" cy="138" rx="40" ry="6"/>`
  s += `<g transform="translate(78 36) rotate(-10)"><rect x="-12" y="-15" width="24" height="30" rx="3" class="sheet"/><rect x="-8" y="-10" width="12" height="3.5" rx="1.75" class="skt"/></g>`
  s += `<g transform="translate(122 34) rotate(9)"><rect x="-12" y="-15" width="24" height="30" rx="3" class="sheet"/><rect x="-8" y="-10" width="12" height="3.5" rx="1.75" class="mit"/></g>`
  s += `<g class="drop"><rect x="88" y="16" width="24" height="30" rx="3" class="sheet"/><rect x="92" y="21" width="12" height="3.5" rx="1.75" class="pkt"/></g>`
  s += `<path class="gls" d="M52 56 H148 L116 92 V108 H84 V92 Z"/><path class="ln" d="M64 64 H136"/>`
  s += `<g transform="translate(100 124)"><rect x="-14" y="-12" width="28" height="22" rx="4" class="pkt"/><rect x="-14" y="-12" width="28" height="8" rx="4" class="hl"/></g>`
  const css = `.mini-browse .drop{animation:mbr-drop 4.8s ease-in-out infinite}
@keyframes mbr-drop{0%,15%{transform:translateY(0);opacity:1}55%{transform:translateY(30px);opacity:0}56%{transform:translateY(0);opacity:0}75%,100%{transform:translateY(0);opacity:1}}`
  return { s, css, motion: [0, 0, 30, 0] }
}

// A major's page: three steps rising left to right (levels 1, 2, 3), subject blocks on each,
// a flag on the top step and a student on the way up.
browseHeroes.Major = () => {
  let s = ''
  const steps = [[300, 154, 10, COLS[2]], [410, 138, 26, COLS[1]], [520, 122, 42, COLS[0]]]
  steps.forEach(([cx, cy, h, c], i) => {
    s += isle(cx, cy, 70, 52, h)
    s += box(8, 10, 0, 16, 16, 12, COLS[(i + 2) % 5]) + box(30, 12, 0, 16, 16, 12, c)
    if (i === 1) s += person(56, 34, '#9d8bf2', '#3a2a22', 'climb')
    if (i === 2) {
      const [fx, fy] = P(52, 30, 0)
      s += `<line x1="${fx}" y1="${fy}" x2="${fx}" y2="${r(fy - 44)}" class="stand"/><g class="flag" style="transform-origin:${fx}px ${r(fy - 44)}px"><path class="pkt" d="M${fx} ${r(fy - 44)} l24 6 l-24 7z"/></g>`
    }
  })
  const css = `.art-major .flag{animation:ama-wave 3.6s ease-in-out infinite}
.art-major .climb{animation:ama-bob 3.6s ease-in-out infinite}
@keyframes ama-wave{0%,100%{transform:skewY(0)}50%{transform:skewY(-6deg)}}
@keyframes ama-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}`
  return { s, css, motion: [4, 0, 0, 0] }
}

// A career's page: a dashed path from a stack of subject cards to a briefcase on its own
// island, the briefcase lifting a little.
browseHeroes.Career = () => {
  let s = isle(310, 150, 60, 48)
  for (let k = 0; k < 3; k++) s += box(14, 12, k * 6, 32, 26, 6, k === 2 ? COLS[0] : ['sheett', 'sheetl', 'sheetr'])
  s += person(50, 34, '#7aa58a', '#1d1514')
  const route = 'M360 112 C 410 80, 470 78, 540 98'
  s += `<path class="route" d="${route}"/>`
  s += isle(590, 148, 96, 60)
  s += `<g class="case-lift"><rect x="556" y="70" width="70" height="50" rx="9" class="case"/><rect x="556" y="70" width="70" height="16" rx="8" class="hl"/><path class="handle2" d="M578 70 v-8 a5 5 0 0 1 5 -5 h16 a5 5 0 0 1 5 5 v8"/><rect x="584" y="92" width="14" height="8" rx="2" class="wat"/></g>`
  s += `<g class="spark" style="transform-origin:640px 58px"><path class="wat" d="M640 48 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z"/></g>`
  const css = `.art-career .case-lift{animation:aca-lift 5s ease-in-out infinite}
.art-career .spark{animation:aca-spark 5s ease-in-out infinite}
@keyframes aca-lift{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes aca-spark{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.6);opacity:.4}}`
  return { s, css, motion: [6, 0, 0, 0] }
}

// The foot of a major's "On this page": three blocks as steps, the top one pink.
browseMinis.Major = () => {
  let s = `<ellipse class="sh" cx="100" cy="134" rx="54" ry="8"/>`
  origin(64, 88)
  s += box(0, 0, 0, 22, 22, 14, COLS[2]) + box(22, 0, 0, 22, 22, 28, COLS[1]) + `<g class="top">${box(44, 0, 0, 22, 22, 42, COLS[0])}</g>`
  const css = `.mini-major .top{animation:mma-bob 4s ease-in-out infinite}
@keyframes mma-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`
  return { s, css, motion: [4, 0, 0, 0] }
}

// The foot of a career's "On this page": a briefcase, floating.
browseMinis.Career = () => {
  const s = `<ellipse class="sh" cx="100" cy="136" rx="38" ry="6"/><g class="float"><rect x="62" y="58" width="76" height="56" rx="10" class="case"/><rect x="62" y="58" width="76" height="18" rx="9" class="hl"/><path class="handle2" d="M86 58 v-9 a6 6 0 0 1 6 -6 h16 a6 6 0 0 1 6 6 v9"/><rect x="92" y="82" width="16" height="9" rx="2" class="wat"/></g>`
  const css = `.mini-career .float{animation:mca-float 4.4s ease-in-out infinite}
@keyframes mca-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`
  return { s, css, motion: [6, 0, 0, 0] }
}

// ================= The planner and its compare page (src/components/planner/art/) =================
// The planner's hero: the degree as a path of semester slabs rising left to right, each holding
// its subject blocks; a block drops into the next free slot, a student walks the path, and a
// flag waits on the last slab.
const planHeroes = {}
planHeroes.Plan = () => {
  let s = `<path class="route" d="M262 150 C 340 150, 420 120, 470 112 S 600 86, 664 70"/>`
  const slabs = [[270, 150, 3], [352, 138, 4], [434, 124, 4], [516, 110, 4], [598, 96, 2]]
  slabs.forEach(([cx, cy, n], i) => {
    s += isle(cx, cy, 46, 40, 6)
    for (let k = 0; k < n; k++) {
      const cls = COLS[(i + k) % 5]
      const x = 6 + (k % 2) * 18, y = 6 + Math.floor(k / 2) * 16
      s += i === 4 && k === 1 ? `<g class="drop">${box(x, y, 0, 14, 12, 8, cls)}</g>` : box(x, y, 0, 14, 12, 8, cls)
    }
    if (i === 2) s += person(36, 34, '#9d8bf2', '#3a2a22', 'walk')
  })
  origin(676, 80)
  const [fx, fy] = P(0, 0, 0)
  s += `<ellipse class="sh" cx="${fx}" cy="${fy + 4}" rx="12" ry="4"/><line x1="${fx}" y1="${fy}" x2="${fx}" y2="${r(fy - 42)}" class="stand"/><g class="flag" style="transform-origin:${fx}px ${r(fy - 42)}px"><path class="pkt" d="M${fx} ${r(fy - 42)} l22 6 l-22 7z"/></g>`
  const css = `.art-plan .drop{animation:apl-drop 5.4s cubic-bezier(.3,.7,.2,1) infinite}
.art-plan .walk{animation:apl-bob 3.6s ease-in-out infinite}
.art-plan .flag{animation:apl-wave 3.6s ease-in-out infinite}
@keyframes apl-drop{0%{transform:translateY(-22px);opacity:0}15%{opacity:1}35%,85%{transform:translateY(0);opacity:1}100%{transform:translateY(0);opacity:0}}
@keyframes apl-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes apl-wave{0%,100%{transform:skewY(0)}50%{transform:skewY(-6deg)}}`
  return { s, css, motion: [22, 0, 0, 0] }
}
// The compare page's hero: two plans as glass sheets side by side, their semester rows lined up;
// most rows match (quiet), one row in each differs and lifts a little, with a swap arrow between.
planHeroes.Compare = () => {
  let s = `<ellipse class="sh" cx="470" cy="166" rx="200" ry="11"/>`
  const sheetAt = (x, head, diffRow) => {
    let g = `<rect x="${x}" y="18" width="150" height="140" rx="14" class="gls"/><rect x="${x}" y="18" width="150" height="22" rx="11" class="${head}"/><rect x="${x}" y="30" width="150" height="10" class="${head}"/>`
    for (let k = 0; k < 4; k++) {
      const y = 52 + k * 25
      const diff = k === diffRow
      const cells = diff ? `<g class="lift"><rect x="${x + 12}" y="${y}" width="126" height="17" rx="8.5" class="${head}"/><rect x="${x + 20}" y="${y + 6}" width="54" height="5" rx="2.5" class="hl"/></g>` : `<rect x="${x + 12}" y="${y}" width="126" height="17" rx="8.5" class="lnf"/>`
      g += cells
    }
    return g
  }
  s += sheetAt(318, 'pkt', 1) + sheetAt(512, 'skt', 2)
  s += `<g class="swap"><circle cx="490" cy="88" r="15" class="gls"/><path class="gly" d="M482 84 h14 l-4 -4 M498 92 h-14 l4 4"/></g>`
  const css = `.art-compare .lift{animation:acp-lift 4.6s ease-in-out infinite}
.art-compare .swap{transform-box:fill-box;transform-origin:center;animation:acp-swap 4.6s ease-in-out infinite}
@keyframes acp-lift{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes acp-swap{0%,40%{transform:rotate(0)}60%,100%{transform:rotate(180deg)}}`
  return { s, css, motion: [4, 0, 0, 0] }
}


// ================= The tools (src/components/tools/art/) =================
// The tools hub: its two tools as glass cards on a shelf, a calculator and a WAM gauge; the
// calculator's answer key glows and the gauge's needle swings up.
const toolHeroes = {}
toolHeroes.Tools = () => {
  let s = `<ellipse class="sh" cx="480" cy="164" rx="190" ry="10"/>`
  s += `<rect x="318" y="30" width="120" height="128" rx="14" class="gls"/><rect x="330" y="42" width="96" height="26" rx="7" class="skt"/><rect x="382" y="52" width="34" height="6" rx="3" class="hl"/>`
  for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 3; c++) s += `<rect x="${330 + c * 33}" y="${78 + r2 * 24}" width="29" height="18" rx="5" class="${r2 === 2 && c === 2 ? 'pkt' : 'lnf'}"/>`
  s += `<rect x="460" y="46" width="200" height="112" rx="14" class="gls"/>`
  s += `<path class="lnf" d="M498 144 a62 62 0 0 1 124 0 h-18 a44 44 0 0 0 -88 0 z"/><path class="pkt" d="M593 92.3 a62 62 0 0 1 29 51.7 h-18 a44 44 0 0 0 -20.6 -36.7 z"/>`
  s += `<g class="needle" style="transform-origin:560px 144px"><line x1="560" y1="144" x2="594" y2="104" class="stand"/></g><circle cx="560" cy="144" r="6" class="pkt"/>`
  const css = `.art-tools .needle{animation:atl-swing 5s ease-in-out infinite}
@keyframes atl-swing{0%,100%{transform:rotate(-36deg)}50%,80%{transform:rotate(0)}}`
  return { s, css, motion: [0, 0, 0, 0] }
}
// The final calculator: an exam sheet with its parts, and bars for the grades rising towards a
// dashed target line; the last bar grows up to it.
toolHeroes.Final = () => {
  let s = `<ellipse class="sh" cx="476" cy="164" rx="196" ry="10"/>`
  s += `<rect x="296" y="20" width="132" height="138" rx="14" class="gls"/><rect x="310" y="34" width="60" height="8" rx="4" class="pkt"/>`
  for (let k = 0; k < 4; k++) s += `<rect x="310" y="${56 + k * 22}" width="${k === 3 ? 70 : 104}" height="12" rx="6" class="lnf"/>`
  s += `<rect x="450" y="34" width="210" height="124" rx="14" class="gls"/><line x1="464" y1="66" x2="646" y2="66" class="route"/>`
  const bars = [[474, 70], [512, 58], [550, 46], [588, 36]]
  bars.forEach(([x, h]) => (s += `<rect x="${x}" y="${146 - h}" width="26" height="${h}" rx="6" class="lit"/>`))
  s += `<g class="grow"><rect x="626" y="68" width="26" height="78" rx="6" class="pkt"/><rect x="632" y="76" width="14" height="5" rx="2.5" class="hl"/></g>`
  const css = `.art-final .grow{transform-box:fill-box;transform-origin:50% 100%;animation:afn-grow 5s ease-in-out infinite}
@keyframes afn-grow{0%,15%{transform:scaleY(.55)}55%,100%{transform:scaleY(1)}}`
  return { s, css, motion: [0, 0, 0, 0] }
}
// The WAM calculator: a gauge whose needle swings up towards a target mark, beside a stack of
// marked subjects (blocks) adding up.
toolHeroes.Wam = () => {
  let s = `<ellipse class="sh" cx="470" cy="164" rx="200" ry="10"/>`
  s += `<rect x="290" y="28" width="230" height="130" rx="16" class="gls"/>`
  s += `<path class="lnf" d="M322 140 a83 83 0 0 1 166 0 h-22 a61 61 0 0 0 -122 0 z"/>`
  s += `<path class="pkt" d="M444.4 82.7 a83 83 0 0 1 43.6 57.3 h-22 a61 61 0 0 0 -32.1 -42.1 z"/>`
  s += `<g class="needle" style="transform-origin:405px 140px"><line x1="405" y1="140" x2="452" y2="86" class="stand"/></g><circle cx="405" cy="140" r="7" class="pkt"/>`
  const stack = [['skt', 136], ['lit', 116], ['pkt', 96], ['skt', 76]]
  stack.forEach(([c, y], i) => (s += `<rect x="${548 + (i % 2) * 8}" y="${y}" width="100" height="18" rx="9" class="${c}"/><rect x="${558 + (i % 2) * 8}" y="${y + 6.5}" width="${30 + i * 6}" height="5" rx="2.5" class="hl"/>`))
  const css = `.art-wam .needle{animation:awm-swing 5s ease-in-out infinite}
@keyframes awm-swing{0%,100%{transform:rotate(-38deg)}50%,80%{transform:rotate(0)}}`
  return { s, css, motion: [0, 0, 0, 0] }
}

// The revision planner: a month calendar on glass whose days carry coloured study blocks, the
// exam day marked with a flag, and a clock beside it; today's block fills in.
toolHeroes.Revision = () => {
  let s = `<ellipse class="sh" cx="474" cy="164" rx="198" ry="10"/>`
  s += `<rect x="292" y="24" width="250" height="134" rx="16" class="gls"/><rect x="308" y="38" width="76" height="8" rx="4" class="pkt"/>`
  const fills = ['lit', 'skt', 'lit', 'lnf', 'skt', 'lit', 'lnf', 'skt', 'lit', 'skt', 'lnf', 'lit', 'skt', 'lit', 'lnf']
  for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 5; c++) {
    const k = r2 * 5 + c
    if (k === 13) continue
    s += `<rect x="${308 + c * 46}" y="${58 + r2 * 32}" width="38" height="24" rx="6" class="${fills[k]}"/>`
  }
  s += `<g class="fill"><rect x="446" y="122" width="38" height="24" rx="6" class="pkt"/></g>`
  s += `<line x1="508" y1="118" x2="508" y2="148" class="stand"/><path class="pkt" d="M508 118 h20 l-6 6 l6 6 h-20 z"/>`
  s += `<circle cx="612" cy="104" r="48" class="gls"/><circle cx="612" cy="104" r="34" class="lnf"/>`
  s += `<line x1="612" y1="104" x2="612" y2="80" class="stand"/><g class="hand" style="transform-origin:612px 104px"><line x1="612" y1="104" x2="630" y2="104" class="stand"/></g><circle cx="612" cy="104" r="4" class="pkt"/>`
  const css = `.art-revision .fill{transform-box:fill-box;transform-origin:0 50%;animation:arv-fill 5s ease-in-out infinite}
.art-revision .hand{animation:arv-turn 5s ease-in-out infinite}
@keyframes arv-fill{0%,15%{transform:scaleX(.2)}55%,100%{transform:scaleX(1)}}
@keyframes arv-turn{0%,10%{transform:rotate(0)}60%,100%{transform:rotate(90deg)}}`
  return { s, css, motion: [0, 0, 0, 0] }
}


// ================= My record and Saved (src/components/profile/art/, src/components/shortlist/art/) =================
const myHeroes = {}
// My record: a transcript sheet, one row per subject with its mark pill, and a round WAM badge
// beside it with a target flag; the newest row slides in.
myHeroes.Record = () => {
  let s = `<ellipse class="sh" cx="476" cy="164" rx="196" ry="10"/>`
  s += `<rect x="296" y="22" width="226" height="136" rx="16" class="gls"/><rect x="312" y="36" width="70" height="8" rx="4" class="pkt"/>`
  const rows = [['lnf', 'lit'], ['lnf', 'skt'], ['lnf', 'lit']]
  rows.forEach(([a, b], i) => (s += `<rect x="312" y="${58 + i * 24}" width="120" height="12" rx="6" class="${a}"/><rect x="460" y="${56 + i * 24}" width="44" height="16" rx="8" class="${b}"/>`))
  s += `<g class="slide"><rect x="312" y="130" width="96" height="12" rx="6" class="lnf"/><rect x="460" y="128" width="44" height="16" rx="8" class="pkt"/></g>`
  s += `<circle cx="604" cy="98" r="50" class="gls"/><circle cx="604" cy="98" r="36" class="lit"/><rect x="584" y="92" width="40" height="12" rx="6" class="hl"/>`
  s += `<line x1="652" y1="40" x2="652" y2="78" class="stand"/><path class="pkt" d="M652 40 h22 l-6 7 l6 7 h-22 z"/>`
  const css = `.art-record .slide{animation:arc-slide 5s ease-in-out infinite}
@keyframes arc-slide{0%,15%{transform:translateX(-10px);opacity:.4}45%,100%{transform:none;opacity:1}}`
  return { s, css, motion: [0, 0, 0, 10] }
}
// Saved: the saved subjects as rows of one table with aligned columns, a heart on the top card,
// and a sort arrow over one column; the heart beats.
myHeroes.Shortlist = () => {
  let s = `<ellipse class="sh" cx="478" cy="164" rx="196" ry="10"/>`
  s += `<rect x="300" y="26" width="356" height="132" rx="16" class="gls"/>`
  const cols = [318, 444, 512, 580]
  cols.forEach((x, i) => (s += `<rect x="${x}" y="40" width="${i ? 44 : 100}" height="8" rx="4" class="${i === 2 ? 'pkt' : 'lnf'}"/>`))
  ;['lit', 'skt', 'lit', 'skt'].forEach((c, r2) => {
    const y = 62 + r2 * 22
    s += `<rect x="318" y="${y}" width="${100 - r2 * 10}" height="12" rx="6" class="lnf"/>`
    cols.slice(1).forEach((x, i) => (s += `<rect x="${x}" y="${y}" width="${i === 1 ? 44 - r2 * 8 : 36}" height="12" rx="6" class="${i === 1 ? c : 'lnf'}"/>`))
  })
  s += `<g class="beat" style="transform-origin:630px 150px"><path class="pkt" d="M630 160 c-12 -9 -18 -15 -18 -22 a9 9 0 0 1 18 -4 a9 9 0 0 1 18 4 c0 7 -6 13 -18 22 z"/></g>`
  const css = `.art-shortlist .beat{animation:asl-beat 5s ease-in-out infinite}
@keyframes asl-beat{0%,100%{transform:scale(1)}10%{transform:scale(1.12)}20%{transform:scale(1)}}`
  return { s, css, motion: [4, 4, 4, 4] }
}

// ---------- write ----------
// Each viewBox is fitted to its scene: the drawn shapes (bounds.cjs), plus how far its loop moves
// things (`motion`: top, right, bottom, left), plus a little air, so nothing is ever clipped.
function fitBox(s, [top, right, bottom, left] = [0, 0, 0, 0], air = 6) {
  const b = bounds(s)
  const x = Math.floor(b.x0 - left - air), y = Math.floor(b.y0 - top - air)
  return `${x} ${y} ${Math.ceil(b.x1 + right + air) - x} ${Math.ceil(b.y1 + bottom + air) - y}`
}
function write(file, cls, vb, s, css, what, align = 'xMidYMid', dir = OUT, cssSrc = './art.css') {
  const sfc = `<!-- Generated by scripts/art/gen.cjs: ${what}. Decorative. -->
<template>
  <svg class="art ${cls}" viewBox="${vb}" preserveAspectRatio="${align} meet" focusable="false" aria-hidden="true">${s}</svg>
</template>

<style src="${cssSrc}"></style>
<style>
${css}
</style>
`
  fs.writeFileSync(`${dir}${file}.vue`, sfc)
  console.log(file, vb, Buffer.byteLength(sfc), 'bytes')
}
for (const [name, fn] of Object.entries(heroes)) {
  const { s, css, motion } = fn()
  write(`Art${name}`, `art-${name.toLowerCase()}`, fitBox(s, motion), s, css, `the wide hero band of the guide's ${name} page`, 'xMaxYMax')
}
for (const [name, fn] of Object.entries(minis)) {
  const { s, css, motion } = fn()
  write(`Mini${name}`, `mini-${name.toLowerCase()}`, fitBox(s, motion), s, css, `the small ${name} illustration (its "On this page" panel and overview card)`)
}
const ABOUT = path.join(__dirname, '../../src/components/about/art/')
fs.mkdirSync(ABOUT, { recursive: true })
for (const [name, fn] of Object.entries(aboutHeroes)) {
  const { s, css, motion } = fn()
  write(`Art${name}`, `art-${name.toLowerCase()}`, fitBox(s, motion), s, css, `the wide hero band of the ${name} page`, 'xMaxYMax', ABOUT, '../../guide/art/art.css')
}
for (const [name, fn] of Object.entries(aboutMinis)) {
  const { s, css, motion } = fn()
  write(`Mini${name}`, `mini-${name.toLowerCase()}`, fitBox(s, motion), s, css, `the small ${name} illustration (its "On this page" panel)`, 'xMidYMid', ABOUT, '../../guide/art/art.css')
}
const SUBJECT = path.join(__dirname, '../../src/components/subject/art/')
fs.mkdirSync(SUBJECT, { recursive: true })
for (const [name, fn] of Object.entries(subjectMinis)) {
  const { s, css, motion } = fn()
  write(`Mini${name}`, `mini-${name.toLowerCase()}`, fitBox(s, motion), s, css, `the small illustration of a subject page's "On this page" panel`, 'xMidYMid', SUBJECT, '../../guide/art/art.css')
}
const BROWSE = path.join(__dirname, '../../src/components/browse/art/')
fs.mkdirSync(BROWSE, { recursive: true })
for (const [name, fn] of Object.entries(browseHeroes)) {
  const { s, css, motion } = fn()
  write(`Art${name}`, `art-${name.toLowerCase()}`, fitBox(s, motion), s, css, name === 'Browse' ? 'the wide hero band of Find subjects, Majors and Careers' : `the wide hero band of a ${name.toLowerCase()}'s page`, 'xMaxYMax', BROWSE, '../../guide/art/art.css')
}
for (const [name, fn] of Object.entries(browseMinis)) {
  const { s, css, motion } = fn()
  write(`Mini${name}`, `mini-${name.toLowerCase()}`, fitBox(s, motion), s, css, name === 'Browse' ? "the small illustration at the foot of Find subjects' filter panel" : `the small illustration at the foot of a ${name.toLowerCase()}'s "On this page" panel`, 'xMidYMid', BROWSE, '../../guide/art/art.css')
}
const PLANNER = path.join(__dirname, '../../src/components/planner/art/')
fs.mkdirSync(PLANNER, { recursive: true })
for (const [name, fn] of Object.entries(planHeroes)) {
  const { s, css, motion } = fn()
  write(`Art${name}`, `art-${name.toLowerCase()}`, fitBox(s, motion), s, css, name === 'Plan' ? 'the wide hero band of the planner' : 'the wide hero band of the compare page', 'xMaxYMax', PLANNER, '../../guide/art/art.css')
}
const TOOLS_DIR = path.join(__dirname, '../../src/components/tools/art/')
fs.mkdirSync(TOOLS_DIR, { recursive: true })
for (const [name, fn] of Object.entries(toolHeroes)) {
  const { s, css, motion } = fn()
  write(`Art${name}`, `art-${name.toLowerCase()}`, fitBox(s, motion), s, css, name === 'Tools' ? 'the wide hero band of the tools page' : name === 'Revision' ? 'the wide hero band of the revision planner' : `the wide hero band of the ${name === 'Wam' ? 'WAM' : 'final'} calculator`, 'xMaxYMax', TOOLS_DIR, '../../guide/art/art.css')
}
// The foot of the revision planner's side panel: an hourglass, its sand running down, turning over
// at the end of each loop.
const toolMinis = {}
toolMinis.Revision = () => {
  let s = `<ellipse class="sh" cx="100" cy="138" rx="34" ry="6"/><g class="turn">`
  s += `<rect x="70" y="30" width="60" height="9" rx="4" class="lil"/><rect x="70" y="121" width="60" height="9" rx="4" class="lil"/>`
  s += `<path class="gls" d="M78 39 h44 c0 22 -16 30 -16 41 c0 11 16 19 16 41 h-44 c0 -22 16 -30 16 -41 c0 -11 -16 -19 -16 -41z"/>`
  s += `<path class="pkt top" d="M84 50 h32 c-3 10 -11 16 -13 24 h-6 c-2 -8 -10 -14 -13 -24z"/>`
  s += `<rect x="99" y="80" width="2" height="34" rx="1" class="pkt"/>`
  s += `<path class="pkt bot" d="M84 119 h32 c-2 -10 -9 -15 -16 -15 c-7 0 -14 5 -16 15z"/></g>`
  const css = `.mini-revision .turn{transform-origin:100px 80px;animation:mrv-turn 6s ease-in-out infinite}
.mini-revision .top{transform-box:fill-box;transform-origin:50% 100%;animation:mrv-top 6s linear infinite}
.mini-revision .bot{transform-box:fill-box;transform-origin:50% 100%;animation:mrv-bot 6s linear infinite}
@keyframes mrv-turn{0%,85%{transform:rotate(0)}100%{transform:rotate(180deg)}}
@keyframes mrv-top{0%{transform:scaleY(1)}85%,100%{transform:scaleY(.15)}}
@keyframes mrv-bot{0%{transform:scaleY(.3)}85%,100%{transform:scaleY(1)}}`
  return { s, css, motion: [0, 2, 0, 2] }
}
for (const [name, fn] of Object.entries(toolMinis)) {
  const { s, css, motion } = fn()
  write(`Mini${name}`, `mini-${name.toLowerCase()}`, fitBox(s, motion), s, css, 'the small illustration at the foot of the revision planner\'s side panel', 'xMidYMid', TOOLS_DIR, '../../guide/art/art.css')
}
const MY = { Record: path.join(__dirname, '../../src/components/profile/art/'), Shortlist: path.join(__dirname, '../../src/components/shortlist/art/') }
for (const [name, fn] of Object.entries(myHeroes)) {
  const { s, css, motion } = fn()
  fs.mkdirSync(MY[name], { recursive: true })
  write(`Art${name}`, `art-${name.toLowerCase()}`, fitBox(s, motion), s, css, name === 'Record' ? 'the wide hero band of My record' : 'the wide hero band of Saved', 'xMaxYMax', MY[name], '../../guide/art/art.css')
}
