import { forCourse } from './forCourse'
import { offeredIn, periodsFor } from './availability'
import { evaluateField, referencedSubjects, type Tri } from './expr'
import type { Note, Params } from './plan'
import type { Dataset, Period, Skill, Subject } from './schema'
import { predictMark } from './predict'
import { skillsOf } from './skills'
import { termStress } from './termStress'
import { planRoles } from './roles'
import { areaField, homeTopics, relatedTopics, topicsOf } from './topics'


/** 'easy': marks only, whatever the subject is about (the "easiest H1" list). */
export type Goal = 'wam' | 'balanced' | 'challenge' | 'easy'

export interface Profile {
  /**
   * Completed subjects; marks are optional (0–100), and so is when it was taken (shown in its
   * semester on the plan board; nothing is worked out from it).
   */
  results: { code: string; mark?: number; year?: number; period?: Period }[]
  /** Self-rated skill levels, 1 (weak) – 5 (strong). Missing = not rated. */
  skills: Partial<Record<Skill, number>>
  /** Topic tags the student is interested in, e.g. "machine-learning". */
  interests: string[]
  goal: Goal
  /** Subjects whose uncheckable prerequisites (e.g. a VCE score) the student says they meet. */
  confirmed?: string[]
  /** The student's own ratings of subjects they took (kept in their browser), used to personalise. */
  ratings?: Record<string, OwnRating>
  /** Hours a week of paid work or other fixed commitments during semester (bucket middle), if given. */
  workHours?: number
}

/** How the student themselves found a subject: difficulty and interest 1–5, would they recommend it. */
export interface OwnRating {
  difficulty?: number
  interest?: number
  recommend?: 'Yes' | 'Maybe' | 'No'
}

export interface Recommendation {
  code: string
  title: string
  /** 0–100. Only meaningful alongside `reasons`. */
  score: number
  /**
   * Share (0–100) of the other options in this list that score lower: what students read a fit
   * number as. The raw score centres on 50, so a good match there looked like a poor mark.
   */
  betterThan: number
  confidence: 'low' | 'medium' | 'high'
  eligibility: Tri
  reasons: Note[]
  warnings: Note[]
}

export interface RecommendOptions {
  /** Subjects already in the plan (not yet completed). */
  planned?: string[]
  /** Restrict to subjects offered in this term. */
  term?: { year: number; period: Period }
  course?: string
  /** Only recommend subjects in this category for `course` (e.g. "breadth"). */
  category?: string
  /** Only recommend subjects at this level. */
  level?: number
  /**
   * Subjects that count as done for prerequisite checks. Defaults to completed + planned;
   * the generator narrows it to subjects in *earlier* terms.
   */
  eligibleWith?: string[]
  limit?: number
  /** "Now", for skipping subjects that aren't running soon. Defaults to this year. */
  year?: number
  /** Only subjects up to this level (e.g. year-1 students see level 1). */
  maxLevel?: number
  /**
   * What's already planned in the chosen term: a subject that would make it heavy says so and
   * gives up a few points, as the plan builder does, so a close alternative ranks above it.
   */
  termSubjects?: string[]
  /** The student's major and specialisation (component ids): their subjects get a nudge and say so. */
  programme?: { courseYear: number; components: string[] }
}

/** Points a suggestion gives up for making its semester heavier (the plan builder uses the same). */
export const HEAVY_PICK_COST = 6
/** Enough to put the major's own subjects and the way into them above unrelated ones of similar fit; no more than a real mismatch costs. */
export const PROGRAMME_BONUS = 12
/** Subjects done before the student's own choices start to count, and how much they move a score. */
const PAST_CHOICES_MIN = 4
const PAST_CHOICE_NUDGE = 4
/** How far a subject two levels below the student's year drops (one level below: half). */
export const BEHIND_LEVEL_COST = 8
/** A subject that uses a skill rated 1 (2 counts half), with none of the student's interests. */
export const OFF_TOPIC_STRUGGLE_COST = 12
/** In challenge mode, a subject that touches none of the student's interests. */
export const OFF_TOPIC_CHALLENGE_COST = 10
const STRESS_RANK = { ok: 0, heavy: 1, veryHeavy: 2 } as const

/** What each goal is mostly about; unknown, these count as neutral instead of being left out. */
const CORE: Record<Goal, Signal[]> = { wam: ['ease', 'predicted'], balanced: [], challenge: ['opens'], easy: ['ease', 'predicted'] }

/**
 * What each goal weighs. "Protect my WAM": easy to do well in, above all. "Challenge": hard to
 * score in but useful later (many subjects build on it), and what interests you.
 */
const WEIGHTS: Record<Goal, Record<Signal, number>> = {
  // A high WAM: easy marking and the student's own likely mark count about the same.
  wam: { ease: 0.4, predicted: 0.4, skillFit: 0.05, interest: 0.1, unlocks: 0, opens: 0.05, hardness: 0 },
  balanced: { ease: 0.2, predicted: 0.2, skillFit: 0.2, interest: 0.3, unlocks: 0.1, opens: 0, hardness: 0 },
  challenge: { ease: 0, predicted: 0.05, skillFit: 0.1, interest: 0.3, unlocks: 0.15, opens: 0.15, hardness: 0.25 },
  easy: { ease: 0.6, predicted: 0.4, skillFit: 0, interest: 0, unlocks: 0, opens: 0, hardness: 0 },
}

