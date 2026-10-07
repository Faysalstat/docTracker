import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Dashboard' };

// Placeholder until the dashboard is built (development plan S-8).
export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <PageHeader title="Dashboard" description="Analytics are coming soon." />
    </div>
  );
}
