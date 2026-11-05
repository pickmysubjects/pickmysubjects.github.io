export type Params = Record<string, string | number>
export type Translate = (key: string, params?: Params) => string

/** Fills {name} placeholders. Kept free of Vue so build scripts can use it too. */
export function interpolate(text: string, params: Params = {}): string {
  return text.replace(/\{(\w+)\}(이\(가\)|은\(는\)|을\(를\)|와\(과\)|과\(와\)|\(으\)로|\(이\)라)?/g, (match, name: string, particle?: string) => {
    if (!(name in params)) return match
    const value = String(params[name])
    return particle ? value + koreanParticle(value, particle) : value
  })
}

// Korean particles after a filled-in word: the message writes both forms ("이(가)"), and the word's
// last sound picks one: 이/은/을/과/으로/이라 after a final consonant, 가/는/를/와/로/라 after a vowel.
// Latin letters and digits are read as Koreans say them (COMP10001 ends in 일, SQL in 엘).
const PARTICLES: Record<string, [consonant: string, vowel: string]> = {
  '이(가)': ['이', '가'],
  '은(는)': ['은', '는'],
  '을(를)': ['을', '를'],
  '와(과)': ['과', '와'],
  '과(와)': ['과', '와'],
  '(으)로': ['으로', '로'],
  '(이)라': ['이라', '라'],
}
const DIGIT_FINAL = ['ㅇ', 'ㄹ', '', 'ㅁ', '', '', 'ㄱ', 'ㄹ', 'ㄹ', ''] // 영 일 이 삼 사 오 육 칠 팔 구
const LETTER_FINAL: Record<string, string> = { l: 'ㄹ', m: 'ㅁ', n: 'ㄴ', r: 'ㄹ' } // 엘 엠 엔 알

/** The last sound's final consonant ('' for a vowel), or null when it can't be told. */
function finalConsonant(word: string): string | null {
  const last = word.replace(/[\s)\]}"'”’.,!?…]+$/u, '').at(-1)
  if (!last) return null
  const code = last.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    return jong === 0 ? '' : jong === 8 ? 'ㄹ' : 'x'
  }
  if (/\d/.test(last)) return DIGIT_FINAL[Number(last)]!
  if (/[a-z]/i.test(last)) return LETTER_FINAL[last.toLowerCase()] ?? ''
  return null
}

function koreanParticle(word: string, particle: string): string {
  const forms = PARTICLES[particle]!
  const final = finalConsonant(word)
  if (final === null) return particle
  // 으로 only after a consonant other than ㄹ: 서울로, 집으로.
  if (particle === '(으)로') return final && final !== 'ㄹ' ? forms[0] : forms[1]
  return final ? forms[0] : forms[1]
}

/** Items as one list in the reader's language: "A, B" in English, "A、B" in Chinese and Japanese. */
export function joinList(t: Translate, items: readonly (string | number)[]): string {
  return items.join(t('listSep'))
}

/** An engine list param ("A, B": codes, skills, topics), re-joined for the reader. */
export function localList(t: Translate, list: unknown, each: (x: string) => string = (x) => x): string {
  return joinList(
    t,
    String(list ?? '')
      .split(/,\s*/)
      .filter(Boolean)
      .map(each),
  )
}
