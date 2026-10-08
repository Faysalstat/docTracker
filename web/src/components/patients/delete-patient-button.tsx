'use client';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { removePatient } from '@/actions/patients';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Button } from '@/components/ui/button';

export function DeletePatientButton({
  patient,
  onOptimisticDelete,
}: {
  patient: { _id: string; name: string };
  /** Hides the row immediately; React reverts it automatically if the action fails. */
  onOptimisticDelete?: (id: string) => void;
}) {
  return (
    <ConfirmDialog
      title="Delete patient?"
      description={
        <>
          <strong>{patient.name}</strong> will be permanently removed. This cannot be undone.
        </>
      }
      onConfirm={async () => {
        onOptimisticDelete?.(patient._id);
        const result = await removePatient(patient._id);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message ?? 'Could not delete the patient.');
        return result.ok;
      }}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${patient.name}`}>
          <Trash2 />
        </Button>
      }
    />
  );
}
