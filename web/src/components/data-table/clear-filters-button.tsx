'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useListState } from './list-state';

export function ClearFiltersButton({ params }: { params: string[] }) {
  const { searchParams, clearParams } = useListState();
  const active = params.some((param) => searchParams.has(param));

  if (!active) return null;

  return (
    <Button variant="ghost" size="sm" onClick={() => clearParams(params)}>
      <X aria-hidden />
      Clear filters
    </Button>
  );
}
