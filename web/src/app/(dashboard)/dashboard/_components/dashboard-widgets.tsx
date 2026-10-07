import { BarChart3 } from 'lucide-react';
import type { Route } from 'next';
import { ChartCard, ChartDataTable } from '@/components/charts/chart-card';
import { RankedBarChart } from '@/components/charts/ranked-bar-chart';
import { getAdmissions, getConditions, getTopDoctors } from '@/data/stats';
import { CONDITION_LABELS } from '@/lib/constants';
import type { ResolvedRange } from '@/lib/date-range';
import { formatDate, formatNumber } from '@/lib/format';
import { AdmissionsChart } from './admissions-chart';

const INTERVAL_NOUN = { day: 'day', week: 'week', month: 'month' } as const;

function NoData({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex h-48 flex-col items-center justify-center gap-2 text-sm">
      <BarChart3 className="size-6" aria-hidden />
      {message}
    </div>
  );
}

export async function AdmissionsCard({
  range,
  className,
}: {
  range: ResolvedRange;
  className?: string;
}) {
  const series = await getAdmissions(range);
  const total = series.data.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <ChartCard
      title="Admissions over time"
      description={`Patients admitted per ${INTERVAL_NOUN[series.interval]} · ${range.label.toLowerCase()}`}
      className={className}
    >
      {total === 0 ? (
        <NoData message="No admissions in this period" />
      ) : (
        <>
          <AdmissionsChart series={series} />
          {series.data.some((bucket) => bucket.partial) && (
            <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
              <svg width="20" height="2" aria-hidden className="text-chart-1">
                <line
                  x1="0"
                  y1="1"
                  x2="20"
                  y2="1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                />
              </svg>
              Current {series.interval} so far — not yet complete
            </p>
          )}
          <ChartDataTable
            caption={`Admissions per ${series.interval}`}
            headers={[series.interval === 'week' ? 'Week of' : 'Period', 'Admissions']}
            rows={series.data.map((bucket) => [formatDate(bucket.date), bucket.count])}
          />
        </>
      )}
    </ChartCard>
  );
}

export async function ConditionsCard({
  range,
  className,
}: {
  range: ResolvedRange;
  className?: string;
}) {
  const conditions = await getConditions(range);
  const total = conditions.reduce((sum, row) => sum + row.count, 0);
  const share = (count: number) => (total ? Math.round((count / total) * 100) : 0);

  return (
    <ChartCard
      title="Patients by condition"
      description={`Admissions by diagnosis · ${range.label.toLowerCase()}`}
      className={className}
    >
      {total === 0 ? (
        <NoData message="No patients in this period" />
      ) : (
        <>
          <RankedBarChart
            valueLabel="Patients"
            labelWidth={150}
            data={conditions.map((row) => ({
              label: `${CONDITION_LABELS[row.condition]} · ${share(row.count)}%`,
              value: row.count,
              href: `/patients?condition=${row.condition}`,
            }))}
          />
          <ChartDataTable
            caption="Patients by condition"
            headers={['Condition', 'Patients']}
            rows={conditions.map((row) => [
              CONDITION_LABELS[row.condition],
              `${formatNumber(row.count)} (${share(row.count)}%)`,
            ])}
          />
        </>
      )}
    </ChartCard>
  );
}

export async function TopDoctorsCard({
  range,
  className,
}: {
  range: ResolvedRange;
  className?: string;
}) {
  const doctors = await getTopDoctors(range);

  return (
    <ChartCard
      title="Patients per doctor"
      description={`Top ${doctors.length || 10} doctors by admitted patients · ${range.label.toLowerCase()}`}
      className={className}
    >
      {doctors.length === 0 ? (
        <NoData message="No patients in this period" />
      ) : (
        <>
          <RankedBarChart
            valueLabel="Patients"
            labelWidth={160}
            data={doctors.map((doctor) => ({
              label: doctor.name,
              value: doctor.count,
              href: `/doctors/${doctor.doctorId}` as Route,
            }))}
          />
          <ChartDataTable
            caption="Patients per doctor"
            headers={['Doctor', 'Patients']}
            rows={doctors.map((doctor) => [
              `${doctor.name} (${doctor.specialization})`,
              formatNumber(doctor.count),
            ])}
          />
        </>
      )}
    </ChartCard>
  );
}
