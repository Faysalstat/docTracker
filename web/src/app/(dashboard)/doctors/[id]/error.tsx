'use client';

import { ErrorState } from '@/components/feedback/error-state';

export default function DoctorError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState {...props} title="Couldn’t load this doctor" />;
}
