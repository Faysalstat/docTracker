import { Building2, CalendarDays, Mail, Pencil, Phone, Users } from 'lucide-react';
import { DoctorFormDialog } from '@/components/doctors/doctor-form-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDoctor } from '@/data/doctors';
import { formatDate, formatNumber, initials } from '@/lib/format';

export async function DoctorProfile({ params }: { params: Promise<{ id: string }> }) {
  const doctor = await getDoctor((await params).id);

  const details = [
    { icon: Building2, label: 'Hospital', value: doctor.hospital },
    {
      icon: Mail,
      label: 'Email',
      value: (
        <a href={`mailto:${doctor.email}`} className="hover:underline">
          {doctor.email}
        </a>
      ),
    },
    {
      icon: Phone,
      label: 'Phone',
      value: (
        <a href={`tel:${doctor.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">
          {doctor.phone}
        </a>
      ),
    },
    { icon: Users, label: 'Patients', value: formatNumber(doctor.patientCount) },
    { icon: CalendarDays, label: 'Joined', value: formatDate(doctor.createdAt) },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex flex-1 items-start gap-4">
          <Avatar className="size-14 text-lg">
            <AvatarFallback>{initials(doctor.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{doctor.name}</h1>
            <Badge variant="secondary">{doctor.specialization}</Badge>
          </div>
        </div>
        <DoctorFormDialog
          doctor={doctor}
          trigger={
            <Button variant="outline" className="self-start">
              <Pencil aria-hidden />
              Edit
            </Button>
          }
        />
      </CardContent>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5">
              <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="truncate text-sm font-medium">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function DoctorProfileSkeleton() {
  return (
    <Card aria-hidden>
      <CardContent className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardContent>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9" />
        ))}
      </CardContent>
    </Card>
  );
}