type Signal = 'ease' | 'predicted' | 'skillFit' | 'interest' | 'unlocks' | 'opens' | 'hardness'
/** Subjects that list one as a prerequisite before it counts as fully "useful later". */
const OPENS_FULL = 4
const MIN_REVIEWS = 3
/** How much of a score's distance from neutral is kept when only part of the evidence is known (the rest scales with coverage). */
const SURE_BASE = 0.3
// Points off for an unconfirmed condition when protecting a WAM (about one band of ease).
const UNCONFIRMED_RISK = 3
/** Interest scores: two tagged matches, one, an area-implied match, a related topic. */
const INTEREST_FULL = 1
const INTEREST_ONE = 0.8
/** One shared topic among several others, outside the subject's own discipline: it touches on it. */
const INTEREST_SIDE = 0.7
/** How many tagged topics make a subject broad enough that one outside its discipline is a side topic. */
const SIDE_TOPICS = 3
const INTEREST_NAMED = 0.75
const INTEREST_INFERRED = 0.6
const INTEREST_RELATED = 0.55
/** No match: nothing known about it, a broad area-implied mismatch, a tagged mismatch. */
const INTEREST_UNKNOWN = 0.3
const INTEREST_INFERRED_MISS = 0.2
/** Ratings are averaged with the site-wide average as if it were this many extra reviews. */
const RATING_PRIOR_REVIEWS = 5
const MIN_RATED_FOR_PRIOR = 10
/** Re-ranking only swaps near-ties: subjects within this many points of each other. */
const TIE_POINTS = 3
/** A subject that doesn't run in this many years from now isn't worth suggesting. */
const RUN_HORIZON_YEARS = 2
/** Interest score for a subject that isn't on a topic you like but leads to one that is, less per extra step. */
const PATHWAY_INTEREST = 0.65
const PATHWAY_STEP = 0.08
const PATHWAY_MAX_STEPS = 3

export const PASS_MARK = 50

/**
 * Subjects that count as done: passed, or completed without a mark entered.
 * A failed subject (mark below 50) can be planned again.
 */
export function passedCodes(results: Profile['results']): string[] {
  return results.filter((r) => r.mark === undefined || r.mark >= PASS_MARK).map((r) => r.code)
}

/** Credit-point weighted average of marked results, fails included (UniMelb WAM is points-weighted). */
export function computeWam(results: Profile['results'], data: Dataset): number | null {
  let weighted = 0
  let points = 0
  for (const r of results) {
    // A pass/fail subject has no mark to count (the University leaves it out of the WAM).
    if (r.mark === undefined || data.subjects[r.code]?.passFail) continue
    const pts = data.subjects[r.code]?.points ?? 12.5
    weighted += r.mark * pts
    points += pts
  }
  return points > 0 ? Math.round((weighted / points) * 10) / 10 : null
}

