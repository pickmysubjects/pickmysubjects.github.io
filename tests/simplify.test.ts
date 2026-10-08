import { describe, expect, it } from 'vitest'
import { simplifyFor } from '../src/engine/expr'
import type { ReqField } from '../src/engine/schema'

describe('simplifyFor', () => {
  const chem: ReqField = {
    any: [
      { any: [{ manual: 'Selection of the Biomedical specialisation in the MC-ENG Master of Engineering' }, { admission: 'MC-BIOMENG', note: '' }] },
      {
        all: [
          { any: [{ subject: 'CHEM10007' }, { manual: 'VCE Units 3/4 Chemistry, or equivalent' }] },
          { any: [{ all: [{ subject: 'MAST10014' }, { subject: 'MAST10015' }] }, { admission: 'B-SCI', note: '' }] },
        ],
      },
    ],
  }

  it('keeps only what a student of this course has to do', () => {
    expect(simplifyFor(chem, 'B-SCI')).toEqual({ any: [{ subject: 'CHEM10007' }, { manual: 'VCE Units 3/4 Chemistry, or equivalent' }] })
  })

  it('says nothing is needed when admission alone meets it', () => {
    expect(simplifyFor({ any: [{ all: [{ subject: 'MAST10014' }, { subject: 'MAST10015' }] }, { admission: 'B-SCI', note: '' }] }, 'B-SCI')).toBe('none')
  })

  it('leaves the requirement alone when nothing in it is open to this course', () => {
    const only: ReqField = { admission: 'B-BMED', note: '' }
    expect(simplifyFor(only, 'B-SCI')).toEqual(only)
  })

  it('keeps everything when no course is given', () => {
    expect(simplifyFor(chem, '')).toEqual(chem)
  })
})
