import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PatientFormDialog } from '@/components/patients/patient-form-dialog';
import { Button } from '@/components/ui/button';
import { getDoctorOptions } from '@/data/doctors';

export async function AddPatientButton() {
  const doctorOptions = await getDoctorOptions();

  // A patient must belong to a doctor: guide the user to add one first.
  if (doctorOptions.length === 0) {
    return (
      <Button variant="outline" asChild>
        <Link href="/doctors">Add a doctor first</Link>
      </Button>
    );
  }

  return (
    <PatientFormDialog
      mode="create"
      doctorOptions={doctorOptions}
      trigger={
        <Button>
          <Plus aria-hidden />
          Add patient
        </Button>
      }
    />
  );
}