export function recommend(raw: Dataset, given: Profile, opts: RecommendOptions = {}): Recommendation[] {
  // Marks only: what a subject is about doesn't come into it, not even to break a tie.
  const asked = given.goal === 'easy' ? { ...given, interests: [] } : given
  // The student's own ratings of subjects they took fill in what they didn't say outright.
  const { profile, liked } = personalise(asked, raw)
  const data = opts.course ? forCourse(raw, opts.course) : raw
  const completed = new Set(passedCodes(profile.results))
  const taken = new Set([...completed, ...(opts.planned ?? [])])
  const wam = computeWam(profile.results, data)
  // Taken twice (a fail, then a pass): the better mark says how they now go in it.
  const marks = new Map<string, number>()
  for (const r of profile.results) if (r.mark !== undefined && !raw.subjects[r.code]?.passFail) marks.set(r.code, Math.max(r.mark, marks.get(r.code) ?? -1))
  const dependents = buildDependents(data, opts.course)
  // Non-allowed works both ways, but the Handbook often lists it on one side only.
  const blocked = new Set(
    [...taken].flatMap((c) => {
      const t = data.subjects[c]
      return t && t.nonAllowed !== 'unknown' ? t.nonAllowed : []
    }),
  )

  const roles =
    opts.course && opts.programme?.components.length
      ? planRoles(data, opts.course, opts.programme.courseYear, opts.programme.components)
      : null
  // Earlier subjects the major's own subjects build on (a step or two back): the way into them,
  // even where there are several to choose from (PSYC20006 for a psychology major).
  const towardMajor = new Map<string, string[]>()
  // Fields of what the student has actually completed (not what a plan has pencilled in), and
  // of what they took as breadth.
  const takenFields = new Set([...completed].map((c) => data.subjects[c]).filter((x): x is Subject => !!x).map((x) => areaField(x.area)))
  const breadthFields = new Set(
    [...completed].map((c) => data.subjects[c]).filter((x): x is Subject => !!x && x.categories[opts.course ?? ''] === 'breadth').map((x) => areaField(x.area)),
  )
  if (roles) {
    let frontier = [...roles.required, ...roles.options].filter((c) => !completed.has(c))
    for (let step = 0; step < 2; step++) {
      const next: string[] = []
      for (const target of frontier) {
        const t = data.subjects[target]
        if (!t) continue
        for (const p of [...referencedSubjects(t.prerequisites), ...referencedSubjects(t.corequisites)]) {
          if (completed.has(p) || roles.required.has(p) || roles.options.has(p)) continue
          const leadsTo = towardMajor.get(p) ?? []
          if (!leadsTo.includes(target)) towardMajor.set(p, [...leadsTo, target])
          next.push(p)
        }
      }
      frontier = next
    }
  }

  // Prerequisites of subjects already passed: going back to them adds nothing
  // (e.g. COMP10001 after COMP10002). Not when the major still needs it, nor when it was only
  // another way in that leads back here (PHYC10001 and PHYC10002 each accept the other).
  const behind = new Set(
    [...completed].flatMap((c) => {
      const d = data.subjects[c]
      if (!d) return []
      return referencedSubjects(d.prerequisites).filter((p) => {
        if (roles?.required.has(p)) return false
        const back = data.subjects[p]
        return !back || !referencedSubjects(back.prerequisites).includes(c)
      })
    }),
  )

  const creditCourses = new Set(Object.values(data.subjects).flatMap((x) => Object.keys(x.categories)))
  const ratingMean = siteRatingMean(data)

  const termBefore = opts.termSubjects ? termStress(opts.termSubjects, data, profile).level : null
  const recs: Recommendation[] = []
  for (const s of Object.values(data.subjects)) {
    if (taken.has(s.code) || behind.has(s.code)) continue
    if (blocked.has(s.code)) continue
    // Taught only at a far campus (Dookie): only when the student's own major leads there.
    if (s.campus && !(roles && (roles.required.has(s.code) || roles.options.has(s.code) || towardMajor.has(s.code)))) continue
    if (s.nonAllowed !== 'unknown' && s.nonAllowed.some((c) => taken.has(c))) continue
    if (opts.course && opts.category && s.categories[opts.course] !== opts.category) continue
    if (opts.level !== undefined && s.level !== opts.level) continue
    if (opts.maxLevel !== undefined && s.level > opts.maxLevel) continue
    if (opts.term && offeredIn(s, opts.term.year, opts.term.period).status === 'fail') continue
    // Without a chosen term: skip subjects we know aren't running soon.
    if (!opts.term && !runsSoon(s, opts.year ?? new Date().getFullYear())) continue
    // In a course where other subjects are categorised, an uncategorised one doesn't count for credit.
    if (opts.course && creditCourses.has(opts.course) && !s.categories[opts.course]) continue

    const eligibleWith = opts.eligibleWith ? new Set(opts.eligibleWith) : taken
    const pre = evaluateField(s.prerequisites, {
      completed: eligibleWith,
      subjects: data.subjects,
      admittedCourse: opts.course,
    })
    if (pre.status === 'fail') continue
    // A condition only the student can check (a VCE score) that they said they meet.
    const eligibility = pre.status === 'unknown' && profile.confirmed?.includes(s.code) ? 'ok' : pre.status

    const rec = score(s, { profile, data, wam, marks, dependents, eligibility, unmet: pre.unmet, ratingMean, taken, blocked, liked })
    // A fail on My page: this would be a retake, which the student should know before adding it.
    const failed = marks.get(s.code)
    if (failed !== undefined && failed < PASS_MARK) rec.warnings.unshift(note('retake', { mark: failed }, `You got ${failed} last time: this would be a retake.`))
    // A third-year student rarely gains from a first-year science subject (the degree wants
    // level-3 points), and a level below their year is a smaller step back; breadth is
    // different, since level-1 breadth is the usual way in.
    const behindBy = opts.maxLevel === undefined ? 0 : opts.maxLevel - s.level
    if (behindBy > 0 && opts.course && s.categories[opts.course] !== 'breadth') {
      rec.score = Math.max(0, rec.score - (behindBy >= 2 ? BEHIND_LEVEL_COST : BEHIND_LEVEL_COST / 2))
    }
    // Leaning on a skill the student finds hard, in a topic they didn't ask for: even
    // "challenge yourself" means a hard subject in something you care about, not this.
    if (!rec.reasons.some((x) => x.key === 'interests')) {
      if (rec.warnings.some((x) => x.key === 'struggleSkills')) rec.score = Math.max(0, rec.score - OFF_TOPIC_STRUGGLE_COST)
      else if (rec.warnings.some((x) => x.key === 'weakSkills')) rec.score = Math.max(0, rec.score - OFF_TOPIC_STRUGGLE_COST / 2)
    }
    // "Challenge yourself" is a hard subject that's useful to *you*: once interests are given,
    // one unrelated to all of them drops below the ones in the student's own direction.
    // For an easy WAM too, among subjects that are all manageable, ones in the student's own
    // direction or on a strength of theirs come first: half the challenge drop, nothing for a match.
    if (profile.goal === 'wam' && profile.interests.length) {
      const exact = topicsOf(s).topics.some((t) => profile.interests.includes(t))
      const strength = rec.reasons.some((x) => x.key === 'strengths' || x.key === 'goodAt')
      if (!exact && !strength) rec.score = Math.max(0, rec.score - OFF_TOPIC_CHALLENGE_COST / 2)
    }
    if (profile.goal === 'challenge' && profile.interests.length) {
      const topics = topicsOf(s).topics
      const exact = topics.some((t) => profile.interests.includes(t))
      // Not in their interests but built on a strength of theirs: half the drop.
      const strength = rec.reasons.some((x) => x.key === 'strengths' || x.key === 'goodAt')
      if (!exact) rec.score = Math.max(0, rec.score - (strength ? OFF_TOPIC_CHALLENGE_COST / 2 : OFF_TOPIC_CHALLENGE_COST))
    }
    // What the student has actually chosen says what they like: more from a field they keep
    // taking as breadth, less from a field they've never touched when only a skill links it.
    if (completed.size >= PAST_CHOICES_MIN && profile.goal !== 'easy') {
      const field = areaField(s.area)
      const fromInterest = rec.reasons.some((x) => x.key === 'interests')
      const inProgramme = roles !== null && (roles.required.has(s.code) || roles.options.has(s.code) || towardMajor.has(s.code))
      if (breadthFields.has(field) && s.categories[opts.course ?? ''] === 'breadth') rec.score = Math.min(100, rec.score + PAST_CHOICE_NUDGE)
      else if (!fromInterest && !inProgramme && !takenFields.has(field)) rec.score = Math.max(0, rec.score - PAST_CHOICE_NUDGE)
    }
    // Protecting a WAM (or after marks only): an elective in an area where the student's own marks
    // run low goes further down. One the major needs stays; it's flagged, not avoided.
    if ((profile.goal === 'wam' || profile.goal === 'easy') && rec.warnings.some((x) => x.key === 'averagedLow')) {
      const needed = roles !== null && (roles.required.has(s.code) || roles.options.has(s.code) || towardMajor.has(s.code))
      if (!needed) rec.score = Math.max(0, rec.score - OFF_TOPIC_STRUGGLE_COST / 2)
    }
    // A condition only the student can check (a VCE score) and haven't said they meet: for a WAM
    // that's a risk, so it sits a little lower than an otherwise equal subject open to them.
    if ((profile.goal === 'wam' || profile.goal === 'easy') && rec.warnings.some((x) => x.key === 'eligibilityUnknown')) {
      rec.score = Math.max(0, rec.score - UNCONFIRMED_RISK)
    }
    // Marks only: the major's subjects are still labelled, but not pushed up.
    const bonus = profile.goal === 'easy' ? 0 : PROGRAMME_BONUS
    if (roles && (roles.required.has(s.code) || roles.options.has(s.code))) {
      const core = roles.required.has(s.code)
      rec.score = Math.min(100, rec.score + bonus)
      rec.reasons.unshift(note(core ? 'majorCore' : 'majorOption', {}, core ? 'Compulsory in your major.' : 'One of the choices in your major.'))
    } else if (towardMajor.has(s.code)) {
      const codes = (towardMajor.get(s.code) as string[]).slice(0, 3).join(', ')
      rec.score = Math.min(100, rec.score + bonus)
      rec.reasons.unshift(note('majorPath', { codes }, `Leads to ${codes} in your major.`))
    }
    if (opts.termSubjects && termBefore) {
      const after = termStress([...opts.termSubjects, s.code], data, profile).level
      if (STRESS_RANK[after] > STRESS_RANK[termBefore]) {
        rec.score = Math.max(0, rec.score - HEAVY_PICK_COST)
        rec.warnings.push(note(after === 'veryHeavy' ? 'makesVeryHeavy' : 'makesHeavy', {}, 'Adding it makes that semester heavier.'))
      }
    }
    recs.push(rec)
  }

  // Equal scores (common when a student has told us little): the subject more of the degree
  // builds on comes first, a better first step than whichever code sorts first.
  const builtOn = (r: Recommendation) => usefulLater(r.code, dependents, data, profile.interests)
  recs.sort((a, b) => b.score - a.score || builtOn(b) - builtOn(a) || a.code.localeCompare(b.code))
  const ranked = diversify(recs, data)
  const others = Math.max(1, recs.length - 1)
  for (const r of ranked) r.betterThan = Math.round((100 * recs.filter((x) => x.score < r.score).length) / others)
  return opts.limit ? ranked.slice(0, opts.limit) : ranked
}

