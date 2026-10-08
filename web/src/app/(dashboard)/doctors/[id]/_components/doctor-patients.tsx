import { Plus, Users } from 'lucide-react';
import { ListContent, ListStateProvider } from '@/components/data-table/list-state';
import { Pagination } from '@/components/data-table/pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { PatientFilters } from '@/components/patients/patient-filters';
import { PatientFormDialog } from '@/components/patients/patient-form-dialog';
import { PatientsTable } from '@/components/patients/patients-table';
import { Button } from '@/components/ui/button';
import { getDoctor, getDoctorOptions, getDoctorPatients } from '@/data/doctors';
import { parsePatientListParams, type RawSearchParams } from '@/lib/search-params';

export async function DoctorPatients({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { id } = await params;
  const query = parsePatientListParams(await searchParams);
  // getDoctor is memoized per request, so this shares the profile's API call.
  const [doctor, patients, doctorOptions] = await Promise.all([
    getDoctor(id),
    getDoctorPatients(id, query),
    getDoctorOptions(),
  ]);
  const isFiltered = Boolean(
    query.q || query.condition || query.status || query.gender || query.from || query.to,
  );

  const addPatient = (
    <PatientFormDialog
      mode="add-to-doctor"
      doctorId={doctor._id}
      doctorName={doctor.name}
      trigger={
        <Button>
          <Plus aria-hidden />
          Add patient
        </Button>
      }
    />
  );

  return (
    <ListStateProvider>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 id="patients-heading" className="text-lg font-semibold tracking-tight">
            Patients
          </h2>
          <p className="text-muted-foreground text-sm">Patients under {doctor.name}’s care.</p>
        </div>
        {addPatient}
      </div>
      <PatientFilters />
      <ListContent>
        {patients.data.length > 0 ? (
          <PatientsTable patients={patients.data} doctorOptions={doctorOptions} />
        ) : (
          <EmptyState
            icon={Users}
            title={isFiltered ? 'No patients match your filters' : 'No patients yet'}
            description={
              isFiltered
                ? 'Try a different search term or clear the filters.'
                : `Add the first patient under ${doctor.name}.`
            }
            action={isFiltered ? undefined : addPatient}
          />
        )}
      </ListContent>
      <Pagination meta={patients.meta} noun="patients" />
    </ListStateProvider>
  );
}
