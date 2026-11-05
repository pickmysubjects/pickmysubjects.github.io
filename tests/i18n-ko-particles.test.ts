import { expect, test } from 'vitest'
import { interpolate } from '../src/i18n/interpolate'
test('ko', () => {
  expect(interpolate('{x}이(가) 되려면', { x: '마케팅 전문가' })).toBe('마케팅 전문가가 되려면')
  expect(interpolate('{x}이(가) 되려면', { x: '회계사' })).toBe('회계사가 되려면')
  expect(interpolate('{x}이(가)', { x: '엔지니어' })).toBe('엔지니어가')
  expect(interpolate('{x}이(가)', { x: '변호인' })).toBe('변호인이')
  expect(interpolate('{x}은(는)', { x: 'COMP10001' })).toBe('COMP10001은')
  expect(interpolate('{x}은(는)', { x: 'MAST20004' })).toBe('MAST20004는')
  expect(interpolate('{x}(으)로', { x: '서울' })).toBe('서울로')
  expect(interpolate('{x}(으)로', { x: '집' })).toBe('집으로')
  expect(interpolate('{x}을(를)', { x: 'SQL' })).toBe('SQL을')
  expect(interpolate('{x} and {y}', { x: 1, y: 'b' })).toBe('1 and b')
})
