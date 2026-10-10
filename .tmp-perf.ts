import { buildDataset } from './scripts/dataset'
import { recommend } from './src/engine/recommend'
const { dataset: d } = buildDataset('real')
const p = { results: [{ code: 'COMP10001', mark: 81 }], skills: { programming: 4 }, interests: ['programming'], goal: 'balanced' } as any
for (let i = 0; i < 3; i++) { const t = performance.now(); recommend(d, p, { course: 'B-SCI' }); console.log('recommend', Math.round(performance.now() - t), 'ms') }
const t2 = performance.now(); recommend(d, p, { course: 'B-SCI', programme: { courseYear: 2026, components: ['computing-and-software-systems'] } }); console.log('with programme', Math.round(performance.now() - t2), 'ms')
