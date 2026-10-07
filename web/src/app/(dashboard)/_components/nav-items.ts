import type { Route } from 'next';
import { LayoutDashboard, type LucideIcon, Stethoscope, Users } from 'lucide-react';

export interface NavItem {
  title: string;
  href: Route;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Doctors', href: '/doctors', icon: Stethoscope },
  { title: 'Patients', href: '/patients', icon: Users },
];
