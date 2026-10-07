import { Users } from 'lucide-react';
import { ListContent, ListStateProvider } from '@/components/data-table/list-state';
import { Pagination } from '@/components/data-table/pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { PatientFilters } from '@/components/patients/patient-filters';
import { PatientsTable } from '@/components/patients/patients-table';
import { getDoctorOptions } from '@/data/doctors';
import { getPatients } from '@/data/patients';
import { parsePatientListParams, type RawSearchParams } from '@/lib/search-params';

export async function PatientsList({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = parsePatientListParams(await searchParams);
  const [patients, doctorOptions] = await Promise.all([getPatients(params), getDoctorOptions()]);
  const isFiltered = Boolean(
    params.q ||
    params.condition ||
    params.status ||
    params.gender ||
    params.doctorId ||
    params.from ||
    params.to,
  );

  return (
    <ListStateProvider>
      <div className="space-y-4">
        <PatientFilters doctorOptions={doctorOptions} />
        <ListContent>
          {patients.data.length > 0 ? (
            <PatientsTable patients={patients.data} showDoctor doctorOptions={doctorOptions} />
          ) : (
            <EmptyState
              icon={Users}
              title={isFiltered ? 'No patients match your filters' : 'No patients yet'}
              description={
                isFiltered
                  ? 'Try a different search term or clear the filters.'
                  : 'Patients you add (here or from a doctor’s page) will appear here.'
              }
            />
          )}
        </ListContent>
        <Pagination meta={patients.meta} noun="patients" />
      </div>
    </ListStateProvider>
  );
}
