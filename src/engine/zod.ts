import { z } from 'zod'

/**
 * zod, set up once before any schema is built (zod decides at build time whether to use its
 * eval-based fast path). The site's Content-Security-Policy has no 'unsafe-eval', so that path can
 * never run; without this zod still tries `new Function` once, and Firefox logs the blocked eval
 * as an error on every page. Import z from here, not from 'zod'.
 */
z.config({ jitless: true })

export { z }
