// Generates the guide's illustrations in src/components/guide/art/:
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
  return { s, css }
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
@keyframes ab-drop{0%{transform:translateY(-40px);opacity:0}15%{opacity:1}35%,85%{transform:translateY(0);opacity:1}100%{transform:translateY(0);opacity:0}}
@keyframes ab-walk{0%{transform:translate(0,0);opacity:0}10%,85%{opacity:1}100%{transform:translate(${r(bx - ax)}px,${r(by - ay)}px);opacity:0}}
@keyframes ab-sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}`
  return { s, css }
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
  return { s, css }
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
@keyframes ae-drop{0%{transform:translate(18px,-36px);opacity:0}12%{opacity:1}30%,80%{transform:translate(0,0);opacity:1}92%,100%{transform:translate(0,0);opacity:0}}
@keyframes ae-chip{0%,100%{transform:translateX(0)}50%{transform:translateX(8px)}}`
  return { s, css }
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
  return { s, css }
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
  return { s: defs + s, css }
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
  return { s, css }
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
  return { s, css }
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
  return { s, css }
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
  return { s, css }
}

// Basics: credit points stacking, the top block bobbing into place.
minis.Basics = () => {
  let s = isle(100, 124, 54, 54)
  for (let k = 0; k < 3; k++) s += box(13, 13, k * 13, 28, 28, 13, COLS[k])
  s += `<g class="bob">${box(13, 13, 39, 28, 28, 13, COLS[3])}</g>`
  const css = `.mini-basics .bob{animation:mb-bob 3.6s ease-in-out infinite}
@keyframes mb-bob{0%,100%{transform:translateY(-8px)}50%{transform:translateY(0)}}`
  return { s, css }
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
  return { s, css }
}

// During semester: an exam paper with a clock ticking at its corner.
minis.Semester = () => {
  let s = `<ellipse class="sh" cx="96" cy="140" rx="44" ry="7"/><g transform="rotate(-6 92 80)"><rect x="56" y="24" width="72" height="104" rx="6" class="sheet"/><rect x="66" y="36" width="34" height="6" rx="3" class="pkt"/>`
  for (let k = 0; k < 5; k++) s += `<rect x="66" y="${52 + k * 13}" width="${52 - (k % 2) * 14}" height="4" rx="2" class="lnf"/>`
  s += `</g><circle cx="132" cy="104" r="22" class="face"/><circle cx="132" cy="104" r="22" class="rim"/><line x1="132" y1="104" x2="132" y2="94" class="hand hour"/><g class="min" style="transform-origin:132px 104px"><line x1="132" y1="104" x2="132" y2="89" class="hand"/></g><circle cx="132" cy="104" r="2" class="pin"/>`
  const css = `.mini-semester .min{animation:msm-min 8s linear infinite}
@keyframes msm-min{to{transform:rotate(360deg)}}`
  return { s, css }
}

// Wellbeing & life: a cup of coffee, steam curling up.
minis.Life = () => {
  const s = `<ellipse class="sh" cx="100" cy="136" rx="46" ry="8"/><ellipse cx="100" cy="124" rx="44" ry="10" class="saucer"/><path class="cup" d="M70 76 h60 l-6 44 q-24 8 -48 0z"/><path class="cupband" d="M71.6 88 h56.8 l-1.4 10 h-54z"/><path class="handle" d="M129 84 q18 0 16 14 q-2 12 -18 10"/><ellipse cx="100" cy="76" rx="30" ry="7" class="coffee"/><path class="steam" style="--d:0s" d="M90 64 q-6 -8 0 -16 q6 -8 0 -16"/><path class="steam" style="--d:-1s" d="M102 64 q-6 -8 0 -16 q6 -8 0 -16"/><path class="steam" style="--d:-2s" d="M114 64 q-6 -8 0 -16 q6 -8 0 -16"/>`
  const css = `.mini-life .steam{fill:none;stroke:var(--a-steam);stroke-width:3;stroke-linecap:round;animation:ml-steam 3s ease-out infinite;animation-delay:var(--d)}
@keyframes ml-steam{0%{transform:translateY(6px);opacity:0}30%{opacity:.9}100%{transform:translateY(-10px);opacity:0}}`
  return { s, css }
}

