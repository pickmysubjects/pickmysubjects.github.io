import type { Component } from 'vue'
import { BookMarked, Briefcase, CalendarClock, HeartHandshake, Laptop, LayoutDashboard, LibraryBig, LifeBuoy, Mail, MessagesSquare, PenLine, ShieldCheck, Wrench } from 'lucide-vue-next'

/**
 * Guide topics made of official UniMelb systems or services, each with an official link.
 * Most are a tile: the name and one line, sometimes more behind an ⓘ. One a student needs to
 * understand before using it is a short section of its own instead: what it is, what you do
 * there, and the one thing to know the first time.
 * Text lives under guide.svc.<id> (name, text, optional more, does, tip) and
 * guide.svcTopic.<topic> (title, short). Checked against official pages on 2026-10-28.
 */
export interface GuideService {
  id: string
  href: string
  /** Whether guide.svc.<id>.more exists (shown behind an ⓘ). */
  more?: boolean
  /** A section of its own: the icon beside its heading, how many guide.svc.<id>.does lines it has, and whether it has a tip. */
  section?: { icon: Component; does: number; tip?: boolean }
  /** Its tip is the one line the page most wants remembered, set large. */
  key?: boolean
  /** The topic elsewhere in the guide that explains how to use it in full (a "See" link). */
  see?: string
}

export const SERVICE_TOPICS = {
  // The systems page, in the order a new student meets them: before semester, in class, to look
  // things up. The first topic keeps the page's old #systems anchor.
  systems: [
    { id: 'okta', href: 'https://www.unimelb.edu.au/cybersecurity/resources/mfa/support', section: { icon: ShieldCheck, does: 3, tip: true } },
    { id: 'email', href: 'https://studentit.unimelb.edu.au/student-email', section: { icon: Mail, does: 3, tip: true }, key: true },
    { id: 'myUnimelb', href: 'https://my.unimelb.edu.au/', section: { icon: LayoutDashboard, does: 3, tip: true }, see: 'drop' },
    { id: 'myTimetable', href: 'https://students.unimelb.edu.au/course-admin/class-timetable/how-class-timetabling-works', more: true, section: { icon: CalendarClock, does: 3, tip: true }, see: 'timetable' },
  ],
  'systems-class': [
    { id: 'canvas', href: 'https://lms.unimelb.edu.au/students', section: { icon: Laptop, does: 3, tip: true } },
    { id: 'ed', href: 'https://lms.unimelb.edu.au/learning-technologies/ed-discussion', section: { icon: MessagesSquare, does: 3, tip: true } },
    { id: 'gradescope', href: 'https://lms.unimelb.edu.au/students/guides/gradescope/gradescope-for-students', section: { icon: PenLine, does: 3, tip: true } },
  ],
  'systems-lookup': [
    { id: 'handbook', href: 'https://handbook.unimelb.edu.au/', section: { icon: BookMarked, does: 3, tip: true } },
    { id: 'library', href: 'https://library.unimelb.edu.au/', section: { icon: LibraryBig, does: 3, tip: true } },
  ],
  'it-help': [
    { id: 'stop1', href: 'https://students.unimelb.edu.au/support-and-wellbeing/stop-1', section: { icon: LifeBuoy, does: 3, tip: true } },
    { id: 'studentIt', href: 'https://studentit.unimelb.edu.au/', section: { icon: Wrench, does: 3, tip: true } },
  ],
  wellbeing: [
    { id: 'caps', href: 'https://services.unimelb.edu.au/counsel', section: { icon: HeartHandshake, does: 3, tip: true } },
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
    { id: 'careers', href: 'https://students.unimelb.edu.au/careers', section: { icon: Briefcase, does: 3 } },
    { id: 'careersOnline', href: 'https://careersonline.unimelb.edu.au/' },
  ],
} as const satisfies Record<string, readonly GuideService[]>

export type ServiceTopic = keyof typeof SERVICE_TOPICS

/** The topics of the systems page, in page order. */
export const SYSTEM_TOPICS = ['systems', 'systems-class', 'systems-lookup'] as const satisfies readonly ServiceTopic[]

/** Every system on the systems page; each has the anchor svc-<id> there. */
export const SYSTEMS: readonly GuideService[] = SYSTEM_TOPICS.flatMap((t): readonly GuideService[] => SERVICE_TOPICS[t])

export function isServiceTopic(id: string): id is ServiceTopic {
  return id in SERVICE_TOPICS
}
