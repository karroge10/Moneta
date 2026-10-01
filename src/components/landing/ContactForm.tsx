"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HeadsetHelp } from "iconoir-react";
import Button from "@/components/ui/Button";
import Field, { inputClass } from "@/components/ui/Field";
import { cx } from "@/components/ui/cx";
import {
  feedbackErrorMessage,
  hasFeedbackErrors,
  sendFeedback,
  validateFeedback,
  type FeedbackErrors,
} from "@/components/help/feedbackForm";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FeedbackErrors>({});
  const mutation = useMutation({ mutationFn: sendFeedback });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = { email, category: "Other" as const, message };
    const errors = validateFeedback(input);
    setFieldErrors(errors);
    if (hasFeedbackErrors(errors)) return;
    mutation.mutate(input);
  };

  return (
    <section
      id="contact"
      className="scroll-mt-24 border-t border-line-subtle bg-gradient-to-b from-surface-inset to-background px-6 py-16 md:px-8 md:py-20"
    >
      <div className="mx-auto max-w-xl space-y-8">
        <div className="space-y-4 text-center">
          <div
            className="mb-1 inline-flex items-center justify-center rounded-full border border-accent/20 bg-accent/10 p-3"
            aria-hidden="true"
          >
            <HeadsetHelp width={28} height={28} strokeWidth={1.5} className="text-accent" />
          </div>
          <h2 className="text-[32px] font-bold leading-tight tracking-tight text-fg text-balance md:text-[40px]">
            Get in touch
          </h2>
          <p className="text-copy text-secondary text-pretty">
            Questions, feedback, or partnership ideas? Send a message and we will reply by email.
          </p>
        </div>

        {mutation.isSuccess ? (
          <p
            role="status"
            className="rounded-card border border-positive/20 bg-positive/10 p-8 text-center text-lg font-bold text-positive shadow-xl"
          >
            Thank you. Your message has been sent.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4 rounded-card border border-line bg-surface-0 p-6 shadow-xl md:p-8"
          >
            <Field label="Your email" error={fieldErrors.email}>
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              )}
            </Field>

            <Field label="Message" error={fieldErrors.message}>
              {(props) => (
                <textarea
                  {...props}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  rows={5}
                  className={cx(inputClass, "resize-none")}
                />
              )}
            </Field>

            {mutation.isError && (
              <p role="alert" className="text-ui text-negative-fg">
                {feedbackErrorMessage(mutation.error)}
              </p>
            )}

            <Button type="submit" size="lg" fullWidth loading={mutation.isPending} className="mt-2">
              Send message
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
