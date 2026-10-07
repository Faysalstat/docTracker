import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Patients' };

// Placeholder until the patients list is built (development plan P-5).
export default function PatientsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <PageHeader title="Patients" description="Patient management is coming soon." />
    </div>
  );
}
