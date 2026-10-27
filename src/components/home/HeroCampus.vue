<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { useI18n } from '@/i18n'

/**
 * The home hero's campus: students walk in casual and come out in gowns, with their degree's
 * hood (hover a graduate for the degree). Decorative: hidden from screen readers, which get
 * one short line instead. Pure SVG + CSS: moving parts animate transforms and opacity only,
 * the box keeps its aspect ratio from the first paint, and the animation stops while the
 * scene is off screen. Reduced motion shows one still frame.
 * Generated from the approved design (hero A); colours of the building and ground follow the theme.
 */
const { t } = useI18n()
const root = useTemplateRef<HTMLElement>('root')
let io: IntersectionObserver | undefined
onMounted(() => {
  const el = root.value
  if (!el || !('IntersectionObserver' in window)) return
  io = new IntersectionObserver(([e]) => el.classList.toggle('hc-off', !e?.isIntersecting))
  io.observe(el)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div ref="root" class="hc">
    <p class="visually-hidden">{{ t('home.scene') }}</p>
    <div class="hc-scene" aria-hidden="true">
      <svg class="hc-bg" viewBox="0 0 691.5 595"><defs><linearGradient id="hcL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="g1"/><stop offset="1" class="g3"/></linearGradient><linearGradient id="hcR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="g10"/><stop offset="1" class="g11"/></linearGradient><linearGradient id="hcD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c1934"/><stop offset="1" stop-color="#4b2c57"/></linearGradient><linearGradient id="hcW" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="#fbf8ff"/><stop offset=".3" stop-color="#e2d9fd"/><stop offset=".31" stop-color="#cbbffa"/><stop offset=".62" stop-color="#b3a4f2"/><stop offset=".63" stop-color="#c3b6f7"/><stop offset="1" stop-color="#d9c6f2"/></linearGradient><linearGradient id="hcG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="g18"/><stop offset="1" class="g19"/></linearGradient><linearGradient id="hcT" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#f58cc0"/><stop offset=".55" stop-color="#d23a8a"/><stop offset="1" stop-color="#b81c70"/></linearGradient><radialGradient id="hcJ" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#d3c6fb"/><stop offset=".6" stop-color="#a996f0"/><stop offset="1" stop-color="#8b76e6"/></radialGradient><filter id="hcB" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter><filter id="hcb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter><g id="hcsh"><ellipse cx="0" cy="0" rx="9" ry="3" fill="#5b2a6b" opacity=".17"/></g><g id="hcl1"><rect style="fill:var(--p)" x="-5.4" y="-17" width="4.6" height="16" rx="2.3"/><ellipse cx="-3.1" cy="-1.2" rx="2.9" ry="1.7" fill="#fbf8fd"/></g><g id="hcl2"><rect style="fill:var(--p)" x=".8" y="-17" width="4.6" height="16" rx="2.3"/><ellipse cx="3.1" cy="-1.2" rx="2.9" ry="1.7" fill="#fbf8fd"/></g><g id="hca1"><rect style="fill:var(--td)" x="-11" y="-30.5" width="4.2" height="13" rx="2.1"/><circle style="fill:var(--k)" cx="-8.9" cy="-17.4" r="1.9"/></g><g id="hca2"><rect style="fill:var(--td)" x="6.8" y="-30.5" width="4.2" height="13" rx="2.1"/><circle style="fill:var(--k)" cx="8.9" cy="-17.4" r="1.9"/></g><g id="hcct"><rect style="fill:var(--t)" x="-8" y="-32.5" width="16" height="17.5" rx="5.5"/><path style="stroke:var(--td)" d="M-5.2,-29 L-6.4,-32.6 M5.2,-29 L6.4,-32.6" stroke-width="1.4" stroke-linecap="round"/><rect style="fill:var(--b)" x="-6.2" y="-29.6" width="12.4" height="13.4" rx="4"/><rect x="-4.3" y="-21.6" width="8.6" height="4.4" rx="2" fill="#000" opacity=".12"/><rect x="-4.6" y="-28.4" width="9.2" height="2" rx="1" fill="#fff" opacity=".3"/></g><g id="hchd"><path style="fill:var(--td)" d="M-5.6,-32.6 Q0,-27.6 5.6,-32.6 Q0,-34.4 -5.6,-32.6Z"/></g><g id="hcf1"><ellipse cx="-3.1" cy="-1.4" rx="2.8" ry="1.8" fill="#2a1d2e"/></g><g id="hcf2"><ellipse cx="3.1" cy="-1.4" rx="2.8" ry="1.8" fill="#2a1d2e"/></g><g id="hcs1"><rect style="fill:var(--g)" x="-11.6" y="-31" width="4.8" height="14.4" rx="2.4"/><rect x="-11.6" y="-31" width="4.8" height="14.4" rx="2.4" fill="#fff" opacity=".06"/><circle style="fill:var(--k)" cx="-9.2" cy="-16.8" r="1.9"/></g><g id="hcs2"><rect style="fill:var(--g)" x="6.8" y="-31" width="4.8" height="14.4" rx="2.4"/><rect x="6.8" y="-31" width="4.8" height="14.4" rx="2.4" fill="#000" opacity=".25"/><circle style="fill:var(--k)" cx="9.2" cy="-16.8" r="1.9"/></g><g id="hcgb"><path style="fill:var(--g)" d="M-7.6,-32.5 C-9.2,-24 -10.6,-12 -10.6,-3.2 Q0,-1.4 10.6,-3.2 C10.6,-12 9.2,-24 7.6,-32.5Z"/><path d="M2.4,-32.5 L7.6,-32.5 C9.2,-24 10.6,-12 10.6,-3.2 Q7,-2.2 3.4,-2.2Z" fill="#000" opacity=".3"/><path d="M-4.4,-31 C-6.6,-22 -7.6,-12 -7.8,-4.2" stroke="#fff" stroke-opacity=".13" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M-7,-33 L0,-21.6 L7,-33" fill="none" stroke="#0e0d10" stroke-width="4.6" stroke-linejoin="round"/><path style="stroke:var(--hl)" d="M-6.4,-33 L0,-22.6 L6.4,-33" fill="none" stroke-width="3.2" stroke-linejoin="round"/><path style="stroke:var(--hs)" d="M-6.4,-33 L0,-22.6 L6.4,-33" fill="none" stroke-width=".9" stroke-linejoin="round"/><path d="M-7.6,-32.2 L0,-20.4 L7.6,-32.2" fill="none" stroke="#fff" stroke-width=".8" stroke-linejoin="round"/><path d="M-2.8,-32.6 L0,-27.6 L2.8,-32.6Z" fill="#fff"/></g><g id="hccp"><path d="M-5.6,-42.4 V-44.8 H5.6 V-42.4 Q0,-40.8 -5.6,-42.4Z" fill="#141317"/><path d="M0,-50 L11.2,-45.7 L0,-41.4 L-11.2,-45.7Z" fill="#262429"/><path d="M-11.2,-45.7 L0,-41.4 L11.2,-45.7 L11.2,-44.9 L0,-40.6 L-11.2,-44.9Z" fill="#0e0d10"/><path d="M0,-49.3 L-8.6,-46" stroke="#fff" stroke-opacity=".28" stroke-width=".9"/><path d="M0,-45.7 L8.6,-45 V-40.4" stroke="#0e0d10" stroke-width="1" fill="none"/><rect x="7.7" y="-41.4" width="1.8" height="3.6" rx=".8" fill="#0e0d10"/><circle cx="0" cy="-45.7" r="1" fill="#0e0d10"/></g><g id="hchbbun"><rect style="fill:var(--k)" x="-2" y="-34" width="4" height="3.5"/><circle style="fill:var(--h)" cx="0" cy="-38.6" r="6.4"/><circle style="fill:var(--h)" cx="0" cy="-46.2" r="2.7"/><ellipse cx="-2.4" cy="-42" rx="2.2" ry="1.2" fill="#fff" opacity=".18"/></g><g id="hchfbun"><rect style="fill:var(--k)" x="-2" y="-34" width="4" height="3.5"/><circle style="fill:var(--k)" cx="0" cy="-38.6" r="6.3"/><path style="fill:var(--h)" d="M-6.5,-38.2 C-6.8,-46.4 6.8,-46.4 6.5,-38.2 C4.4,-41.6 -1.6,-42.2 -6.5,-38.2Z"/><circle cx="-1.5" cy="-38" r=".75" fill="#2e1d2c"/><circle cx="2.7" cy="-38" r=".75" fill="#2e1d2c"/><ellipse cx="-2.6" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/><ellipse cx="3.9" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/></g><g id="hchbcurly"><rect style="fill:var(--k)" x="-2" y="-34" width="4" height="3.5"/><circle style="fill:var(--h)" cx="0" cy="-38.6" r="6.4"/><circle style="fill:var(--h)" cx="-4.6" cy="-42.6" r="3"/><circle style="fill:var(--h)" cx="4.4" cy="-43" r="3"/><circle style="fill:var(--h)" cx="0" cy="-45" r="3.2"/><ellipse cx="-2.4" cy="-42" rx="2.2" ry="1.2" fill="#fff" opacity=".18"/></g><g id="hchfcurly"><rect style="fill:var(--k)" x="-2" y="-34" width="4" height="3.5"/><circle style="fill:var(--k)" cx="0" cy="-38.6" r="6.3"/><path style="fill:var(--h)" d="M-6.8,-38.4 C-8.6,-44 -3,-48.4 1,-46.6 C5.6,-48 8.6,-43.2 6.8,-38.4 C4.6,-41 -4.4,-41 -6.8,-38.4Z"/><circle cx="-1.5" cy="-38" r=".75" fill="#2e1d2c"/><circle cx="2.7" cy="-38" r=".75" fill="#2e1d2c"/><ellipse cx="-2.6" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/><ellipse cx="3.9" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/></g><g id="hchbhijab"><path style="fill:var(--h)" d="M-7,-29.5 C-8,-34 -7.6,-45.6 0,-45.6 C7.6,-45.6 8,-34 7,-29.5 Q0,-27.5 -7,-29.5Z"/><path d="M-3,-44 Q2,-45 5,-41" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none"/></g><g id="hchfhijab"><path style="fill:var(--h)" d="M-7.2,-29.8 C-8.2,-34 -7.8,-45.4 0,-45.4 C7.8,-45.4 8.2,-34 7.2,-29.8 Q0,-27.8 -7.2,-29.8Z"/><ellipse style="fill:var(--k)" cx=".4" cy="-38" rx="4.3" ry="5"/><circle cx="-1.5" cy="-38" r=".75" fill="#2e1d2c"/><circle cx="2.7" cy="-38" r=".75" fill="#2e1d2c"/><ellipse cx="-2.6" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/><ellipse cx="3.9" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/></g><g id="hchblong"><rect style="fill:var(--k)" x="-2" y="-34" width="4" height="3.5"/><path style="fill:var(--h)" d="M-6.6,-38.5 V-29.5 Q0,-27.6 6.6,-29.5 V-38.5Z"/><circle style="fill:var(--h)" cx="0" cy="-38.6" r="6.4"/><ellipse cx="-2.4" cy="-42" rx="2.2" ry="1.2" fill="#fff" opacity=".18"/></g><g id="hchflong"><rect style="fill:var(--k)" x="-2" y="-34" width="4" height="3.5"/><path style="fill:var(--h)" d="M-6.6,-39 V-30.5 Q-4.6,-29.4 -3.8,-31 V-38Z M6.6,-39 V-30.5 Q4.6,-29.4 3.8,-31 V-38Z"/><circle style="fill:var(--k)" cx="0" cy="-38.6" r="6.3"/><path style="fill:var(--h)" d="M-6.5,-38.2 C-6.8,-46.4 6.8,-46.4 6.5,-38.2 C4.4,-41.6 -1.6,-42.2 -6.5,-38.2Z"/><circle cx="-1.5" cy="-38" r=".75" fill="#2e1d2c"/><circle cx="2.7" cy="-38" r=".75" fill="#2e1d2c"/><ellipse cx="-2.6" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/><ellipse cx="3.9" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/></g><g id="hchbshort"><rect style="fill:var(--k)" x="-2" y="-34" width="4" height="3.5"/><circle style="fill:var(--h)" cx="0" cy="-38.6" r="6.4"/><ellipse cx="-2.4" cy="-42" rx="2.2" ry="1.2" fill="#fff" opacity=".18"/></g><g id="hchfshort"><rect style="fill:var(--k)" x="-2" y="-34" width="4" height="3.5"/><circle style="fill:var(--k)" cx="0" cy="-38.6" r="6.3"/><path style="fill:var(--h)" d="M-6.5,-38.2 C-6.8,-46.4 6.8,-46.4 6.5,-38.2 C4.4,-41.6 -1.6,-42.2 -6.5,-38.2Z"/><circle cx="-1.5" cy="-38" r=".75" fill="#2e1d2c"/><circle cx="2.7" cy="-38" r=".75" fill="#2e1d2c"/><ellipse cx="-2.6" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/><ellipse cx="3.9" cy="-35.8" rx="1.3" ry=".7" fill="#e86aa6" opacity=".35"/></g></defs><g transform="translate(0 16)"><rect transform="matrix(.866 .5 -.866 .5 315.4 226)" x="-45" y="-45" width="425" height="355" rx="56" class="f20"/></g><g transform="translate(0 8)"><rect transform="matrix(.866 .5 -.866 .5 315.4 226)" x="-45" y="-45" width="425" height="355" rx="56" class="f21"/></g><rect transform="matrix(.866 .5 -.866 .5 315.4 226)" x="-45" y="-45" width="425" height="355" rx="56" fill="url(#hcG)" class="s22" stroke-width="2"/><rect transform="matrix(.866 .5 -.866 .5 315.4 226)" x="-32" y="168" width="130" height="128" rx="22" class="f23"/><rect transform="matrix(.866 .5 -.866 .5 315.4 226)" x="240" y="-32" width="125" height="60" rx="22" class="f23"/><rect transform="matrix(.866 .5 -.866 .5 315.4 226)" x="236" y="160" width="120" height="125" rx="22" class="f23"/><ellipse cx="560.2" cy="338" rx="16" ry="6" fill="#6b3d82" opacity=".14" filter="url(#hcb)"/><path d="M543.2,337 v-14 a13,6.5 0 0 1 26,0 v14 a13,6.5 0 0 1 -26,0Z" class="f8"/><ellipse cx="556.2" cy="323" rx="13" ry="6.5" class="f0"/><circle cx="552.2" cy="316" r="9" fill="#9fc9ad"/><circle cx="561.2" cy="313" r="7" fill="#b7d8c1"/><circle cx="557.2" cy="308" r="6" fill="#8fbd9f"/><g transform="matrix(.866 .5 -.866 .5 315.4 226)"><rect class="f24 s25" x="126" y="140" width="44" height="164" rx="14" stroke-width="1.5"/><rect class="f24 s25" x="210" y="48" width="164" height="44" rx="14" stroke-width="1.5"/><path d="M130,166 h36" class="s26" stroke-width="1.5"/><path d="M130,192 h36" class="s26" stroke-width="1.5"/><path d="M130,218 h36" class="s26" stroke-width="1.5"/><path d="M130,244 h36" class="s26" stroke-width="1.5"/><path d="M130,270 h36" class="s26" stroke-width="1.5"/><path d="M130,296 h36" class="s26" stroke-width="1.5"/><path d="M236,52 v36" class="s26" stroke-width="1.5"/><path d="M262,52 v36" class="s26" stroke-width="1.5"/><path d="M288,52 v36" class="s26" stroke-width="1.5"/><path d="M314,52 v36" class="s26" stroke-width="1.5"/><path d="M340,52 v36" class="s26" stroke-width="1.5"/><path d="M366,52 v36" class="s26" stroke-width="1.5"/></g><polygon points="194.2,296 376.1,401 467.9,384 580.4,319 393.4,211 315.4,226" fill="#6b3d82" opacity=".16" filter="url(#hcB)"/><polygon points="185.5,296 376.1,406 376.1,397 185.5,287" class="f5"/><polygon points="506,331 376.1,406 376.1,397 506,322" class="f13"/><polygon points="315.4,212 506,322 376.1,397 185.5,287" class="f2"/><polygon points="194.2,287 376.1,392 376.1,283 194.2,178" fill="url(#hcL)"/><polygon points="497.3,322 376.1,392 376.1,283 497.3,213" fill="url(#hcR)"/><polygon points="315.4,108 497.3,213 376.1,283 194.2,178" class="f0"/><g transform="matrix(.866 .5 0 1 194.2 178)"><path d="M9.5,84.5 V42 A14.5,14.5 0 0 1 38.5,42 V84.5 Z" class="f0"/><path d="M12,82 V42 A12,12 0 0 1 36,42 V82 Z" fill="url(#hcW)"/><path d="M24,32 V82" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><path d="M12,48 H36" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><path d="M49.5,84.5 V42 A14.5,14.5 0 0 1 78.5,42 V84.5 Z" class="f0"/><path d="M52,82 V42 A12,12 0 0 1 76,42 V82 Z" fill="url(#hcW)"/><path d="M64,32 V82" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><path d="M52,48 H76" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><path d="M89.5,84.5 V42 A14.5,14.5 0 0 1 118.5,42 V84.5 Z" class="f0"/><path d="M92,82 V42 A12,12 0 0 1 116,42 V82 Z" fill="url(#hcW)"/><path d="M104,32 V82" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><path d="M92,48 H116" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><rect x="0" y="16" width="210" height="3" class="f0" opacity=".9"/><path d="M122,118 V62 A26,26 0 0 1 174,62 V118 Z" class="f0"/><path d="M125.5,118 V62 A22.5,22.5 0 0 1 170.5,62 V118 Z" class="f9"/><path d="M128,118 V62 A20,20 0 0 1 168,62 V118 Z" fill="url(#hcD)"/></g><g transform="matrix(.866 -.5 0 1 376.1 283)"><path d="M7.5,84.5 V42 A14.5,14.5 0 0 1 36.5,42 V84.5 Z" class="f15"/><path d="M10,82 V42 A12,12 0 0 1 34,42 V82 Z" fill="url(#hcW)"/><path d="M22,32 V82" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><path d="M10,48 H34" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><path d="M103.5,84.5 V42 A14.5,14.5 0 0 1 132.5,42 V84.5 Z" class="f15"/><path d="M106,82 V42 A12,12 0 0 1 130,42 V82 Z" fill="url(#hcW)"/><path d="M118,32 V82" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><path d="M106,48 H130" stroke="#fff" stroke-width="2" stroke-opacity=".75"/><rect x="0" y="16" width="140" height="3" class="f16" opacity=".9"/><path d="M44,118 V62 A26,26 0 0 1 96,62 V118 Z" class="f17"/><path d="M47.5,118 V62 A22.5,22.5 0 0 1 92.5,62 V118 Z" class="f9"/><path d="M50,118 V62 A20,20 0 0 1 90,62 V118 Z" fill="url(#hcD)"/></g><polygon points="182.1,178 376.1,290 376.1,281 182.1,169" class="f4"/><polygon points="509.4,213 376.1,290 376.1,281 509.4,204" class="f12"/><polygon points="315.4,92 509.4,204 376.1,281 182.1,169" class="f1"/><polygon points="261.7,180 357,235 357,211 261.7,156" fill="url(#hcL)"/><polygon points="429.8,193 357,235 357,211 429.8,169" fill="url(#hcR)"/><polygon points="334.5,114 429.8,169 357,211 261.7,156" class="f0"/><polygon points="254.8,156 357,215 357,209 254.8,150" class="f4"/><polygon points="436.7,169 357,215 357,209 436.7,163" class="f12"/><polygon points="334.5,104 436.7,163 357,209 254.8,150" class="f1"/><polygon points="311.1,156.5 345.7,176.5 345.7,136.5 311.1,116.5" fill="url(#hcL)"/><polygon points="380.4,156.5 345.7,176.5 345.7,136.5 380.4,116.5" fill="url(#hcR)"/><polygon points="345.7,96.5 380.4,116.5 345.7,136.5 311.1,116.5" class="f0"/><g transform="matrix(.866 .5 0 1 237.5 74)"><circle cx="105" cy="18" r="11" class="f0"/><circle cx="105" cy="18" r="8.5" fill="url(#hcW)"/><path d="M105,18 V12 M105,18 h5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g><polygon points="304.2,116.5 345.7,140.5 345.7,135.5 304.2,111.5" class="f4"/><polygon points="387.3,116.5 345.7,140.5 345.7,135.5 387.3,111.5" class="f12"/><polygon points="345.7,87.5 387.3,111.5 345.7,135.5 304.2,111.5" class="f1"/><polygon points="325,106.5 354.4,123.5 354.4,119.5 325,102.5" class="f7"/><polygon points="366.5,116.5 354.4,123.5 354.4,119.5 366.5,112.5" class="f14"/><polygon points="337.1,95.5 366.5,112.5 354.4,119.5 325,102.5" class="f0"/><rect transform="matrix(.866 .5 0 1 258.3 9)" x="83" y="0" width="44" height="44" rx="11" fill="#a3175f"/><rect transform="matrix(.866 .5 0 1 257 9.8)" x="83" y="0" width="44" height="44" rx="11" fill="#a3175f"/><rect transform="matrix(.866 .5 0 1 255.7 10.5)" x="83" y="0" width="44" height="44" rx="11" fill="#a3175f"/><rect transform="matrix(.866 .5 0 1 254.4 11.2)" x="83" y="0" width="44" height="44" rx="11" fill="#a3175f"/><rect transform="matrix(.866 .5 0 1 253.1 12)" x="83" y="0" width="44" height="44" rx="11" fill="#a3175f"/><g transform="matrix(.866 .5 0 1 252.2 12.5)"><g transform="translate(83 0) scale(1.1)"><rect x="0" y="0" width="40" height="40" rx="10" fill="url(#hcT)"/><ellipse cx="20" cy="7.5" rx="16" ry="6.5" fill="#fff" opacity=".28"/><rect x=".6" y=".6" width="38.8" height="38.8" rx="9.6" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/><path d="M20,11 L33,17 L20,23 L7,17Z" fill="#fff"/><path d="M12.5,19.6 V25 C12.5,28 27.5,28 27.5,25 V19.6 L20,23.2Z" fill="#fff"/><path d="M31,17.6 V25" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="31" cy="26.2" r="1.7" fill="#fff"/></g></g><polygon points="284.3,366 329.3,392 329.3,387.5 284.3,361.5" class="f6"/><polygon points="340.6,385.5 329.3,392 329.3,387.5 340.6,381" class="f14"/><polygon points="295.5,355 340.6,381 329.3,387.5 284.3,361.5" class="f0"/><polygon points="418.5,381.5 429.8,388 429.8,383.5 418.5,377" class="f6"/><polygon points="474.8,362 429.8,388 429.8,383.5 474.8,357.5" class="f14"/><polygon points="463.5,351 474.8,357.5 429.8,383.5 418.5,377" class="f0"/><ellipse cx="375.4" cy="490" rx="27.3" ry="11.7" fill="#6b3d82" opacity=".14" filter="url(#hcb)"/><path d="M367.4,488 q2,-22 0,-44" stroke="#b79a8f" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="367.4" cy="440" r="26" fill="url(#hcJ)"/><circle cx="347.9" cy="453.1" r="17.7" fill="url(#hcJ)"/><circle cx="388.2" cy="451.8" r="18.7" fill="url(#hcJ)"/><circle cx="359.6" cy="432.3" r="9.1" fill="#fff" opacity=".22"/><polygon points="211.5,377 234,390 234,384 211.5,371" fill="#f2a9c9"/><polygon points="249.6,381 234,390 234,384 249.6,375" fill="#e28fb4"/><polygon points="227.1,362 249.6,375 234,384 211.5,371" class="f1"/><polygon points="216.7,371 239.2,384 239.2,378 216.7,365" fill="#bfaef3"/><polygon points="254.8,375 239.2,384 239.2,378 254.8,369" fill="#a795e6"/><polygon points="232.3,356 254.8,369 239.2,378 216.7,365" class="f1"/><polygon points="211.5,365 234,378 234,372 211.5,359" fill="#a9cdb5"/><polygon points="249.6,369 234,378 234,372 249.6,363" fill="#8fb69c"/><polygon points="227.1,350 249.6,363 234,372 211.5,359" class="f1"/><polygon points="216.7,359 239.2,372 239.2,366 216.7,353" fill="#f2d98d"/><polygon points="254.8,363 239.2,372 239.2,366 254.8,357" fill="#dcc070"/><polygon points="232.3,344 254.8,357 239.2,366 216.7,353" class="f1"/><ellipse cx="501.3" cy="350" rx="16" ry="6" fill="#6b3d82" opacity=".14" filter="url(#hcb)"/><path d="M484.3,349 v-14 a13,6.5 0 0 1 26,0 v14 a13,6.5 0 0 1 -26,0Z" class="f8"/><ellipse cx="497.3" cy="335" rx="13" ry="6.5" class="f0"/><circle cx="493.3" cy="328" r="9" fill="#9fc9ad"/><circle cx="502.3" cy="325" r="7" fill="#b7d8c1"/><circle cx="498.3" cy="320" r="6" fill="#8fbd9f"/><polygon points="568.3,380 571.8,382 571.8,373 568.3,371" class="f28"/><polygon points="575.2,380 571.8,382 571.8,373 575.2,371" class="f29"/><polygon points="571.8,369 575.2,371 571.8,373 568.3,371" class="f27"/><polygon points="594.3,395 597.8,397 597.8,388 594.3,386" class="f28"/><polygon points="601.2,395 597.8,397 597.8,388 601.2,386" class="f29"/><polygon points="597.8,384 601.2,386 597.8,388 594.3,386" class="f27"/><polygon points="558.8,373.5 593.4,393.5 593.4,390 558.8,370" class="f7"/><polygon points="605.6,386.5 593.4,393.5 593.4,390 605.6,383" class="f14"/><polygon points="570.9,363 605.6,383 593.4,390 558.8,370" class="f0"/><polygon points="570.1,364 604.7,384 604.7,371 570.1,351" class="f4"/><polygon points="607.3,382.5 604.7,384 604.7,371 607.3,369.5" class="f12"/><polygon points="572.6,349.5 607.3,369.5 604.7,371 570.1,351" class="f0"/></svg>
      <svg class="wk wi" viewBox="-14 -58 28 62" style="--d:0s;--k:#f2cfae;--h:#3a2a22;--t:#a9cdb5;--td:#8fb69c;--p:#7d8fb8;--b:#f2a9c9;--g:#1f1d23;--hl:#2e4a8b;--hs:transparent;--s:0s"><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcl1"/></g><g class="lg lb"><use href="#hcl2"/></g><g class="arm"><use href="#hca1"/></g><g class="arm lb"><use href="#hca2"/></g><use href="#hcct"/><use href="#hchd"/><use href="#hchbshort"/></g></svg>
      <svg class="wk wi" viewBox="-14 -58 28 62" style="--d:-1.88s;--k:#8a5a3c;--h:#1d1514;--t:#f2d98d;--td:#ddc372;--p:#5f6b8a;--b:#9d8bf2;--g:#1b1a1e;--hl:#6b6b2e;--hs:transparent;--s:0.53s"><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcl1"/></g><g class="lg lb"><use href="#hcl2"/></g><g class="arm"><use href="#hca1"/></g><g class="arm lb"><use href="#hca2"/></g><use href="#hcct"/><use href="#hchbcurly"/></g></svg>
      <svg class="wk wi" viewBox="-14 -58 28 62" style="--d:-3.75s;--k:#e9bf97;--h:#8a6cc9;--t:#f3a99b;--td:#de9183;--p:#c8b591;--b:#6e7fae;--g:#232127;--hl:#7db9e0;--hs:transparent;--s:0.26s"><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcl1"/></g><g class="lg lb"><use href="#hcl2"/></g><g class="arm"><use href="#hca1"/></g><g class="arm lb"><use href="#hca2"/></g><use href="#hcct"/><use href="#hchbhijab"/></g></svg>
      <svg class="wk wi" viewBox="-14 -58 28 62" style="--d:-5.62s;--k:#5e3b28;--h:#1a1210;--t:#a7c6ea;--td:#8badd6;--p:#4b4f63;--b:#f2d98d;--g:#1d1c20;--hl:#6b6b2e;--hs:#a4262c;--s:0.79s"><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcl1"/></g><g class="lg lb"><use href="#hcl2"/></g><g class="arm"><use href="#hca1"/></g><g class="arm lb"><use href="#hca2"/></g><use href="#hcct"/><use href="#hchd"/><use href="#hchbshort"/></g></svg>
      <svg class="wk wi" viewBox="-14 -58 28 62" style="--d:-7.5s;--k:#f6dcc4;--h:#c98f4a;--t:#bfaef3;--td:#a795e6;--p:#8094c0;--b:#9fc9ad;--g:#1f1d23;--hl:#f26b1d;--hs:transparent;--s:0.52s"><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcl1"/></g><g class="lg lb"><use href="#hcl2"/></g><g class="arm"><use href="#hca1"/></g><g class="arm lb"><use href="#hca2"/></g><use href="#hcct"/><use href="#hchblong"/></g></svg>
      <svg class="wk wi" viewBox="-14 -58 28 62" style="--d:-9.38s;--k:#c48b62;--h:#2b1d17;--t:#f5bcd6;--td:#e7a2c2;--p:#5a5f78;--b:#7aa58a;--g:#1b1a1e;--hl:#cfb53b;--hs:transparent;--s:0.25s"><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcl1"/></g><g class="lg lb"><use href="#hcl2"/></g><g class="arm"><use href="#hca1"/></g><g class="arm lb"><use href="#hca2"/></g><use href="#hcct"/><use href="#hchd"/><use href="#hchbbun"/></g></svg>
      <svg class="wk wi" viewBox="-14 -58 28 62" style="--d:-11.25s;--k:#ad7752;--h:#3b2a20;--t:#bfe3d5;--td:#a2cfbd;--p:#cbbb98;--b:#c2227a;--g:#232127;--hl:#2e4a8b;--hs:transparent;--s:0.78s"><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcl1"/></g><g class="lg lb"><use href="#hcl2"/></g><g class="arm"><use href="#hca1"/></g><g class="arm lb"><use href="#hca2"/></g><use href="#hcct"/><use href="#hchbshort"/></g></svg>
      <svg class="wk wi" viewBox="-14 -58 28 62" style="--d:-13.12s;--k:#f0c8a2;--h:#6b4630;--t:#f7c59f;--td:#e8ad84;--p:#6d7aa6;--b:#8f7bf5;--g:#1d1c20;--hl:#6b6b2e;--hs:transparent;--s:0.51s"><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcl1"/></g><g class="lg lb"><use href="#hcl2"/></g><g class="arm"><use href="#hca1"/></g><g class="arm lb"><use href="#hca2"/></g><use href="#hcct"/><use href="#hchd"/><use href="#hchblong"/></g></svg>
      <svg class="wk wo" viewBox="-14 -58 28 62" style="--d:0s;--k:#f2cfae;--h:#3a2a22;--t:#a9cdb5;--td:#8fb69c;--p:#7d8fb8;--b:#f2a9c9;--g:#1f1d23;--hl:#2e4a8b;--hs:transparent;--s:0s"><title>Bachelor of Arts</title><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcf1"/></g><g class="lg lb"><use href="#hcf2"/></g><g class="arm"><use href="#hcs1"/></g><g class="arm lb"><use href="#hcs2"/></g><use href="#hcgb"/><use href="#hchfshort"/><g class="cap"><use href="#hccp"/></g></g></svg>
      <svg class="wk wo tz" viewBox="-14 -58 28 62" style="--d:-1.88s;--k:#8a5a3c;--h:#1d1514;--t:#f2d98d;--td:#ddc372;--p:#5f6b8a;--b:#9d8bf2;--g:#1b1a1e;--hl:#6b6b2e;--hs:transparent;--s:0.53s"><title>Bachelor of Science</title><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcf1"/></g><g class="lg lb"><use href="#hcf2"/></g><g class="arm"><use href="#hcs1"/></g><g class="arm lb"><use href="#hcs2"/></g><use href="#hcgb"/><use href="#hchfcurly"/><g class="cap"><use href="#hccp"/></g></g></svg>
      <svg class="wk wo" viewBox="-14 -58 28 62" style="--d:-3.75s;--k:#e9bf97;--h:#8a6cc9;--t:#f3a99b;--td:#de9183;--p:#c8b591;--b:#6e7fae;--g:#232127;--hl:#7db9e0;--hs:transparent;--s:0.26s"><title>Bachelor of Commerce</title><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcf1"/></g><g class="lg lb"><use href="#hcf2"/></g><g class="arm"><use href="#hcs1"/></g><g class="arm lb"><use href="#hcs2"/></g><use href="#hcgb"/><use href="#hchfhijab"/><g class="cap"><use href="#hccp"/></g></g></svg>
      <svg class="wk wo" viewBox="-14 -58 28 62" style="--d:-5.62s;--k:#5e3b28;--h:#1a1210;--t:#a7c6ea;--td:#8badd6;--p:#4b4f63;--b:#f2d98d;--g:#1d1c20;--hl:#6b6b2e;--hs:#a4262c;--s:0.79s"><title>Bachelor of Biomedicine</title><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcf1"/></g><g class="lg lb"><use href="#hcf2"/></g><g class="arm"><use href="#hcs1"/></g><g class="arm lb"><use href="#hcs2"/></g><use href="#hcgb"/><use href="#hchfshort"/><g class="cap"><use href="#hccp"/></g></g></svg>
      <svg class="wk wo tz" viewBox="-14 -58 28 62" style="--d:-7.5s;--k:#f6dcc4;--h:#c98f4a;--t:#bfaef3;--td:#a795e6;--p:#8094c0;--b:#9fc9ad;--g:#1f1d23;--hl:#f26b1d;--hs:transparent;--s:0.52s"><title>Bachelor of Design</title><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcf1"/></g><g class="lg lb"><use href="#hcf2"/></g><g class="arm"><use href="#hcs1"/></g><g class="arm lb"><use href="#hcs2"/></g><use href="#hcgb"/><use href="#hchflong"/><g class="cap"><use href="#hccp"/></g></g></svg>
      <svg class="wk wo" viewBox="-14 -58 28 62" style="--d:-9.38s;--k:#c48b62;--h:#2b1d17;--t:#f5bcd6;--td:#e7a2c2;--p:#5a5f78;--b:#7aa58a;--g:#1b1a1e;--hl:#cfb53b;--hs:transparent;--s:0.25s"><title>Bachelor of Agriculture</title><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcf1"/></g><g class="lg lb"><use href="#hcf2"/></g><g class="arm"><use href="#hcs1"/></g><g class="arm lb"><use href="#hcs2"/></g><use href="#hcgb"/><use href="#hchfbun"/><g class="cap"><use href="#hccp"/></g></g></svg>
      <svg class="wk wo" viewBox="-14 -58 28 62" style="--d:-11.25s;--k:#ad7752;--h:#3b2a20;--t:#bfe3d5;--td:#a2cfbd;--p:#cbbb98;--b:#c2227a;--g:#232127;--hl:#2e4a8b;--hs:transparent;--s:0.78s"><title>Bachelor of Arts</title><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcf1"/></g><g class="lg lb"><use href="#hcf2"/></g><g class="arm"><use href="#hcs1"/></g><g class="arm lb"><use href="#hcs2"/></g><use href="#hcgb"/><use href="#hchfshort"/><g class="cap"><use href="#hccp"/></g></g></svg>
      <svg class="wk wo" viewBox="-14 -58 28 62" style="--d:-13.12s;--k:#f0c8a2;--h:#6b4630;--t:#f7c59f;--td:#e8ad84;--p:#6d7aa6;--b:#8f7bf5;--g:#1d1c20;--hl:#6b6b2e;--hs:transparent;--s:0.51s"><title>Bachelor of Science</title><use href="#hcsh"/><g class="bob"><g class="lg"><use href="#hcf1"/></g><g class="lg lb"><use href="#hcf2"/></g><g class="arm"><use href="#hcs1"/></g><g class="arm lb"><use href="#hcs2"/></g><use href="#hcgb"/><use href="#hchflong"/><g class="cap"><use href="#hccp"/></g></g></svg>
      <span class="hc-chip" style="left:28.55%;top:40%;--c:#c2227a;animation-delay:0s"><i></i>COMP10001</span>
      <span class="hc-chip" style="left:16.98%;top:46.39%;--c:#8f7bf5;animation-delay:-1.6s"><i></i>MAST10006</span>
      <span class="hc-chip" style="left:27.11%;top:53.11%;--c:#7aa58a;animation-delay:-3.1s"><i></i>PSYC10003</span>
    </div>
  </div>
</template>

<!-- Not scoped: a scope attribute on every SVG node would double the markup. Everything is under .hc. -->
<style>
.hc {
  --T: 15s;
  --o: 0s;
  position: relative;
}

.hc-scene {
  position: relative;
  container-type: inline-size;
  aspect-ratio: 691.5 / 595;
}

.hc-bg {
  display: block;
  width: 100%;
  height: 100%;
}

/* A walker: its own small SVG, moved across the scene in container units (cqw). */
.hc .wk {
  position: absolute;
  top: 0;
  left: 0;
  width: 4.05cqw;
  height: auto;
  aspect-ratio: 28 / 62;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity;
}

.hc .wi {
  animation: hc-in var(--T) linear infinite;
  animation-delay: calc(var(--d) - var(--o));
}

/* Graduates show their degree on hover (native tooltip). */
.hc .wo {
  pointer-events: auto;
  animation: hc-out var(--T) linear infinite;
  animation-delay: calc(var(--d) - var(--o));
}

.hc .bob {
  animation: hc-bob 0.4s ease-in-out infinite alternate;
  animation-delay: var(--s);
}

.hc .lg {
  animation: hc-leg 0.8s ease-in-out infinite;
  animation-delay: var(--s);
}

.hc .arm {
  transform-box: fill-box;
  transform-origin: 50% 8%;
  animation: hc-arm 0.8s ease-in-out infinite;
  animation-delay: var(--s);
}

.hc .lb {
  animation-delay: calc(var(--s) - 0.4s);
}

.hc .wo .arm {
  animation-name: hc-arm2;
}

.hc .tz .cap {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  animation: hc-toss var(--T) ease-in-out infinite;
  animation-delay: calc(var(--d) - var(--o));
}

/* Subject codes floating by the building, in the site's glass. */
.hc-chip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 0.8em;
  font-size: clamp(10px, 1.7cqw, 13px);
  font-weight: 600;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  white-space: nowrap;
  /* Over the building: a fuller glass than usual so the code always reads. */
  background: var(--glass-shine), var(--sheet-fill);
  border: 1px solid var(--glass-edge);
  border-radius: 0.9em;
  box-shadow: var(--glass-shadow);
  translate: -50% -100%;
  animation: hc-float 5s ease-in-out infinite alternate;
}

/* A small scene has room for two codes; the chips keep a readable size, so the third steps out. */
@container (max-width: 480px) {
  .hc-chip:nth-of-type(2) {
    display: none;
  }
}

.hc-chip i {
  width: 0.55em;
  height: 0.55em;
  background: var(--c);
  border-radius: 50%;
}

@keyframes hc-bob {
  to {
    transform: translateY(-1.3px);
  }
}

@keyframes hc-leg {
  0%,
  50%,
  100% {
    transform: translateY(0);
  }

  25% {
    transform: translateY(-2.4px);
  }
}

@keyframes hc-arm {
  0%,
  100% {
    transform: rotate(12deg);
  }

  50% {
    transform: rotate(-12deg);
  }
}

@keyframes hc-arm2 {
  0%,
  100% {
    transform: rotate(6deg);
  }

  50% {
    transform: rotate(-6deg);
  }
}

@keyframes hc-toss {
  0%,
  72% {
    transform: translateY(0) rotate(0);
  }

  76% {
    transform: translateY(-17px) rotate(-200deg);
  }

  80% {
    transform: translateY(-21px) rotate(-330deg);
  }

  84%,
  100% {
    transform: translateY(0) rotate(-360deg);
  }
}

@keyframes hc-float {
  to {
    transform: translateY(-7px);
  }
}

@keyframes hc-in{0%{transform:translate(25.81cqw,55.97cqw);opacity:0}4%{opacity:1}37%{transform:translate(44.22cqw,45.34cqw);opacity:1}40%,100%{transform:translate(45.35cqw,44.69cqw);opacity:0}}

@keyframes hc-out{0%,55%{transform:translate(60.37cqw,44.11cqw);opacity:0}58%{transform:translate(61.5cqw,44.76cqw);opacity:1}96.5%{opacity:1}100%{transform:translate(79.91cqw,55.39cqw);opacity:0}}

/* Off screen: nothing runs. */
.hc-off * {
  animation-play-state: paused !important;
}

/* Reduced motion: one still frame with people on the paths. The site turns every animation off
   then; the walkers keep theirs, paused, only to be placed. */
@media (prefers-reduced-motion: reduce) {
  .hc {
    --o: 0.7s;
  }

  .hc .wi {
    animation: hc-in var(--T) linear infinite paused !important;
    animation-delay: calc(var(--d) - var(--o)) !important;
  }

  .hc .wo {
    animation: hc-out var(--T) linear infinite paused !important;
    animation-delay: calc(var(--d) - var(--o)) !important;
  }
}

/* Building and ground colours (light), then their night versions. */
.hc .f0{fill:#fffffe}
.hc .f1{fill:#fffdff}
.hc .f2{fill:#fbf6fd}
.hc .f4{fill:#f4ecf8}
.hc .f5{fill:#e9dff0}
.hc .f6{fill:#eee4f3}
.hc .f7{fill:#f1e8f6}
.hc .f8{fill:#efe6f4}
.hc .f9{fill:#f3e6f3}
.hc .f12{fill:#e2d6ec}
.hc .f13{fill:#d9cbe5}
.hc .f14{fill:#ddd0e8}
.hc .f15{fill:#f3ecf8}
.hc .f16{fill:#f6f0fa}
.hc .f17{fill:#f1e9f6}
.hc .f20{fill:#e2d3ec}
.hc .f21{fill:#eadff2}
.hc .f23{fill:#e7f0e6}
.hc .f24{fill:#fffffd}
.hc .f27{fill:#cdbcd8}
.hc .f28{fill:#bba8c8}
.hc .f29{fill:#a893b7}
.hc .g1{stop-color:#fffdff}
.hc .g3{stop-color:#f1e7f6}
.hc .g10{stop-color:#ebe0f2}
.hc .g11{stop-color:#ddd0e9}
.hc .g18{stop-color:#fdfaff}
.hc .g19{stop-color:#f1e6f6}
.hc .s22{stroke:#fffffc}
.hc .s25{stroke:#e9dcf1}
.hc .s26{stroke:#f1e7f5}

@media (prefers-color-scheme: dark) {
  .hc-bg {
    filter: saturate(1.05);
  }

  .hc .f0{fill:#d9cfe6}
  .hc .f1{fill:#d3c8e2}
  .hc .f2{fill:#c2b6d3}
  .hc .f4{fill:#bcafcf}
  .hc .f5{fill:#ab9dc0}
  .hc .f6{fill:#b4a7c8}
  .hc .f7{fill:#b6a9ca}
  .hc .f8{fill:#a99bbd}
  .hc .f9{fill:#c5b8d6}
  .hc .f12{fill:#8a7ca1}
  .hc .f13{fill:#7f7197}
  .hc .f14{fill:#83759b}
  .hc .f15{fill:#9a8db0}
  .hc .f16{fill:#9d90b2}
  .hc .f17{fill:#998cae}
  .hc .f20{fill:#1c1526}
  .hc .f21{fill:#251d31}
  .hc .f23{fill:#2d3d36}
  .hc .f24{fill:#4a3e5c}
  .hc .f27{fill:#8c7ea0}
  .hc .f28{fill:#7b6d90}
  .hc .f29{fill:#6b5d80}
  .hc .g1{stop-color:#d3c8e2}
  .hc .g3{stop-color:#b9abcd}
  .hc .g10{stop-color:#8f81a6}
  .hc .g11{stop-color:#7e7096}
  .hc .g18{stop-color:#3b3049}
  .hc .g19{stop-color:#30273e}
  .hc .s22{stroke:#4d4060}
  .hc .s25{stroke:#5a4c6c}
  .hc .s26{stroke:#55476a}
}
</style>
