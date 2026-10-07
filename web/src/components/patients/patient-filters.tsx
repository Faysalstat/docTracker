'use client';

import { ClearFiltersButton } from '@/components/data-table/clear-filters-button';
import { DateRangeFilter } from '@/components/data-table/date-range-filter';
import { SearchInput } from '@/components/data-table/search-input';
import { SelectFilter } from '@/components/data-table/select-filter';
import { CONDITION_LABELS, GENDER_LABELS, STATUS_LABELS, toOptions } from '@/lib/constants';

const SORT_OPTIONS = [
  { value: '-admissionDate', label: 'Newest admission' },
  { value: 'admissionDate', label: 'Oldest admission' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: '-name', label: 'Name (Z–A)' },
  { value: 'age', label: 'Age (youngest)' },
  { value: '-age', label: 'Age (oldest)' },
];

const FILTER_PARAMS = ['q', 'condition', 'status', 'gender', 'doctorId', 'from', 'to', 'sort'];

export function PatientFilters({
  doctorOptions,
}: {
  /** Adds a doctor filter (patients page). Omit on a doctor's own page. */
  doctorOptions?: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <SearchInput placeholder="Search name, email or phone…" className="lg:w-72" />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <SelectFilter
          param="condition"
          label="Condition"
          allLabel="All conditions"
          options={toOptions(CONDITION_LABELS)}
          className="sm:w-40"
        />
        <SelectFilter
          param="status"
          label="Status"
          allLabel="All statuses"
          options={toOptions(STATUS_LABELS)}
          className="sm:w-40"
        />
        <SelectFilter
          param="gender"
          label="Gender"
          allLabel="All genders"
          options={toOptions(GENDER_LABELS)}
          className="sm:w-36"
        />
        {doctorOptions && (
          <SelectFilter
            param="doctorId"
            label="Doctor"
            allLabel="All doctors"
            options={doctorOptions}
          />
        )}
        <DateRangeFilter label="Admitted" className="col-span-2 sm:col-span-1" />
        <SelectFilter
          param="sort"
          label="Sort by"
          options={SORT_OPTIONS}
          defaultValue="-admissionDate"
          className="sm:w-44"
        />
        <ClearFiltersButton params={FILTER_PARAMS} />
      </div>
    </div>
  );
}
