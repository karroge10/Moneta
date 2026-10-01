'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import { cx } from '@/components/ui/cx';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_MESSAGE_LENGTH,
  feedbackErrorMessage,
  hasFeedbackErrors,
  sendFeedback,
  validateFeedback,
  type FeedbackCategory,
  type FeedbackErrors,
} from '@/components/help/feedbackForm';

export default function SendFeedbackCard() {
  const { user } = useUser();
  const accountEmail = user?.primaryEmailAddress?.emailAddress ?? '';
  // null until the user edits the field, so the Clerk email fills it once it loads.
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [category, setCategory] = useState<FeedbackCategory>('Bug Report');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FeedbackErrors>({});
  const email = emailDraft ?? accountEmail;

  const mutation = useMutation({
    mutationFn: sendFeedback,
    onSuccess: () => setMessage(''),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = { email, category, message };
    const errors = validateFeedback(input);
    setFieldErrors(errors);
    if (hasFeedbackErrors(errors)) return;
    mutation.mutate(input);
  };

  const messageLength = message.trim().length;
  const isOverLimit = messageLength > FEEDBACK_MAX_MESSAGE_LENGTH;

  return (
    <Card title="Send Feedback" showActions={false}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Your email" error={fieldErrors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="name@example.com"
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Category">
          {(props) => (
            <Select {...props} value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)}>
              {FEEDBACK_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Message"
          error={fieldErrors.message}
          hint={
            <span className={cx('tabular-nums', isOverLimit && 'text-negative-fg')}>
              {messageLength.toLocaleString('en-US')} / {FEEDBACK_MAX_MESSAGE_LENGTH.toLocaleString('en-US')}
            </span>
          }
        >
          {(props) => (
            <textarea
              {...props}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue or idea"
              rows={6}
              className={cx(inputClass, 'resize-none')}
            />
          )}
        </Field>

        <div aria-live="polite">
          {mutation.isSuccess && <p className="text-ui text-positive">Thank you. Your feedback has been sent.</p>}
          {mutation.isError && <p className="text-ui text-negative-fg">{feedbackErrorMessage(mutation.error)}</p>}
        </div>

        <Button type="submit" fullWidth loading={mutation.isPending}>
          Send message
        </Button>
      </form>
    </Card>
  );
}
