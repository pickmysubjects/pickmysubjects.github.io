import { describe, expect, it } from 'vitest'
import { similarSubjects } from '../src/engine/similar'
import { dataset, subject } from './helpers'

describe('similar subjects', () => {
  const t = ['programming', 'algorithms']
  const data = dataset([
    subject({ code: 'COMP10001', topics: t, non_allowed: ['COMP10002'] }),
    subject({ code: 'COMP10002', topics: t }),
    subject({ code: 'COMP10003', topics: t, non_allowed: ['COMP10001'] }),
    subject({ code: 'COMP10004', topics: t }),
    subject({ code: 'INFO10001', topics: ['programming'] }),
    subject({ code: 'COMP20001', topics: t, level: 2 }),
  ])
  const self = data.subjects.COMP10001!

  it('leaves out subjects that cannot be taken together with it, listed on either side', () => {
    expect(similarSubjects(self, data.subjects, 2026)).toEqual(['COMP10004', 'INFO10001'])
  })

  it('leaves out subjects already done', () => {
    expect(similarSubjects(self, data.subjects, 2026, new Set(['COMP10004']))).toEqual(['INFO10001'])
  })
})
