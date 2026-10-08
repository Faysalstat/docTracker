import { ChevronRight, Pencil } from 'lucide-react';
import Link from 'next/link';
import { DoctorFormDialog } from '@/components/doctors/doctor-form-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatNumber, initials } from '@/lib/format';
import type { Doctor } from '@/types/doctor';

function EditDoctorButton({ doctor }: { doctor: Doctor }) {
  return (
    <DoctorFormDialog
      doctor={doctor}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${doctor.name}`}>
          <Pencil />
        </Button>
      }
    />
  );
}

function DoctorIdentity({ doctor }: { doctor: Doctor }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9">
        <AvatarFallback>{initials(doctor.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <Link
          href={`/doctors/${doctor._id}`}
          className="block truncate font-medium hover:underline focus-visible:underline"
        >
          {doctor.name}
        </Link>
        <p className="text-muted-foreground truncate text-xs">{doctor.email}</p>
      </div>
    </div>
  );
}

export function DoctorsTable({ doctors }: { doctors: Doctor[] }) {
  return (
    <>
      {/* Desktop: table */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doctor</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Patients</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((doctor) => (
              <TableRow key={doctor._id}>
                <TableCell className="max-w-64">
                  <DoctorIdentity doctor={doctor} />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{doctor.specialization}</Badge>
                </TableCell>
                <TableCell className="max-w-48 truncate">{doctor.hospital}</TableCell>
                <TableCell className="whitespace-nowrap">{doctor.phone}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(doctor.patientCount)}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(doctor.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <EditDoctorButton doctor={doctor} />
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/doctors/${doctor._id}`} aria-label={`View ${doctor.name}`}>
                        <ChevronRight />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="divide-y rounded-lg border md:hidden">
        {doctors.map((doctor) => (
          <li key={doctor._id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <DoctorIdentity doctor={doctor} />
              <EditDoctorButton doctor={doctor} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{doctor.specialization}</Badge>
              <span className="text-muted-foreground">{doctor.hospital}</span>
            </div>
            <dl className="text-muted-foreground grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt>Patients</dt>
                <dd className="text-foreground font-medium">{formatNumber(doctor.patientCount)}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd className="text-foreground truncate font-medium">{doctor.phone}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd className="text-foreground font-medium">{formatDate(doctor.createdAt)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
