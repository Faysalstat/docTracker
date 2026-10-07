import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/data-table/table-skeleton';
import { Button } from '@/components/ui/button';
import { DoctorPatients } from './_components/doctor-patients';
import { DoctorProfile, DoctorProfileSkeleton } from './_components/doctor-profile';

export const metadata: Metadata = { title: 'Doctor' };

export default function DoctorPage({ params, searchParams }: PageProps<'/doctors/[id]'>) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link href="/doctors">
          <ArrowLeft aria-hidden />
          All doctors
        </Link>
      </Button>

      <Suspense fallback={<DoctorProfileSkeleton />}>
        <DoctorProfile params={params} />
      </Suspense>

      <section aria-labelledby="patients-heading" className="space-y-4">
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <DoctorPatients params={params} searchParams={searchParams} />
        </Suspense>
      </section>
    </div>
  );
}
