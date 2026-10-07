/**
 * Deep copy of plain JSON data. Unlike structuredClone, this works on Vue's
 * reactive proxies (structuredClone throws DataCloneError on them).
 */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
