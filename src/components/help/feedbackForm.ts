import { ApiError, apiFetch } from '@/lib/api-client';

/** Limits mirror src/app/api/feedback/route.ts so the form rejects what the server would reject. */
const FEEDBACK_MAX_EMAIL_LENGTH = 254;
export const FEEDBACK_MAX_MESSAGE_LENGTH = 5000;
export const FEEDBACK_CATEGORIES = ['Bug Report', 'Feature Request', 'Other'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FeedbackInput {
  email: string;
  category: FeedbackCategory;
  message: string;
}

export interface FeedbackErrors {
  email?: string;
  message?: string;
}

/** Field errors for the feedback form; empty object when the input is valid. */
export function validateFeedback(input: FeedbackInput): FeedbackErrors {
  const errors: FeedbackErrors = {};
  const email = input.email.trim();
  const message = input.message.trim();

  if (!email) errors.email = 'Enter your email so we can reply.';
  else if (email.length > FEEDBACK_MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address, like name@example.com.';
  }

  if (!message) errors.message = 'Write a message before sending.';
  else if (message.length > FEEDBACK_MAX_MESSAGE_LENGTH) {
    errors.message = `Keep the message under ${FEEDBACK_MAX_MESSAGE_LENGTH.toLocaleString('en-US')} characters.`;
  }

  return errors;
}

export function hasFeedbackErrors(errors: FeedbackErrors): boolean {
  return Boolean(errors.email || errors.message);
}

export function sendFeedback(input: FeedbackInput): Promise<unknown> {
  const body = { email: input.email.trim(), category: input.category, message: input.message.trim() };
  return apiFetch('/api/feedback', { method: 'POST', body });
}

/** User-facing text for a failed send, with a friendly note for the rate limit. */
export function feedbackErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return 'You have sent several messages in a short time. Please wait about 10 minutes and try again.';
  }
  if (error instanceof ApiError && error.status === 400) return error.message;
  return 'Could not send your message. Check your connection and try again.';
}