interface ScoreCtx {
  profile: Profile
  data: Dataset
  wam: number | null
  marks: Map<string, number>
  dependents: Map<string, string[]>
  eligibility: Tri
  unmet: string[]
  /** Site-wide average ease, the prior that a subject's own ratings are shrunk toward. */
  ratingMean: number
  /** Passed or planned: not worth pointing to as "opens up". */
  taken: Set<string>
  /** Topics of subjects the student rated as worth it or interesting: softer than chosen interests. */
  liked: Map<string, string>
  /** Can't be taken alongside something passed or planned: not worth pointing to either. */
  blocked: Set<string>
}

function note(key: string, params: Params, text: string): Note {
  return { key, params, text }
}

function score(s: Subject, ctx: ScoreCtx): Recommendation {
  const reasons: Note[] = []
  const warnings: Note[] = []
  const parts: Partial<Record<Signal, number>> = {}

  // Skill fit: how well the student's self-rated skills cover what the subject uses (its tags,
  // or what we infer from its area, title and prerequisites). Each of the five steps reads
  // differently: 5 a strength, 4 good at, 3 neutral, 2 weaker, 1 a struggle. The weakest one
  // counts extra: being good at writing doesn't make up for struggling with the maths.
  const rated = skillsOf(s, ctx.data).filter((k) => ctx.profile.skills[k] !== undefined)
  if (rated.length > 0) {
    const level = (k: Skill) => ctx.profile.skills[k] as number
    const fits = rated.map((k) => (level(k) - 1) / 4)
    parts.skillFit = 0.6 * avg(fits) + 0.4 * Math.min(...fits)
    const at = (n: number) => rated.filter((k) => level(k) === n)
    const list = (ks: Skill[]) => ks.join(', ')
    if (at(5).length) reasons.push(note('strengths', { skills: list(at(5)) }, `Uses your strengths: ${list(at(5))}.`))
    if (at(4).length) reasons.push(note('goodAt', { skills: list(at(4)) }, `Uses what you're good at: ${list(at(4))}.`))
    if (at(2).length) warnings.push(note('weakSkills', { skills: list(at(2)) }, `Leans on ${list(at(2))}, which you rated as weaker.`))
    if (at(1).length) warnings.push(note('struggleSkills', { skills: list(at(1)) }, `Leans heavily on ${list(at(1))}, which you find hard.`))
  }


  // Interest: overlap between the subject's topics and the student's interests.
  // A subject that leads to an interesting one counts too, a bit less (the
  // first-year subject on the way to Machine Learning); a subject with no
  // curated topics stays neutral rather than looking like a mismatch.
  const interests = ctx.profile.interests
  const path = interests.length ? pathTo(s.code, interests, ctx) : { steps: 0, codes: [] }
  const leadsTo = path.codes
  // Something like a subject they rated well, when none of their chosen interests match.
  const likedHit = topicsOf(s).topics.map((t) => ctx.liked.get(t)).find((c): c is string => c !== undefined && c !== s.code)
  if (interests.length === 0 && likedHit) {
    parts.interest = INTEREST_RELATED
    reasons.push(note('likedBefore', { codes: likedHit }, `Close to ${likedHit}, which you rated well.`))
  }
  if (interests.length > 0) {
    const { topics, inferred, specific } = topicsOf(s)
    const hit = topics.filter((t) => interests.includes(t))
    const near = topics.some((t) => interests.some((i) => relatedTopics(t, i)))
    // One shared interest is already a strong signal; a second makes it a full match. One of
    // several topics, outside the subject's own discipline (health geography, for a psychology
    // student), counts a little less than a subject from the discipline itself.
    // A topic only implied by the area code ("a biology subject") counts for less, and
    // a related topic (AI when you picked machine learning) for less again.
    // Hand-tagged counts most; a topic its title or summary names, nearly as much; one only
    // its area code implies, least.
    const direct =
      hit.length === 0
        ? 0
        : !inferred
          ? hit.length >= 2
            ? INTEREST_FULL
            : topics.length >= SIDE_TOPICS && !homeTopics(s).includes(hit[0] as string)
              ? INTEREST_SIDE
              : INTEREST_ONE
          : hit.some((t) => specific.includes(t))
            ? INTEREST_NAMED
            : INTEREST_INFERRED
    const viaPath = path.steps ? PATHWAY_INTEREST - PATHWAY_STEP * (path.steps - 1) : 0
    const related = near ? INTEREST_RELATED : 0
    const fromLiked = likedHit ? INTEREST_RELATED : 0
    const best = Math.max(direct, viaPath, related, fromLiked)
    if (best > 0) {
      parts.interest = best
      if (likedHit && best === fromLiked && direct === 0) reasons.push(note('likedBefore', { codes: likedHit }, `Close to ${likedHit}, which you rated well.`))
    }
    // The area code is a coarse guess, so a mismatch there counts for less than a tagged one.
    else if (topics.length) parts.interest = inferred ? INTEREST_INFERRED_MISS : 0
    // Nothing known about what it covers: a little under neutral, so it can't tie with a real match.
    else parts.interest = INTEREST_UNKNOWN
    if (hit.length) reasons.push(note('interests', { topics: hit.join(', ') }, `Covers ${hit.join(', ')}, which you're interested in.`))
  }

  // Background the Handbook recommends (not required): a heads-up when none of it is done yet.
  if (s.recommended.length && !s.recommended.some((c) => ctx.taken.has(c))) {
    const codes = s.recommended.slice(0, 3).join(', ')
    warnings.push(note('recommendedFirst', { codes }, `The Handbook recommends ${codes} first (not required).`))
  }

  // Predicted performance from the student's own marks in similar subjects (see predict.ts),
  // else their overall WAM. Always said as a range once there are marks to go on.
  const guess = ctx.marks.size ? predictMark(s, ctx.marks, ctx.data) : null
  if (guess) {
    const m = guess.mark
    parts.predicted = clamp((m - 50) / 50)
    const params = { mark: Math.round(m), low: Math.round(guess.low), high: Math.round(guess.high), codes: guess.basis.join(', ') }
    const wam = ctx.wam ?? m
    if (m >= 75 || m >= wam + 3) reasons.push(note('averagedHigh', params, `Your marks in similar subjects (${params.codes}) point to about ${params.mark}.`))
    else if (m < 55 || m <= wam - 5) warnings.push(note('averagedLow', params, `Your marks in similar subjects (${params.codes}) point to about ${params.mark}, so this may be tough.`))
    else reasons.push(note('predictedRange', params, `Likely ${params.low}–${params.high}, from your marks in similar subjects.`))
  } else if (ctx.wam !== null) {
    parts.predicted = clamp((ctx.wam - 50) / 50)
  }

  // Ease from crowd signals, shrunk toward neutral when there are few reviews.
  if (s.signals) {
    // Ease from whichever of the three averages we have (each on 0–4).
    const easeParts = [
      s.signals.difficulty === undefined ? undefined : 5 - s.signals.difficulty,
      s.signals.workload === undefined ? undefined : 5 - s.signals.workload,
      s.signals.grading === undefined ? undefined : s.signals.grading - 1,
    ].filter((x): x is number => x !== undefined)
    // Bayesian average: few reviews stay close to the site-wide average.
    if (easeParts.length) {
      const raw = easeParts.reduce((a, b) => a + b, 0) / (4 * easeParts.length)
      const n = s.signals.reviews
      parts.ease = (raw * n + ctx.ratingMean * RATING_PRIOR_REVIEWS) / (n + RATING_PRIOR_REVIEWS)
    }
    const n = `${s.signals.reviews} review${s.signals.reviews === 1 ? '' : 's'}`
    const { difficulty, workload, grading, reviews } = s.signals
    if (reviews < MIN_REVIEWS) warnings.push(note('fewReviews', { n: reviews }, `Only ${n} so far — difficulty data is thin.`))
    else {
      if (difficulty !== undefined && difficulty >= 4) warnings.push(note('hard', { score: difficulty, n: reviews }, `Students rate it hard (${difficulty}/5, ${n}).`))
      if (workload !== undefined && workload >= 4) warnings.push(note('heavy', { score: workload, n: reviews }, `Heavy workload (${workload}/5, ${n}).`))
      if (grading !== undefined && grading >= 4) reasons.push(note('generous', { score: grading, n: reviews }, `Students say marking is generous (${grading}/5, ${n}).`))
      if (difficulty !== undefined && difficulty <= 2) reasons.push(note('approachable', { score: difficulty, n: reviews }, `Students rate it approachable (${difficulty}/5, ${n}).`))
    }
  }

  // No ratings of our own yet: what the public review summary says stands in, a little
  // either side of neutral, until students rate it here.
  if (!s.signals || s.signals.reviews < MIN_REVIEWS) {
    const d = s.discussion
    if (d?.difficulty === 'hard') warnings.push(note('reviewsHard', {}, 'Public reviews say it is hard.'))
    if (d?.workload === 'heavy') warnings.push(note('reviewsHeavy', {}, 'Public reviews say it takes a lot of time.'))
    if (d?.difficulty === 'easy') reasons.push(note('reviewsEasy', {}, 'Public reviews say it is manageable.'))
    // Worth about as much as a handful of ratings: close to neutral, so it nudges rather than
    // reorders. A heavy workload is shown as a warning and counts in the semester check, but
    // costs time, not marks, so it doesn't count against ease here.
    if (parts.ease === undefined && (d?.difficulty === 'hard' || d?.difficulty === 'easy')) parts.ease = d.difficulty === 'hard' ? 0.42 : 0.58
  }

  // Nothing rated or reviewed: a small estimate from the Handbook facts, so "protect my WAM"
  // still tells subjects apart. Exam-heavy subjects are felt as harder, and an exam hurdle
  // adds risk; first-year subjects are gentler than third-year ones.
  // Only from facts we have: a subject with nothing curated stays unknown.
  if (parts.ease === undefined && s.assessment) parts.ease = structuralEase(s)
  // Real grades beat impressions: once enough students shared their bands, how far they did above
  // or below their own WAM here counts for half of ease (±10 marks spans the whole scale).
  if (s.gradeOffset) {
    const fromGrades = clamp(0.5 + s.gradeOffset.offset / 20)
    parts.ease = parts.ease === undefined ? fromGrades : (parts.ease + fromGrades) / 2
    const params = { n: s.gradeOffset.n, by: Math.abs(Math.round(s.gradeOffset.offset)) }
    if (s.gradeOffset.offset >= 3) reasons.push(note('gradesAbove', params, `${params.n} students who shared their grades did about ${params.by} marks better here than their WAM.`))
    else if (s.gradeOffset.offset <= -3) warnings.push(note('gradesBelow', params, `${params.n} students who shared their grades did about ${params.by} marks worse here than their WAM.`))
  }
  if (parts.ease !== undefined) parts.hardness = 1 - parts.ease

  // Useful later: how many subjects build on it (and students' usefulness rating, once rated).
  const builtOn = usefulLater(s.code, ctx.dependents, ctx.data, interests)
  const ratedUseful = s.signals && s.signals.reviews >= MIN_REVIEWS && s.signals.usefulness !== undefined ? (s.signals.usefulness - 1) / 4 : 0
  parts.opens = Math.max(Math.min(1, builtOn / OPENS_FULL), ratedUseful)
  if (builtOn >= 3) reasons.push(note('opensMany', { n: builtOn }, `${builtOn} later subjects build on it.`))

  // Pathway value: subjects it unlocks that match the student's interests. Only for a subject
  // that is itself on one of their topics: when the path is all that links it to them, the
  // interest score above already counts it, and counting it twice put a broad first-year
  // prerequisite of many subjects above the student's own subjects.
  const unlocks = leadsTo
  if (unlocks.length > 0) {
    if (parts.interest !== undefined && parts.interest > PATHWAY_INTEREST) parts.unlocks = Math.min(1, unlocks.length / 3)
    const codes = `${unlocks.slice(0, 3).join(', ')}${unlocks.length > 3 ? '…' : ''}`
    reasons.push(note('unlocks', { codes }, `Opens up ${codes}.`))
  }

  if (ctx.eligibility === 'unknown') {
    // Not added to our data yet, or a condition only the student knows (a VCE score): said
    // plainly, with the Handbook's own words kept for whoever wants them.
    if (s.prerequisites === 'unknown') warnings.push(note('prereqNotCurated', {}, 'Prerequisites not added yet: check the Handbook.'))
    else {
      const needs = ctx.unmet.join('; ')
      warnings.push(note('eligibilityUnknown', { needs }, `Eligibility not confirmed: ${needs}.`))
    }
  }

  // Score from the signals we have, not with the missing ones filled in as "neutral": a
  // missing one says nothing about fit, and counting it as 0.5 squeezed every score towards
  // the middle (worst for "protect my WAM", whose signals need ratings and marks). Then pulled
  // part of the way back to neutral by how much of the goal's weight we could actually see,
  // so a subject known on one signal can't look as sure as a well-documented one.
  const weights = WEIGHTS[ctx.profile.goal]
  // How sure we are counts only what's actually known, before any neutral fill-in below.
  const known = (Object.keys(parts) as Signal[]).filter((k) => weights[k] > 0).length
  const confidence = known >= 4 ? 'high' : known >= 2 ? 'medium' : 'low'
  // Except a goal's own core signals: "protect my WAM" is about how easy it is to do well, so
  // a subject nobody has rated can't rank with ones known to be easy; there a missing core
  // signal counts as neutral rather than being skipped.
  for (const k of CORE[ctx.profile.goal]) parts[k] ??= 0.5
  const present = (Object.keys(parts) as Signal[]).filter((k) => weights[k] > 0)
  const signalKeys = (Object.keys(weights) as Signal[]).filter((k) => weights[k] > 0)
  const totalWeight = signalKeys.reduce((sum, k) => sum + weights[k], 0)
  const seenWeight = present.reduce((sum, k) => sum + weights[k], 0)
  const seen = seenWeight > 0 ? present.reduce((sum, k) => sum + weights[k] * (parts[k] as number), 0) / seenWeight : 0.5
  const coverage = seenWeight / totalWeight
  const value = 0.5 + (seen - 0.5) * (SURE_BASE + (1 - SURE_BASE) * coverage)

  return {
    code: s.code,
    title: s.title,
    score: Math.round(value * 100),
    betterThan: 0,
    confidence,
    eligibility: ctx.eligibility,
    reasons,
    warnings,
  }
}