// International: a suitcase, its luggage tag swinging.
minis.International = () => {
  const s = `<ellipse class="sh" cx="100" cy="142" rx="50" ry="7"/><path class="handle2" d="M86 50 v-14 q0 -6 6 -6 h16 q6 0 6 6 v14"/><rect x="54" y="48" width="92" height="84" rx="12" class="case"/><rect x="74" y="48" width="6" height="84" class="strap"/><rect x="120" y="48" width="6" height="84" class="strap"/><circle cx="70" cy="134" r="5" class="wheel"/><circle cx="130" cy="134" r="5" class="wheel"/><g class="tag" style="transform-origin:112px 36px"><path class="string" d="M112 36 L120 62"/><rect x="110" y="60" width="22" height="30" rx="4" transform="rotate(-12 121 75)" class="label"/><circle cx="119" cy="66" r="2" class="pinhole"/></g>`
  const css = `.mini-international .tag{animation:mi-swing 3.4s ease-in-out infinite}
@keyframes mi-swing{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(12deg)}}`
  return { s, css }
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
  return { s, css }
}

// Key dates: a desk calendar, its top page flipping over.
minis.KeyDates = () => {
  let grid = ''
  for (let row = 0; row < 3; row++) for (let c = 0; c < 4; c++) grid += `<rect x="${70 + c * 16}" y="${74 + row * 14}" width="11" height="9" rx="2" class="${row === 1 && c === 2 ? 'litc' : 'cell'}"/>`
  const page = (head, g) => `<rect x="60" y="40" width="80" height="90" rx="8" class="sheet"/><rect x="60" y="40" width="80" height="22" rx="8" class="${head}"/><rect x="60" y="54" width="80" height="8" class="${head}"/>${g}`
  const s = `<ellipse class="sh" cx="100" cy="140" rx="46" ry="7"/><g>${page('lit', grid)}</g><g class="flip">${page('pkt', '<rect x="80" y="76" width="40" height="34" rx="6" class="big"/>')}</g><rect x="76" y="32" width="5" height="14" rx="2.5" class="ring"/><rect x="119" y="32" width="5" height="14" rx="2.5" class="ring"/>`
  const css = `.mini-keydates .flip{transform-origin:100px 42px;animation:mk-flip 5s ease-in infinite}
@keyframes mk-flip{0%,50%{transform:scaleY(1);opacity:1}75%{transform:scaleY(-.1);opacity:.3}76%,100%{transform:scaleY(1);opacity:0}}`
  return { s, css }
}

// ---------- write ----------
function write(file, cls, vb, s, css, what, align = 'xMidYMid') {
  const sfc = `<!-- Generated by scripts/art/gen.cjs: ${what}. Decorative. -->
<template>
  <svg class="art ${cls}" viewBox="${vb}" preserveAspectRatio="${align} meet" focusable="false" aria-hidden="true">${s}</svg>
</template>

<style src="./art.css"></style>
<style>
${css}
</style>
`
  fs.writeFileSync(`${OUT}${file}.vue`, sfc)
  console.log(file, Buffer.byteLength(sfc), 'bytes')
}
for (const [name, fn] of Object.entries(heroes)) {
  const { s, css } = fn()
  write(`Art${name}`, `art-${name.toLowerCase()}`, '220 10 500 170', s, css, `the wide hero band of the guide's ${name} page`, 'xMaxYMax')
}
for (const [name, fn] of Object.entries(minis)) {
  const { s, css } = fn()
  write(`Mini${name}`, `mini-${name.toLowerCase()}`, '0 0 200 150', s, css, `the small ${name} illustration (its "On this page" panel and overview card)`)
}
