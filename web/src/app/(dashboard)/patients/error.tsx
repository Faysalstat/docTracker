'use client';

import { ErrorState } from '@/components/feedback/error-state';

export default function PatientsError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState {...props} title="Couldn’t load patients" />;
}
