/**
 * Guide topics that are a short list of official UniMelb systems or services: one line each
 * (name and what it's for), an official link, and sometimes more behind an ⓘ.
 * Text lives under guide.svc.<id> (name, text, optional more) and guide.svcTopic.<topic>
 * (title, short). Checked against official pages on 2026-10-26.
 */
export interface GuideService {
  id: string
  href: string
  /** Whether guide.svc.<id>.more exists (shown behind an ⓘ). */
  more?: boolean
}

export const SERVICE_TOPICS = {
  systems: [
    { id: 'myUnimelb', href: 'https://my.unimelb.edu.au/', more: true },
    { id: 'okta', href: 'https://students.unimelb.edu.au/new-students/get-started/undergraduate-international/setup-account' },
    { id: 'email', href: 'https://my.unimelb.edu.au/', more: true },
    { id: 'canvas', href: 'https://canvas.lms.unimelb.edu.au/', more: true },
    { id: 'ed', href: 'https://lms.unimelb.edu.au/learning-technologies/ed-discussion', more: true },
    { id: 'myTimetable', href: 'https://students.unimelb.edu.au/course-admin/class-timetable/how-class-timetabling-works', more: true },
    { id: 'gradescope', href: 'https://lms.unimelb.edu.au/students/guides' },
    { id: 'handbook', href: 'https://handbook.unimelb.edu.au/' },
    { id: 'library', href: 'https://library.unimelb.edu.au/' },
  ],
  'it-help': [
    { id: 'stop1', href: 'https://students.unimelb.edu.au/support-and-wellbeing/stop-1', more: true },
    { id: 'studentIt', href: 'https://studentit.unimelb.edu.au/' },
  ],
  wellbeing: [
    { id: 'caps', href: 'https://services.unimelb.edu.au/counsel' },
    { id: 'health', href: 'https://services.unimelb.edu.au/health' },
    { id: 'seds', href: 'https://students.unimelb.edu.au/support-and-wellbeing/student-equity-and-disability-services', more: true },
    { id: 'money', href: 'https://students.unimelb.edu.au/support-and-wellbeing' },
    { id: 'housing', href: 'https://housing.unimelb.edu.au/', more: true },
  ],
  safety: [
    { id: 'safer', href: 'https://safercommunity.unimelb.edu.au/' },
    { id: 'safezone', href: 'https://safezoneapp.com/how-it-works/' },
  ],
  community: [
    { id: 'mpmp', href: 'https://students.unimelb.edu.au/student-life/peer-mentor-program', more: true },
    { id: 'clubs', href: 'https://umsu.unimelb.edu.au/buddy-up/clubs/clubs-listing/', more: true },
    { id: 'gsa', href: 'https://gsa.unimelb.edu.au/' },
    { id: 'sport', href: 'https://sport.unimelb.edu.au/' },
  ],
  advocacy: [{ id: 'advocacy', href: 'https://umsu.unimelb.edu.au/support/advocacy/', more: true }],
  'uni-careers': [
    { id: 'careers', href: 'https://students.unimelb.edu.au/careers', more: true },
    { id: 'careersOnline', href: 'https://careersonline.unimelb.edu.au/' },
  ],
} as const satisfies Record<string, readonly GuideService[]>

export type ServiceTopic = keyof typeof SERVICE_TOPICS

export function isServiceTopic(id: string): id is ServiceTopic {
  return id in SERVICE_TOPICS
}
