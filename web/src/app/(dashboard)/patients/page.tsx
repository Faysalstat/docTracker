import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/data-table/table-skeleton';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { AddPatientButton } from './_components/add-patient-button';
import { PatientsList } from './_components/patients-list';

export const metadata: Metadata = { title: 'Patients' };

export default function PatientsPage({ searchParams }: PageProps<'/patients'>) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Patients"
        description="Search, filter and manage all patients."
        actions={
          // Needs the doctor list, so it streams in; the disabled button keeps the layout stable.
          <Suspense
            fallback={
              <Button disabled>
                <Plus aria-hidden />
                Add patient
              </Button>
            }
          >
            <AddPatientButton />
          </Suspense>
        }
      />
      <Suspense fallback={<TableSkeleton />}>
        <PatientsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
