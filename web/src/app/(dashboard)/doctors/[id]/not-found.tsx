import { UserX } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';

export default function DoctorNotFound() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <EmptyState
        icon={UserX}
        title="Doctor not found"
        description="This doctor doesn’t exist or the link is incorrect."
        action={
          <Button asChild>
            <Link href="/doctors">Back to doctors</Link>
          </Button>
        }
      />
    </div>
  );
}