/**
 * Nearest subjects (within a few prerequisite steps) that this one leads to and
 * that cover one of the student's interests.
 */
function pathTo(code: string, interests: string[], ctx: ScoreCtx): { steps: number; codes: string[] } {
  let frontier = [code]
  const seen = new Set(frontier)
  for (let steps = 1; steps <= PATHWAY_MAX_STEPS; steps++) {
    frontier = frontier.flatMap((c) => ctx.dependents.get(c) ?? []).filter((c) => !seen.has(c) && seen.add(c))
    const hits = frontier.filter((c) => {
      const next = ctx.data.subjects[c]
      if (!next || ctx.taken.has(c) || ctx.blocked.has(c)) return false
      if (next.nonAllowed !== 'unknown' && next.nonAllowed.some((x) => ctx.taken.has(x))) return false
      return topicsOf(next).specific.some((t) => interests.includes(t))
    })
    if (hits.length) return { steps, codes: hits }
    if (frontier.length === 0) break
  }
  return { steps: 0, codes: [] }
}

/**
 * How many subjects build on this one. With interests given, only the ones heading somewhere
 * the student wants to go count: forty physics subjects after PHYC10001 say nothing to someone
 * who chose data science. Used for "useful later" and to break ties, so the two agree.
 */
function usefulLater(code: string, dependents: Map<string, string[]>, data: Dataset, interests: string[]): number {
  const after = dependents.get(code) ?? []
  if (!interests.length) return after.length
  return after.filter((c) => {
    const next = data.subjects[c]
    return next !== undefined && topicsOf(next).topics.some((t) => interests.includes(t))
  }).length
}

