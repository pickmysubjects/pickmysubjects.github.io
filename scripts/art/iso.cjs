// Isometric helpers for the guide illustrations. x: right-down, y: left-down, z: up.
const C = Math.cos(Math.PI / 6), S = 0.5
let OX = 200, OY = 150
const r = (n) => Math.round(n * 10) / 10
function origin(x, y) { OX = x; OY = y }
function P(x, y, z = 0) { return [r(OX + (x - y) * C), r(OY + (x + y) * S - z)] }
const pts = (a) => a.map((p) => p.join(',')).join(' ')
const poly = (a, cls, extra = '') => `<polygon class="${cls}" points="${pts(a)}"${extra}/>`
/** A box: top, front-left (y+d) and front-right (x+w) faces. cls: [top, left, right]. */
function box(x, y, z, w, d, h, cls = ['t', 'l', 'r'], extra = '') {
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]
  const left = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)]
  const right = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)]
  return `<g${extra}>${poly(left, cls[1])}${poly(right, cls[2])}${poly(top, cls[0])}</g>`
}
/** A flat quad on the top plane at height z. */
function flat(x, y, z, w, d, cls, extra = '') {
  return poly([P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], cls, extra)
}
/** A panel standing on the x axis (facing +y, like a left face) — for screens and boards. */
function wallY(x, y, z, w, h, cls, extra = '') {
  return poly([P(x, y, z), P(x + w, y, z), P(x + w, y, z + h), P(x, y, z + h)], cls, extra)
}
/** A panel standing on the y axis (facing +x, like a right face). */
function wallX(x, y, z, d, h, cls, extra = '') {
  return poly([P(x, y, z), P(x, y + d, z), P(x, y + d, z + h), P(x, y, z + h)], cls, extra)
}
/** Ground slab with a soft shadow. */
function ground(x, y, w, d, h = 10) {
  const [cx, cy] = P(x + w / 2, y + d / 2, -h)
  return `<ellipse class="sh" cx="${cx}" cy="${r(cy + 12)}" rx="${r((w + d) * C * 0.56)}" ry="${r((w + d) * S * 0.42)}"/>` + box(x, y, -h, w, d, h, ['g', 'gl', 'gr'])
}
/** A small person at ground point (x,y): body colour b, hair h. Returns a <g> with its own transform origin. */
function person(x, y, b, hair, cls = '', style = '') {
  const [px, py] = P(x, y, 0)
  return `<g class="pp ${cls}" style="${style}"><g transform="translate(${px} ${py})"><ellipse class="sh2" cx="0" cy="0" rx="6" ry="2.6"/><rect x="-3" y="-9" width="2.4" height="9" rx="1.2" class="leg"/><rect x="0.6" y="-9" width="2.4" height="9" rx="1.2" class="leg"/><rect x="-5" y="-21" width="10" height="13" rx="4.5" fill="${b}"/><circle cx="0" cy="-25.5" r="4.6" class="skin"/><path d="M-4.7 -26 a4.7 4.7 0 0 1 9.4 0 q-4.7 -2.6 -9.4 0z" fill="${hair}"/></g></g>`
}
module.exports = { origin, P, poly, box, flat, wallY, wallX, ground, person, pts, r }
