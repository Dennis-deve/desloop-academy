import {
  BookOpen,
  LayoutDashboard,
  Palette,
  FolderOpen,
  UsersRound,
  Bell,
  CreditCard,
  Settings2,
  GraduationCap,
  Link2,
  Wallet,
  School2,
  LibraryBig,
  ChartNoAxesCombined,
  ClipboardCheck,
  FilePlus2,
  ShieldCheck,
  MessageCircleQuestion,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}
export const appNavigation: Record<Role, NavItem[]> = {
  // Keep the learner's primary navigation predictable: four short words, one next action.
  // Hidden preview routes remain labelled demos and never grant real child access.
  learner: [
    { label: 'Home', href: '/app', icon: LayoutDashboard },
    { label: 'Learn', href: '/app/courses', icon: BookOpen },
    { label: 'Make', href: '/app/projects', icon: Palette },
    { label: 'My work', href: '/app/portfolio', icon: FolderOpen },
  ],
  parent: [
    { label: 'Overview', href: '/parent', icon: LayoutDashboard },
    { label: 'Learning progress', href: '/parent/progress', icon: ChartNoAxesCombined },
    { label: 'Consent & safety', href: '/parent/safety', icon: ShieldCheck },
  ],
  teacher_partner: [
    { label: 'Overview', href: '/partner', icon: LayoutDashboard },
    { label: 'Invitations', href: '/partner/invitations', icon: Link2 },
    { label: 'My learners', href: '/partner/learners', icon: UsersRound },
    { label: 'Earnings', href: '/partner/earnings', icon: Wallet },
    { label: 'Engagement', href: '/partner/engagement', icon: MessageCircleQuestion },
  ],
  classroom_teacher: [
    { label: 'Overview', href: '/classroom', icon: LayoutDashboard },
    { label: 'My classes', href: '/classroom/classes', icon: School2 },
    { label: 'Review work', href: '/classroom/review', icon: ClipboardCheck },
    { label: 'Pathway reviews', href: '/classroom/pathway-reviews', icon: ShieldCheck },
  ],
  facilitator: [
    { label: 'Overview', href: '/facilitator', icon: LayoutDashboard },
    { label: 'My courses', href: '/facilitator/courses', icon: LibraryBig },
    { label: 'Create course', href: '/facilitator/courses/new', icon: FilePlus2 },
    { label: 'Review work', href: '/facilitator/reviews', icon: ClipboardCheck },
    { label: 'Pathway reviews', href: '/facilitator/pathway-reviews', icon: ShieldCheck },
  ],
  school_admin: [
    { label: 'Overview', href: '/school', icon: LayoutDashboard },
    { label: 'Classes', href: '/school/classes', icon: School2 },
    { label: 'Learners & teachers', href: '/school/people', icon: UsersRound },
    { label: 'Reports', href: '/school/reports', icon: ChartNoAxesCombined },
    { label: 'Launch centre', href: '/school/launch', icon: GraduationCap },
  ],
  platform_admin: [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Applications', href: '/admin/applications', icon: ClipboardCheck },
    { label: 'Courses & content', href: '/admin/content', icon: LibraryBig },
    { label: 'Moderation', href: '/admin/moderation', icon: ShieldCheck },
    { label: 'Operations', href: '/admin/operations', icon: ChartNoAxesCombined },
  ],
  support: [
    { label: 'Operations', href: '/admin/operations', icon: LayoutDashboard },
    { label: 'Support', href: '/workspace/support', icon: MessageCircleQuestion },
  ],
  moderator: [{ label: 'Moderation', href: '/admin/moderation', icon: ShieldCheck }],
};
export const learnerHelpNavigation: NavItem[] = [
  { label: 'Help', href: '/workspace/support', icon: CircleHelp },
  { label: 'Settings', href: '/workspace/settings', icon: Settings2 },
];

export const commonNavigation: NavItem[] = [
  { label: 'Notifications', href: '/workspace/notifications', icon: Bell },
  { label: 'Billing', href: '/workspace/billing', icon: CreditCard },
  { label: 'Settings', href: '/workspace/settings', icon: Settings2 },
];