/** code -> subjects whose prerequisites mention it. */
function buildDependents(data: Dataset, course?: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  // In a course whose subjects are categorised, one with no category there gives no credit, so
  // it isn't somewhere this student's subjects lead (FNCE30014 for a science student).
  const categorised = course !== undefined && Object.values(data.subjects).some((x) => x.categories[course] !== undefined)
  for (const s of Object.values(data.subjects)) {
    // A graduate subject (level 9) isn't somewhere an undergraduate subject leads in this degree.
    if (s.level > 3) continue
    if (categorised && s.categories[course!] === undefined) continue
    for (const ref of referencedSubjects(s.prerequisites)) {
      map.set(ref, [...(map.get(ref) ?? []), s.code])
    }
  }
  return map
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Known to run in this year or the next few; unknown timetables get the benefit of the doubt. */
function runsSoon(s: Subject, year: number): boolean {
  if (s.discontinuedFrom !== undefined && year >= s.discontinuedFrom) return false
  if (s.offerings === 'unknown') return true
  for (let d = 0; d < RUN_HORIZON_YEARS; d++) if (periodsFor(s, year + d).length > 0) return true
  return false
}

/** Average ease (0–1) over all rated subjects; 0.5 until enough are rated. */
function siteRatingMean(data: Dataset): number {
  const vals: number[] = []
  for (const s of Object.values(data.subjects)) {
    const g = s.signals
    if (!g || g.reviews === 0) continue
    const xs = [g.difficulty === undefined ? undefined : 5 - g.difficulty, g.workload === undefined ? undefined : 5 - g.workload, g.grading === undefined ? undefined : g.grading - 1].filter(
      (x): x is number => x !== undefined,
    )
    if (xs.length) vals.push(xs.reduce((a, b) => a + b, 0) / (4 * xs.length))
  }
  // Until enough subjects are rated, the site-wide average is itself unreliable.
  return vals.length >= MIN_RATED_FOR_PRIOR ? avg(vals) : 0.5
}

/**
 * Variety without hiding better matches: when the next pick would make three in a row
 * from the same area, take the best subject from another area instead, but only if
 * it's within a few points. Scores are unchanged; only near-ties and alternatives move.
 */
function diversify(recs: Recommendation[], data: Dataset): Recommendation[] {
  const pool = [...recs]
  const out: Recommendation[] = []
  // Versions of the same subject (non-allowed with one already listed: Linear Algebra and its
  // Advanced and Accelerated forms) can't all be taken, so only the best keeps its place; the
  // rest wait at the end instead of filling the top with one choice.
  const later: Recommendation[] = []
  const excluded = (x: string, y: string) => {
    const nx = data.subjects[x]?.nonAllowed
    const ny = data.subjects[y]?.nonAllowed
    return (nx !== undefined && nx !== 'unknown' && nx.includes(y)) || (ny !== undefined && ny !== 'unknown' && ny.includes(x))
  }
  const area = (r: Recommendation) => data.subjects[r.code]?.area
  while (pool.length) {
    const top = pool[0] as Recommendation
    if (out.some((r) => excluded(r.code, top.code))) {
      later.push(pool.shift() as Recommendation)
      continue
    }
    const [a, b] = [out.at(-1), out.at(-2)]
    const streak = a && b && area(a) === area(top) && area(b) === area(top)
    const alt = streak ? pool.findIndex((r) => area(r) !== area(top) && top.score - r.score <= TIE_POINTS && !out.some((o) => excluded(o.code, r.code))) : -1
    out.push(pool.splice(alt > 0 ? alt : 0, 1)[0] as Recommendation)
  }
  return [...out, ...later]
}

/** The highest level a student can usually take: year 1 until 100 points are done, and so on. */
export function yearLevel(results: Profile['results'], data: Dataset): number {
  const done = passedCodes(results).reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)
  return Math.min(3, Math.floor(done / 100) + 1)
}

