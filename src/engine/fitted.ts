import raw from '../../data/real/model.json'
import type { GradeModel } from './grades'

/**
 * Numbers the weekly ratings job estimates from the data once there is enough of it
 * (data/real/model.json, written by scripts/ratings/fetch.ts). Each one is absent until its own
 * threshold is met, and every consumer then keeps its hand-set constant exactly. Values outside a
 * sane range are ignored rather than trusted.
 */
export interface FittedModel {
  /** The grade model, fitted from 200+ shared bands (gradeModel.ts). */
  grade?: GradeModel & { rows: number }
  /** Ratings' pull toward the site average, in reviews (recommend.ts), from 30+ rated subjects. */
  ratingPrior?: number
  /** The neutral prior in the easy/hard lists' review score (easeRanking.ts), from 30+ rated subjects. */
  reviewPrior?: number
  /** Offsets predicted from Handbook facts, from 40+ subjects with offsets (gradeModel.ts). */
  featurePrior?: { weights: number[]; tau: number; subjects: number }
}

const inRange = (x: unknown, lo: number, hi: number): number | undefined => (typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi ? x : undefined)

/** Reads a model file, keeping only values that are numbers in range. */
export function readFitted(m: FittedModel) {
  const fp = m.featurePrior
  const weights = fp && Array.isArray(fp.weights) && fp.weights.every((w) => inRange(w, -50, 50) !== undefined) ? fp.weights : undefined
  const tau = inRange(fp?.tau, 0.5, 20)
  return {
    /** How far a mark usually strays from the student's level (the grade model's sigma). */
    spread: inRange(m.grade?.sigma, 3, 20),
    ratingPrior: inRange(m.ratingPrior, 0.25, 50),
    reviewPrior: inRange(m.reviewPrior, 0.25, 10),
    featurePrior: weights && tau !== undefined ? { weights, tau } : undefined,
  }
}

export const FITTED = readFitted(raw as FittedModel)
