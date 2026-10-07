'use client';

import { ClearFiltersButton } from '@/components/data-table/clear-filters-button';
import { DateRangeFilter } from '@/components/data-table/date-range-filter';
import { SearchInput } from '@/components/data-table/search-input';
import { SelectFilter } from '@/components/data-table/select-filter';
import { SPECIALIZATIONS } from '@/lib/constants';

const SPECIALIZATION_OPTIONS = SPECIALIZATIONS.map((value) => ({ value, label: value }));
const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: '-name', label: 'Name (Z–A)' },
];

export function DoctorFilters({ hospitals }: { hospitals: string[] }) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <SearchInput placeholder="Search name, email or phone…" className="lg:w-72" />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <SelectFilter
          param="specialization"
          label="Specialization"
          allLabel="All specializations"
          options={SPECIALIZATION_OPTIONS}
        />
        <SelectFilter
          param="hospital"
          label="Hospital"
          allLabel="All hospitals"
          options={hospitals.map((hospital) => ({ value: hospital, label: hospital }))}
        />
        <DateRangeFilter label="Joined" className="col-span-2 sm:col-span-1" />
        <SelectFilter
          param="sort"
          label="Sort by"
          options={SORT_OPTIONS}
          defaultValue="-createdAt"
          className="sm:w-40"
        />
        <ClearFiltersButton params={['q', 'specialization', 'hospital', 'from', 'to', 'sort']} />
      </div>
    </div>
  );
}