/** A rough ease (0–1, 0.5 neutral) from what the Handbook says, for subjects nobody has rated. */
function structuralEase(s: Subject): number {
  let e = 0.5
  if (s.level === 1) e += 0.04
  if (s.level >= 3) e -= 0.04
  if (s.assessment) {
    const exam = s.assessment.filter((t) => t.kind === 'exam').reduce((n, t) => n + t.weight, 0)
    // The more rides on one exam, the riskier for a WAM: ±0.08 from all coursework to all exam.
    e += ((50 - exam) / 50) * 0.08
    if (s.assessment.some((t) => t.kind === 'exam' && t.hurdle)) e -= 0.03
  }
  return e
}

/**
 * Fill in a profile from the student's own ratings of subjects they took. A skill they didn't rate
 * gets a level from how hard they found the subjects that use it (easy → strong); topics of
 * subjects they'd recommend or found interesting become soft interests (topic → that subject).
 */
export function personalise(p: Profile, data: Dataset): { profile: Profile; liked: Map<string, string> } {
  const liked = new Map<string, string>()
  const own = Object.entries(p.ratings ?? {}).filter(([c]) => data.subjects[c])
  if (!own.length) return { profile: p, liked }
  const ease = new Map<Skill, number[]>()
  for (const [code, r] of own) {
    const s = data.subjects[code]!
    if (r.difficulty !== undefined) for (const k of skillsOf(s, data)) ease.set(k, [...(ease.get(k) ?? []), 6 - r.difficulty])
    if (r.recommend === 'Yes' || (r.interest ?? 0) >= 4) for (const t of topicsOf(s).topics) if (!liked.has(t)) liked.set(t, code)
  }
  const skills = { ...p.skills }
  for (const [k, xs] of ease) if (skills[k] === undefined) skills[k] = Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
  return { profile: { ...p, skills }, liked }
}

