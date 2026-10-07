import { DeletePatientButton } from '@/components/patients/delete-patient-button';
import { ConditionBadge, StatusBadge } from '@/components/patients/patient-badges';
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

export function DoctorPatientsTable({ patients }: { patients: Patient[] }) {
  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Age / Gender</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admitted</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="max-w-56">
                  <p className="truncate font-medium">{patient.name}</p>
                  {patient.email && (
                    <p className="text-muted-foreground truncate text-xs">{patient.email}</p>
                  )}
                </TableCell>
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
                  <DeletePatientButton patient={patient} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y rounded-lg border md:hidden">
        {patients.map((patient) => (
          <li key={patient.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{patient.name}</p>
                <p className="text-muted-foreground text-xs">
                  {patient.age} · {GENDER_LABELS[patient.gender]} · {patient.phone}
                </p>
              </div>
              <DeletePatientButton patient={patient} />
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
