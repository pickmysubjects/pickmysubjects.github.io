// The drawn extent of a generated scene: a rough bounding box of its shapes (polygons, rects,
// circles, ellipses, lines, text, path start points; absolute curves by all their points), with
// each <g transform="translate(..) scale(..)"> applied (rotations are small and ignored). Used by
// gen.cjs to fit each viewBox to its scene, and by tests/guideArt.test.ts to check nothing is drawn
// outside it.
const num = (s) => (s || '').match(/-?\d*\.?\d+(?:e-?\d+)?/gi)?.map(Number) ?? []
const attr = (a, n) => { const m = new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(a); return m ? m[1] : null }

function bounds(svg) {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  const stack = [{ tx: 0, ty: 0, s: 1 }]
  const add = (x, y) => {
    const t = stack[stack.length - 1]
    if (t.skip) return
    const X = x * t.s + t.tx, Y = y * t.s + t.ty
    box.x0 = Math.min(box.x0, X); box.y0 = Math.min(box.y0, Y); box.x1 = Math.max(box.x1, X); box.y1 = Math.max(box.y1, Y)
  }
  const re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g
  let m
  while ((m = re.exec(svg))) {
    const [, close, tag, a, self] = m
    if (tag === 'g') {
      if (close) { stack.pop(); continue }
      const t = stack[stack.length - 1]
      const tr = attr(a, 'transform') || ''
      const tl = /translate\(([^)]*)\)/.exec(tr), sc = /scale\(([^)]*)\)/.exec(tr)
      const [dx = 0, dy = 0] = tl ? num(tl[1]) : []
      const k = sc ? num(sc[1])[0] : 1
      // A group placed along a motion path (offset-path) is drawn on its route, which is counted.
      const skip = t.skip || /offset-path/.test(attr(a, 'style') || '')
      if (!self) stack.push({ tx: t.tx + dx * t.s, ty: t.ty + dy * t.s, s: t.s * k, skip })
      continue
    }
    if (close) continue
    const n = (k) => Number(attr(a, k) ?? 0)
    if (tag === 'polygon') { const p = num(attr(a, 'points')); for (let i = 0; i < p.length; i += 2) add(p[i], p[i + 1]) }
    else if (tag === 'rect') { add(n('x'), n('y')); add(n('x') + n('width'), n('y') + n('height')) }
    else if (tag === 'circle') { add(n('cx') - n('r'), n('cy') - n('r')); add(n('cx') + n('r'), n('cy') + n('r')) }
    else if (tag === 'ellipse') { add(n('cx') - n('rx'), n('cy') - n('ry')); add(n('cx') + n('rx'), n('cy') + n('ry')) }
    else if (tag === 'line') { add(n('x1'), n('y1')); add(n('x2'), n('y2')) }
    else if (tag === 'text') { add(n('x') - 4, n('y') - 11); add(n('x') + 4, n('y') + 2) }
    else if (tag === 'path') {
      const d = attr(a, 'd') || ''
      const p = num(d)
      if (/^[MLCSQTHVZ\s\d.,-]+$/.test(d)) for (let i = 0; i + 1 < p.length; i += 2) add(p[i], p[i + 1])
      else if (p.length >= 2) add(p[0], p[1])
    }
  }
  return box
}
module.exports = { bounds }
