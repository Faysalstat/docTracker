'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { BrandMark } from '@/components/brand';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from './nav-items';

function NavLinks({ pathname }: { pathname?: string }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {NAV_ITEMS.map((item) => {
        const isActive =
          !!pathname && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

export function AppSidebar({ footer }: { footer: React.ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <BrandMark />
                <span className="truncate font-semibold">Doctor Tracker</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {/* usePathname suspends while prerendering routes with unknown dynamic params
                (e.g. /doctors/[id]); the fallback keeps the links in the static shell. */}
            <Suspense fallback={<NavLinks />}>
              <ActiveNavLinks />
            </Suspense>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
