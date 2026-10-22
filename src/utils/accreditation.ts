// Accreditation by degree and major, checked against the 2026 Handbook print pages.
// Body names stay in English: they are official names.
const HB = 'https://handbook.unimelb.edu.au/2026/'
const ACS = 'Australian Computer Society (ACS)'
const APAC = 'Australian Psychology Accreditation Council (APAC)'
export const ACCREDITATION: { degree: string; major?: string; body: string; cond: string /* guide.* key */; href: string }[] = [
  { degree: 'Bachelor of Science / Science (Extended)', major: 'Computing and Software Systems', body: ACS, cond: 'accCondCss', href: `${HB}components/b-sci-major-1` },
  { degree: 'Bachelor of Science / Science (Extended)', major: 'Psychology', body: APAC, cond: 'accCondPsych', href: `${HB}components/b-sci-major-36` },
  { degree: 'Bachelor of Arts', major: 'Psychology', body: APAC, cond: 'accCondPsychArts', href: `${HB}components/b-arts-major-26` },
  { degree: 'Bachelor of Biomedicine', major: 'Psychology', body: APAC, cond: 'accCondPsych', href: `${HB}components/b-bmed-major-15` },
  { degree: 'Bachelor of Design', major: 'Computing and Software Systems', body: ACS, cond: 'accCondCss', href: `${HB}components/b-des-major-3` },
  { degree: 'Bachelor of Commerce', major: 'Accounting', body: 'CPA Australia (CPA), Chartered Accountants ANZ (CA ANZ)', cond: 'accCondAcct', href: `${HB}components/b-com-major-1` },
  { degree: 'Bachelor of Commerce', major: 'Actuarial Studies', body: 'Actuaries Institute', cond: 'accCondAct', href: `${HB}components/b-com-major-2` },
  { degree: 'Bachelor of Oral Health', body: 'Australian Dental Council (ADC)', cond: 'accCondOral', href: `${HB}courses/841ac` },
]
