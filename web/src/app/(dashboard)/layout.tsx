import { Suspense } from 'react';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './_components/app-sidebar';
import { UserMenu } from './_components/user-menu';
import { UserMenuSkeleton } from './_components/user-menu-skeleton';

// The shell is static and prerenders instantly; only the user menu reads the
// session, so it streams in behind its own <Suspense> boundary.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar
        footer={
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        }
      />
      <SidebarInset>
        <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <span className="text-muted-foreground text-sm">Admin portal</span>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
