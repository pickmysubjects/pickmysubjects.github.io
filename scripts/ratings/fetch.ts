/**
 * Daily job (GitHub Actions): read the private ratings sheet with a read-only
 * service account, aggregate, and write data/real/ratings.json.
 *
 * Env (GitHub secrets): GOOGLE_SERVICE_ACCOUNT_JSON, RATINGS_SHEET_ID. Grade bands sent with a
 * WAM range in the same sheet also give data/real/grade-offsets.json.
 * If they are missing, it exits quietly so CI stays green before setup.
 */
import { createSign } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDataset, ROOT } from '../dataset'
import { aggregate, rowsToObjects } from './aggregate'
import { gradeOffsets } from '../../src/engine/grades'

const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
const sheetId = process.env.RATINGS_SHEET_ID
if (!credentials || !sheetId) {
  console.log('Ratings sheet not configured yet — skipping.')
  process.exit(0)
}

let parsed: { client_email: string; private_key: string }
try {
  parsed = JSON.parse(credentials) as typeof parsed
} catch {
  // Don't let a parse error echo part of the secret into the log.
  console.error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.')
  process.exit(1)
}
const { client_email: email, private_key: key } = parsed

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 600,
    }),
  )
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  })
  if (!res.ok) throw new Error(`token request failed: ${res.status}`)
  return ((await res.json()) as { access_token: string }).access_token
}

const token = await accessToken()

async function readSheet(id: string): Promise<string[][]> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/A:Z`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`sheet read failed: ${res.status}`)
  return ((await res.json()) as { values?: string[][] }).values ?? []
}
const values = await readSheet(sheetId)

const known = new Set(Object.keys(buildDataset('real').dataset.subjects))
const result = aggregate(rowsToObjects(values), new Date(), known)
writeFileSync(join(ROOT, 'data', 'real', 'ratings.json'), `${JSON.stringify(result.subjects, null, 2)}\n`)
console.log(`Ratings: ${result.accepted} accepted, ${result.rejected} rejected, ${Object.keys(result.subjects).length} subjects.`)

// Grade bands sent with a WAM range (from a rating or the My page card): only per-subject offsets
// from 5+ of them are written; rows never are.
const graded = rowsToObjects(values).map((r) => ({
  code: r['Subject code'] ?? '',
  band: r['Grade band'] ?? '',
  wamBand: r['WAM range without this subject'] ?? '',
}))
const offsets = gradeOffsets(graded, known)
writeFileSync(join(ROOT, 'data', 'real', 'grade-offsets.json'), `${JSON.stringify(offsets, null, 2)}\n`)
console.log(`Grade bands: ${Object.keys(offsets).length} subjects with 5+ shares.`)
