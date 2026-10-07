import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Doctors' };

// Placeholder until the doctors list is built (development plan D-8).
export default function DoctorsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <PageHeader title="Doctors" description="Doctor management is coming soon." />
    </div>
  );
}
