'use client';

import Dialog from '@/components/ui/Dialog';
import { Goal } from '@/types/dashboard';
import GoalForm from './GoalForm';
import type { CurrencyOption } from '@/lib/currency-country-map';

interface GoalModalProps {
  goal: Goal | null;
  mode?: 'add' | 'edit';
  currencyOptions: CurrencyOption[];
  onClose: () => void;
  onSave: (goal: Goal) => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

/** Add or edit a goal. Cannot be dismissed while saving. */
export default function GoalModal({
  goal,
  mode = 'edit',
  currencyOptions,
  onClose,
  onSave,
  onDelete,
  isSaving = false,
}: GoalModalProps) {
  return (
    <Dialog
      open={Boolean(goal)}
      onClose={onClose}
      title={mode === 'add' ? 'Add Goal' : 'Edit Goal'}
      size="lg"
      dismissible={!isSaving}
    >
      {goal && (
        <GoalForm
          key={goal.id}
          goal={goal}
          mode={mode}
          currencyOptions={currencyOptions}
          onSave={onSave}
          onCancel={onClose}
          onDelete={onDelete}
          isSaving={isSaving}
        />
      )}
    </Dialog>
  );
}
