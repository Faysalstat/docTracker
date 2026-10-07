import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/data-table/table-skeleton';
import { DoctorFormDialog } from '@/components/doctors/doctor-form-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { DoctorsList } from './_components/doctors-list';

export const metadata: Metadata = { title: 'Doctors' };

// The header is part of the static shell; the list reads searchParams and the
// session, so it streams in behind <Suspense>.
export default function DoctorsPage({ searchParams }: PageProps<'/doctors'>) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Doctors"
        description="Manage doctors and see their patients."
        actions={
          <DoctorFormDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                Add doctor
              </Button>
            }
          />
        }
      />
      <Suspense fallback={<TableSkeleton />}>
        <DoctorsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
