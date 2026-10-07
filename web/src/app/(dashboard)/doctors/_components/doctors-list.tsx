import { Stethoscope } from 'lucide-react';
import { ListContent, ListStateProvider } from '@/components/data-table/list-state';
import { Pagination } from '@/components/data-table/pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { getDoctors, getHospitals } from '@/data/doctors';
import { parseDoctorListParams, type RawSearchParams } from '@/lib/search-params';
import { DoctorFilters } from './doctor-filters';
import { DoctorsTable } from './doctors-table';

export async function DoctorsList({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = parseDoctorListParams(await searchParams);
  const [doctors, hospitals] = await Promise.all([getDoctors(params), getHospitals()]);
  const isFiltered = Boolean(
    params.q || params.specialization || params.hospital || params.from || params.to,
  );

  return (
    <ListStateProvider>
      <div className="space-y-4">
        <DoctorFilters hospitals={hospitals} />
        <ListContent>
          {doctors.data.length > 0 ? (
            <DoctorsTable doctors={doctors.data} />
          ) : (
            <EmptyState
              icon={Stethoscope}
              title={isFiltered ? 'No doctors match your filters' : 'No doctors yet'}
              description={
                isFiltered
                  ? 'Try a different search term or clear the filters.'
                  : 'Add your first doctor to start tracking their patients.'
              }
            />
          )}
        </ListContent>
        <Pagination meta={doctors.meta} noun="doctors" />
      </div>
    </ListStateProvider>
  );
}
