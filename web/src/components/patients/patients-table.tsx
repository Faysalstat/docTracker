'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useOptimistic } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GENDER_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import type { Patient } from '@/types/patient';
import { DeletePatientButton } from './delete-patient-button';
import { ConditionBadge, StatusBadge } from './patient-badges';
import { PatientFormDialog } from './patient-form-dialog';

type DoctorOption = { value: string; label: string };

function PatientActions({
  patient,
  doctorOptions,
  onOptimisticDelete,
}: {
  patient: Patient;
  doctorOptions?: DoctorOption[];
  onOptimisticDelete: (id: string) => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <PatientFormDialog
        mode="edit"
        patient={patient}
        doctorOptions={doctorOptions}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${patient.name}`}>
            <Pencil />
          </Button>
        }
      />
      <DeletePatientButton patient={patient} onOptimisticDelete={onOptimisticDelete} />
    </div>
  );
}

function DoctorLink({ doctor }: { doctor: NonNullable<Patient['doctor']> }) {
  return (
    <Link href={`/doctors/${doctor.id}`} className="hover:underline focus-visible:underline">
      {doctor.name}
    </Link>
  );
}

export function PatientsTable({
  patients,
  showDoctor = false,
  doctorOptions,
}: {
  patients: Patient[];
  /** Adds the doctor column (patients page). */
  showDoctor?: boolean;
  /** Enables reassigning the doctor in the edit dialog. */
  doctorOptions?: DoctorOption[];
}) {
  const [rows, removeRow] = useOptimistic(patients, (current, removedId: string) =>
    current.filter((patient) => patient.id !== removedId),
  );

  return (
    <>
      {/* Desktop: table */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              {showDoctor && <TableHead>Doctor</TableHead>}
              <TableHead>Age / Gender</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admitted</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-20">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="max-w-56">
                  <p className="truncate font-medium">{patient.name}</p>
                  {patient.email && (
                    <p className="text-muted-foreground truncate text-xs">{patient.email}</p>
                  )}
                </TableCell>
                {showDoctor && (
                  <TableCell className="max-w-48 truncate">
                    {patient.doctor ? <DoctorLink doctor={patient.doctor} /> : '—'}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap">
                  {patient.age} · {GENDER_LABELS[patient.gender]}
                </TableCell>
                <TableCell>
                  <ConditionBadge condition={patient.condition} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={patient.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(patient.admissionDate)}
                </TableCell>
                <TableCell className="whitespace-nowrap">{patient.phone}</TableCell>
                <TableCell>
                  <PatientActions
                    patient={patient}
                    doctorOptions={doctorOptions}
                    onOptimisticDelete={removeRow}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="divide-y rounded-lg border md:hidden">
        {rows.map((patient) => (
          <li key={patient.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{patient.name}</p>
                <p className="text-muted-foreground text-xs">
                  {patient.age} · {GENDER_LABELS[patient.gender]} · {patient.phone}
                </p>
                {showDoctor && patient.doctor && (
                  <p className="text-muted-foreground truncate text-xs">
                    Dr: <DoctorLink doctor={patient.doctor} />
                  </p>
                )}
              </div>
              <PatientActions
                patient={patient}
                doctorOptions={doctorOptions}
                onOptimisticDelete={removeRow}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ConditionBadge condition={patient.condition} />
              <StatusBadge status={patient.status} />
              <span className="text-muted-foreground text-xs">
                Admitted {formatDate(patient.admissionDate)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
